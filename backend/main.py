"""
Nexoryx FastAPI Backend
=======================
Converts idea2.py Streamlit pipeline into REST + WebSocket endpoints.

Endpoints:
  POST /api/draft-script    — Groq LLM generates a 3-scene cinematic script
  WS   /api/ws/produce      — Real-time video production pipeline
  GET  /api/files/{job_id}/{filename} — Serve generated assets
"""

import os
import json
import uuid
import time
import asyncio
import base64
import subprocess
import traceback
from pathlib import Path

import requests
import urllib3
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

import replicate
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# ─── Environment ───────────────────────────────────────────
load_dotenv()

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
os.environ["CURL_CA_BUNDLE"] = ""
os.environ["REQUESTS_CA_BUNDLE"] = ""

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN", "")
FFMPEG_PATH = os.getenv("FFMPEG_PATH", r"C:\ffmpeg\bin\ffmpeg.exe")

os.environ["GROQ_API_KEY"] = GROQ_API_KEY
os.environ["REPLICATE_API_TOKEN"] = REPLICATE_API_TOKEN

STATIC_DIR = Path(__file__).parent / "static"
STATIC_DIR.mkdir(exist_ok=True)

# ─── FastAPI App ───────────────────────────────────────────
app = FastAPI(title="Nexoryx Pipeline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Helpers (from idea2.py) ──────────────────────────────
def robust_download(url: str, timeout: int = 300) -> bytes:
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
    session.mount("https://", HTTPAdapter(max_retries=retries))
    headers = {"User-Agent": "Mozilla/5.0"}
    response = session.get(url, headers=headers, timeout=timeout, verify=False)
    response.raise_for_status()
    return response.content


def extract_last_frame_as_data_uri(video_path: str, output_image_path: str):
    """Extract final frame from video and return as base64 data URI."""
    cmd = [
        FFMPEG_PATH, "-y", "-sseof", "-0.5", "-i", video_path,
        "-vframes", "1", output_image_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with open(output_image_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


# ─── Groq LLM Prompt (exact same as idea2.py) ─────────────
SYSTEM_PROMPT = """
Create a 3-part continuous "One-Take" tracking shot. NO CUTS.
CRITICAL AUDIO DIRECTIVE: We are using xAI's Grok Imagine Video which generates NATIVE SOUND. 
In your 'video_prompt', you MUST include both camera motion AND specific sound cues.

Output strictly in JSON format without markdown blocks:
{{
  "origin_image_prompt": "Highly detailed static starting frame. Example: Macro close up of a glowing blue crystal in a dark cave.",
  "segments": [
    {{ "video_prompt": "Action: Camera slowly pulls back to reveal an explorer holding the crystal. Audio: Low ominous drone, water dripping, heavy breathing." }},
    {{ "video_prompt": "Action: The explorer turns and begins running towards a light. Audio: Rapid splashing footsteps, echoing pants, orchestral tension building." }},
    {{ "video_prompt": "Action: Camera follows from behind as the explorer bursts into a jungle. Audio: Triumphant brass swell, exotic bird calls, wind." }}
  ]
}}
"""


# ═══════════════════════════════════════════════════════════
# ENDPOINT 1 — Draft Script
# ═══════════════════════════════════════════════════════════
@app.post("/api/draft-script")
async def draft_script(body: dict):
    """Call Groq LLM to generate a cinematic script from a topic."""
    topic = body.get("topic", "").strip()
    if not topic:
        return JSONResponse({"error": "Topic is required"}, status_code=400)

    try:
        llm = ChatGroq(temperature=0.4, model_name="llama-3.3-70b-versatile")
        chain = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human", "{topic}")
        ]) | llm

        response = await asyncio.to_thread(chain.invoke, {"topic": topic})

        # Parse JSON from LLM response
        raw = response.content.replace("```json\n", "").replace("```", "").strip()
        scene_data = json.loads(raw)

        # Generate a job ID for this project
        job_id = str(uuid.uuid4())[:8]

        # Build a human-readable script text for display
        display_script = _build_display_script(topic, scene_data)

        return {
            "job_id": job_id,
            "scene_data": scene_data,
            "display_script": display_script,
            "topic": topic,
        }

    except json.JSONDecodeError:
        return JSONResponse(
            {"error": "Groq returned invalid JSON. Please try again."},
            status_code=422,
        )
    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


def _build_display_script(topic: str, scene_data: dict) -> str:
    """Build a human-readable markdown script from scene_data."""
    lines = [f"# {topic}\n"]
    lines.append(f"## Origin Frame")
    lines.append(f"{scene_data['origin_image_prompt']}\n")
    lines.append("---\n")
    for i, seg in enumerate(scene_data["segments"]):
        lines.append(f"## Scene {i + 1}: Motion & Audio")
        lines.append(f"{seg['video_prompt']}\n")
        if i < len(scene_data["segments"]) - 1:
            lines.append("---\n")
    lines.append(f"\n**Total Segments:** {len(scene_data['segments'])}")
    lines.append(f"**Style:** Cinematic One-Take / AI-Generated Audio-Visual")
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════
# ENDPOINT 2 — WebSocket Production Pipeline
# ═══════════════════════════════════════════════════════════
@app.websocket("/api/ws/produce")
async def produce_video(ws: WebSocket):
    """
    WebSocket endpoint for the full production pipeline.
    Client sends: { "job_id": "...", "scene_data": {...} }
    Server streams back step-by-step updates.
    """
    await ws.accept()

    try:
        # Receive the approved script data from client
        raw = await ws.receive_text()
        payload = json.loads(raw)
        job_id = payload["job_id"]
        scene_data = payload["scene_data"]

        # Create job directory
        job_dir = STATIC_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        segments = scene_data["segments"]
        total_steps = 1 + len(segments) + 1  # origin + segments + stitch
        completed = 0

        async def send_update(data: dict):
            data["total_steps"] = total_steps
            data["completed"] = completed
            data["progress"] = int((completed / total_steps) * 100)
            await ws.send_text(json.dumps(data))

        # ── Step 1: Origin Image ──────────────────────────
        await send_update({
            "step": "origin_image",
            "status": "rendering",
            "message": "Generating Origin Frame via Flux-Dev...",
        })

        origin_url, origin_path = await asyncio.to_thread(
            _generate_origin_image,
            scene_data["origin_image_prompt"],
            job_dir,
        )
        completed = 1

        await send_update({
            "step": "origin_image",
            "status": "done",
            "message": "Origin Frame generated.",
            "image_url": f"/api/files/{job_id}/origin_frame.png",
            "origin_remote_url": origin_url,
        })

        # ── Cooldown ──────────────────────────────────────
        await send_update({
            "step": "cooldown",
            "status": "waiting",
            "message": "Anti-Rate Limit: Cooling down 15 seconds...",
        })
        await asyncio.sleep(15)

        # ── Step 2+: Scene Segments ───────────────────────
        current_input = origin_url
        video_files = []

        for i, segment in enumerate(segments):
            scene_num = i + 1

            await send_update({
                "step": f"scene_{scene_num}",
                "status": "rendering",
                "scene_index": i,
                "message": f"Animating Scene {scene_num} via Grok Imagine Video (with Audio)...",
            })

            vid_path = await asyncio.to_thread(
                _generate_video_segment,
                segment["video_prompt"],
                current_input,
                scene_num,
                job_dir,
            )
            video_files.append(vid_path)
            completed = 1 + scene_num

            await send_update({
                "step": f"scene_{scene_num}",
                "status": "done",
                "scene_index": i,
                "message": f"Scene {scene_num} complete.",
                "video_url": f"/api/files/{job_id}/scene_{scene_num}.mp4",
            })

            # Extract last frame for next scene (if not the last segment)
            if scene_num < len(segments):
                next_frame_path = str(job_dir / f"extracted_frame_{scene_num}.png")
                data_uri = await asyncio.to_thread(
                    extract_last_frame_as_data_uri,
                    vid_path,
                    next_frame_path,
                )
                current_input = data_uri

                await send_update({
                    "step": f"frame_extract_{scene_num}",
                    "status": "done",
                    "message": f"Extracted end-frame for Scene {scene_num + 1}.",
                    "frame_url": f"/api/files/{job_id}/extracted_frame_{scene_num}.png",
                })

                # Cooldown between scenes
                await send_update({
                    "step": "cooldown",
                    "status": "waiting",
                    "message": f"Anti-Rate Limit: Cooling down 15 seconds before Scene {scene_num + 1}...",
                })
                await asyncio.sleep(15)

        # ── Step Final: Stitch ────────────────────────────
        await send_update({
            "step": "stitching",
            "status": "rendering",
            "message": "Stitching final continuous cut with Audio...",
        })

        final_path = await asyncio.to_thread(
            _stitch_videos, video_files, job_dir
        )
        completed = total_steps

        await send_update({
            "step": "final",
            "status": "done",
            "message": "Infinite One-Take Complete!",
            "video_url": f"/api/files/{job_id}/nexoryx_final.mp4",
            "download_url": f"/api/files/{job_id}/nexoryx_final.mp4",
        })

    except WebSocketDisconnect:
        print(f"Client disconnected during production.")
    except Exception as e:
        traceback.print_exc()
        try:
            await ws.send_text(json.dumps({
                "step": "error",
                "status": "failed",
                "message": f"Pipeline failed: {str(e)}",
            }))
        except:
            pass


# ─── Production helpers (sync, run in thread) ─────────────
def _generate_origin_image(prompt: str, job_dir: Path):
    """Generate origin frame via Flux-Dev on Replicate."""
    output = replicate.run(
        "black-forest-labs/flux-dev",
        input={
            "prompt": f"{prompt}, highly detailed, cinematic 4k masterpiece",
            "guidance": 3.5,
            "output_format": "png",
            "aspect_ratio": "16:9",
        },
    )
    img_url = (
        output[0].url
        if isinstance(output, list)
        else (output.url if hasattr(output, "url") else str(output))
    )

    img_path = str(job_dir / "origin_frame.png")
    with open(img_path, "wb") as f:
        f.write(robust_download(img_url, timeout=60))

    return img_url, img_path


def _generate_video_segment(
    video_prompt: str, image_input: str, index: int, job_dir: Path
) -> str:
    """Generate a video segment via Grok Imagine Video on Replicate."""
    prediction = replicate.predictions.create(
        model="xai/grok-imagine-video",
        input={"prompt": video_prompt, "image": image_input},
    )

    while prediction.status not in ["succeeded", "failed", "canceled"]:
        time.sleep(5)
        prediction.reload()

    if prediction.status != "succeeded":
        raise Exception(
            f"Video API failed for scene {index}. Error: {prediction.error}"
        )

    output_url = str(prediction.output)

    filename = f"scene_{index}.mp4"
    filepath = str(job_dir / filename)
    with open(filepath, "wb") as f:
        f.write(robust_download(output_url, timeout=300))

    return filepath


def _stitch_videos(video_files: list, job_dir: Path) -> str:
    """Concatenate video segments into one final file using ffmpeg."""
    list_file = str(job_dir / "clips.txt")
    with open(list_file, "w") as f:
        for vid in video_files:
            f.write(f"file '{vid}'\n")

    output_file = str(job_dir / "nexoryx_final.mp4")
    subprocess.run(
        [FFMPEG_PATH, "-y", "-f", "concat", "-safe", "0", "-i", list_file, "-c", "copy", output_file],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return output_file


# ═══════════════════════════════════════════════════════════
# ENDPOINT 3 — Serve Generated Files
# ═══════════════════════════════════════════════════════════
@app.get("/api/files/{job_id}/{filename}")
async def serve_file(job_id: str, filename: str):
    """Serve a generated file (image / video) from the job directory."""
    file_path = STATIC_DIR / job_id / filename
    if not file_path.exists():
        return JSONResponse({"error": "File not found"}, status_code=404)

    media_type = "video/mp4" if filename.endswith(".mp4") else "image/png"
    return FileResponse(str(file_path), media_type=media_type)


# ═══════════════════════════════════════════════════════════
# Health Check
# ═══════════════════════════════════════════════════════════
@app.get("/api/health")
async def health():
    return {"status": "ok", "engine": "Nexoryx Pipeline API"}

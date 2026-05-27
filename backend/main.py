"""
Nexoryx FastAPI Backend — Multi-Model AI Video Aggregator
=========================================================

Endpoints:
  POST /api/draft-script           -- Groq LLM generates cinematic script
  WS   /api/ws/produce             -- Real-time video production pipeline
  GET  /api/files/{job_id}/{fn}    -- Serve generated assets
  POST /api/send-welcome           -- Welcome email via Resend
  GET  /api/models                 -- List available video models
  POST /api/quick-generate         -- Single-video generation
  GET  /api/job/{job_id}/status    -- Poll quick-generate job status
  POST /api/search-clips           -- Search Pexels/Pixabay stock clips
  POST /api/generate-voiceover     -- ElevenLabs TTS voiceover
  GET  /api/voices                 -- List ElevenLabs voices
  POST /api/export-clip-project    -- Stitch clips + voiceover
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

import resend
import replicate
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

# New multi-model SDKs (imported lazily where possible)
try:
    import fal_client
except ImportError:
    fal_client = None

try:
    from runwayml import RunwayML
except ImportError:
    RunwayML = None

try:
    from elevenlabs.client import ElevenLabs as ElevenLabsClient
except ImportError:
    ElevenLabsClient = None

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
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FAL_KEY = os.getenv("FAL_KEY", "")
RUNWAY_API_KEY = os.getenv("RUNWAY_API_KEY", "")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")
PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

os.environ["GROQ_API_KEY"] = GROQ_API_KEY
os.environ["REPLICATE_API_TOKEN"] = REPLICATE_API_TOKEN
if FAL_KEY:
    os.environ["FAL_KEY"] = FAL_KEY

resend.api_key = RESEND_API_KEY

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

# ─── Active Jobs Store (in-memory) ─────────────────────────
active_jobs: dict = {}   # job_id -> { status, progress, video_url, error }

# ═══════════════════════════════════════════════════════════
# VIDEO MODEL REGISTRY
# ═══════════════════════════════════════════════════════════
VIDEO_MODELS = {
    # ── Replicate Models ──
    "grok-imagine-video": {
        "name": "Grok Imagine Video", "provider": "xAI",
        "provider_logo": "xai", "platform": "replicate",
        "replicate_id": "xai/grok-imagine-video",
        "quality": "4K", "speed": "Balanced", "cost_per_sec": 0.25,
        "supports_image": True, "supports_text": True,
    },
    "wan-2.1": {
        "name": "Wan 2.1", "provider": "WaveSpeed AI",
        "provider_logo": "wavespeed", "platform": "replicate",
        "replicate_id": "wavespeedai/wan-2.1-t2v-720p",
        "quality": "HD", "speed": "Fast", "cost_per_sec": 0.10,
        "supports_image": False, "supports_text": True,
    },
    "hunyuan-video": {
        "name": "Hunyuan Video", "provider": "Tencent",
        "provider_logo": "tencent", "platform": "replicate",
        "replicate_id": "tencent/hunyuan-video",
        "quality": "HD", "speed": "Quality", "cost_per_sec": 0.18,
        "supports_image": False, "supports_text": True,
    },
    "minimax-video-01": {
        "name": "Minimax Video-01", "provider": "Minimax",
        "provider_logo": "minimax", "platform": "replicate",
        "replicate_id": "minimax/video-01",
        "quality": "HD", "speed": "Balanced", "cost_per_sec": 0.15,
        "supports_image": True, "supports_text": True,
    },
    "kling-1.6-pro": {
        "name": "Kling 1.6 Pro", "provider": "Kuaishou",
        "provider_logo": "kling", "platform": "replicate",
        "replicate_id": "kwaivgi/kling-v2.1",
        "quality": "4K", "speed": "Quality", "cost_per_sec": 0.30,
        "supports_image": True, "supports_text": True,
    },
    "ltx-video": {
        "name": "LTX Video", "provider": "Lightricks",
        "provider_logo": "lightricks", "platform": "replicate",
        "replicate_id": "lightricks/ltx-video",
        "quality": "HD", "speed": "Fast", "cost_per_sec": 0.08,
        "supports_image": False, "supports_text": True,
    },
    # ── fal.ai Models ──
    "veo-3": {
        "name": "Veo 3", "provider": "Google DeepMind",
        "provider_logo": "google", "platform": "fal",
        "fal_id": "fal-ai/veo3",
        "quality": "4K", "speed": "Quality", "cost_per_sec": 0.35,
        "supports_image": True, "supports_text": True,
    },
    "cogvideox-5b": {
        "name": "CogVideoX-5B", "provider": "THUDM",
        "provider_logo": "thudm", "platform": "fal",
        "fal_id": "fal-ai/cogvideox-5b",
        "quality": "HD", "speed": "Balanced", "cost_per_sec": 0.12,
        "supports_image": True, "supports_text": True,
    },
    "pika-2.2": {
        "name": "Pika 2.2", "provider": "Pika Labs (via fal.ai)",
        "provider_logo": "pika", "platform": "fal",
        "fal_id": "fal-ai/pika/v2.2",
        "quality": "HD", "speed": "Fast", "cost_per_sec": 0.14,
        "supports_image": True, "supports_text": True,
    },
    # ── Runway ──
    "gen4-turbo": {
        "name": "Gen-4 Turbo", "provider": "Runway ML",
        "provider_logo": "runway", "platform": "runway",
        "runway_model": "gen4_turbo",
        "quality": "4K", "speed": "Fast", "cost_per_sec": 0.20,
        "supports_image": True, "supports_text": True,
    },
}


# ─── Unified Model Dispatcher ─────────────────────────────
def generate_video_with_model(
    prompt: str, model_id: str, image_input: str | None,
    index: int, job_dir: Path,
) -> str:
    """Route video generation to the correct provider based on model_id."""
    model = VIDEO_MODELS.get(model_id)
    if not model:
        raise ValueError(f"Unknown model: {model_id}")

    platform = model["platform"]
    filename = f"scene_{index}.mp4"
    filepath = str(job_dir / filename)

    if platform == "replicate":
        return _replicate_generate(prompt, model, image_input, filepath)
    elif platform == "fal":
        return _fal_generate(prompt, model, image_input, filepath)
    elif platform == "runway":
        return _runway_generate(prompt, model, image_input, filepath)
    else:
        raise ValueError(f"Unknown platform: {platform}")


def _replicate_generate(prompt, model, image_input, filepath):
    inp = {"prompt": prompt}
    if image_input and model.get("supports_image"):
        inp["image"] = image_input
    prediction = replicate.predictions.create(
        model=model["replicate_id"], input=inp,
    )
    while prediction.status not in ["succeeded", "failed", "canceled"]:
        time.sleep(5)
        prediction.reload()
    if prediction.status != "succeeded":
        raise Exception(f"Replicate failed: {prediction.error}")
    output_url = str(prediction.output)
    with open(filepath, "wb") as f:
        f.write(robust_download(output_url, timeout=300))
    return filepath


def _fal_generate(prompt, model, image_input, filepath):
    if not fal_client:
        raise ImportError("fal-client not installed")
    inp = {"prompt": prompt}
    if image_input and model.get("supports_image"):
        inp["image_url"] = image_input
    result = fal_client.subscribe(model["fal_id"], arguments=inp)
    video_url = None
    if isinstance(result, dict):
        video_url = result.get("video", {}).get("url") or result.get("video_url")
    if not video_url:
        raise Exception(f"fal.ai returned no video URL: {result}")
    with open(filepath, "wb") as f:
        f.write(robust_download(video_url, timeout=300))
    return filepath


def _runway_generate(prompt, model, image_input, filepath):
    if not RunwayML:
        raise ImportError("runwayml not installed")
    client = RunwayML(api_key=RUNWAY_API_KEY)
    kwargs = {"model": model["runway_model"], "promptText": prompt}
    if image_input and model.get("supports_image"):
        task = client.image_to_video.create(promptImage=image_input, **kwargs)
    else:
        task = client.text_to_video.create(**kwargs)
    # Poll for completion
    task_result = client.tasks.retrieve(task.id)
    while task_result.status not in ["SUCCEEDED", "FAILED"]:
        time.sleep(5)
        task_result = client.tasks.retrieve(task.id)
    if task_result.status != "SUCCEEDED":
        raise Exception(f"Runway failed: {task_result.failure}")
    output_url = task_result.output[0] if task_result.output else None
    if not output_url:
        raise Exception("Runway returned no output URL")
    with open(filepath, "wb") as f:
        f.write(robust_download(str(output_url), timeout=300))
    return filepath

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
    Client sends: { "job_id": "...", "scene_data": {...}, "model_id": "..." }
    Server streams back step-by-step updates.
    """
    await ws.accept()

    try:
        # Receive the approved script data from client
        raw = await ws.receive_text()
        payload = json.loads(raw)
        job_id = payload["job_id"]
        scene_data = payload["scene_data"]
        model_id = payload.get("model_id", "grok-imagine-video")
        model_info = VIDEO_MODELS.get(model_id, VIDEO_MODELS["grok-imagine-video"])

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
                "message": f"Animating Scene {scene_num} via {model_info['name']}...",
            })

            vid_path = await asyncio.to_thread(
                generate_video_with_model,
                segment["video_prompt"],
                model_id,
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
            "video_url": f"/api/files/{job_id}/nexoryx_Seedance.mp4",
            "download_url": f"/api/files/{job_id}/nexoryx_Seedance.mp4",
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


# ═══════════════════════════════════════════════════════════
# Welcome Email (Resend)
# ═══════════════════════════════════════════════════════════
WELCOME_EMAIL_HTML = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#010103; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#010103; padding:0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

          <!-- Top Accent Bar -->
          <tr>
            <td style="height:3px; background:linear-gradient(90deg, #64748b 0%, #94a3b8 50%, #64748b 100%);"></td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:48px;"></td></tr>

          <!-- NEXORYX Logo — Bold, Stylish, Capital -->
          <tr>
            <td align="center" style="padding:0 30px;">
              <h1 style="margin:0; font-size:42px; font-weight:900; letter-spacing:8px; color:#e8eaed; text-transform:uppercase;">
                NEXO<span style="color:#94a3b8;">RYX</span>
              </h1>
            </td>
          </tr>

          <!-- Tagline with side lines -->
          <tr>
            <td align="center" style="padding:16px 60px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:1px; background:linear-gradient(to right, transparent, rgba(100,116,139,0.4));"></td>
                  <td style="padding:0 16px; white-space:nowrap;">
                    <p style="margin:0; font-size:10px; color:#64748b; letter-spacing:4px; text-transform:uppercase; font-weight:600;">
                      Cinematic AI Director
                    </p>
                  </td>
                  <td style="height:1px; background:linear-gradient(to left, transparent, rgba(100,116,139,0.4));"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:48px;"></td></tr>

          <!-- Hero Banner Card — Pinterest style rounded card -->
          <tr>
            <td style="padding:0 24px;">
              <div style="background:linear-gradient(160deg, #0c0c14 0%, #12121e 40%, #0a0a12 100%); border:1px solid rgba(255,255,255,0.06); border-radius:20px; overflow:hidden;">

                <!-- Inner gradient accent strip -->
                <div style="height:4px; background:linear-gradient(90deg, transparent, #64748b, #94a3b8, #64748b, transparent);"></div>

                <!-- Welcome Content -->
                <div style="padding:44px 36px 40px;">

                  <!-- Greeting pill -->
                  <div style="display:inline-block; padding:6px 18px; border-radius:100px; background:rgba(100,116,139,0.12); border:1px solid rgba(100,116,139,0.2); margin-bottom:20px;">
                    <span style="font-size:12px; font-weight:600; color:#94a3b8; letter-spacing:1px; text-transform:uppercase;">Welcome</span>
                  </div>

                  <!-- Name — editorial oversized -->
                  <h2 style="margin:0 0 8px; font-size:32px; color:#e8eaed; font-weight:800; line-height:1.2; letter-spacing:-0.5px;">
                    Hey, {{USER_NAME}}.
                  </h2>
                  <p style="margin:0 0 28px; font-size:15px; color:#64748b; font-weight:500; font-style:italic;">
                    Your director's chair is ready.
                  </p>

                  <!-- Body — clean Pinterest-style copy -->
                  <p style="margin:0 0 32px; font-size:15px; line-height:1.8; color:#8b8d94;">
                    Nexoryx turns a single idea into a fully rendered cinematic experience --
                    multi-scene AI video with native audio, built in real time. No editing skills needed.
                    Just type a topic and watch the magic unfold.
                  </p>

                  <!-- CTA — pill button, Pinterest aesthetic -->
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="border-radius:100px; background:linear-gradient(135deg, #64748b, #94a3b8);">
                        <a href="http://localhost:3000"
                           style="display:inline-block; padding:14px 44px; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none; letter-spacing:1px; text-transform:uppercase;">
                          Launch Studio &#8594;
                        </a>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:24px;"></td></tr>

          <!-- Feature Cards — Pinterest stacked vertical style -->
          <tr>
            <td style="padding:0 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- Card 1 -->
                <tr>
                  <td style="padding:6px 0;">
                    <div style="background:#0a0a12; border:1px solid rgba(255,255,255,0.05); border-radius:16px; padding:22px 28px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="44" style="vertical-align:top;">
                            <div style="width:40px; height:40px; border-radius:12px; background:rgba(100,116,139,0.1); border:1px solid rgba(100,116,139,0.15); text-align:center; line-height:40px; font-size:18px;">
                              &#127916;
                            </div>
                          </td>
                          <td style="padding-left:16px; vertical-align:top;">
                            <p style="margin:0; font-size:14px; font-weight:700; color:#e8eaed; letter-spacing:0.3px;">AI Video Generation</p>
                            <p style="margin:4px 0 0; font-size:12px; color:#64748b; line-height:1.5;">One-take cinematic shots stitched into seamless stories</p>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>

                <!-- Card 2 -->
                <tr>
                  <td style="padding:6px 0;">
                    <div style="background:#0a0a12; border:1px solid rgba(255,255,255,0.05); border-radius:16px; padding:22px 28px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="44" style="vertical-align:top;">
                            <div style="width:40px; height:40px; border-radius:12px; background:rgba(100,116,139,0.1); border:1px solid rgba(100,116,139,0.15); text-align:center; line-height:40px; font-size:18px;">
                              &#127911;
                            </div>
                          </td>
                          <td style="padding-left:16px; vertical-align:top;">
                            <p style="margin:0; font-size:14px; font-weight:700; color:#e8eaed; letter-spacing:0.3px;">Native Audio Synthesis</p>
                            <p style="margin:4px 0 0; font-size:12px; color:#64748b; line-height:1.5;">AI-generated soundscapes that match every scene perfectly</p>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>

                <!-- Card 3 -->
                <tr>
                  <td style="padding:6px 0;">
                    <div style="background:#0a0a12; border:1px solid rgba(255,255,255,0.05); border-radius:16px; padding:22px 28px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="44" style="vertical-align:top;">
                            <div style="width:40px; height:40px; border-radius:12px; background:rgba(100,116,139,0.1); border:1px solid rgba(100,116,139,0.15); text-align:center; line-height:40px; font-size:18px;">
                              &#9889;
                            </div>
                          </td>
                          <td style="padding-left:16px; vertical-align:top;">
                            <p style="margin:0; font-size:14px; font-weight:700; color:#e8eaed; letter-spacing:0.3px;">Real-Time Pipeline</p>
                            <p style="margin:4px 0 0; font-size:12px; color:#64748b; line-height:1.5;">Watch each scene render live as Nexoryx builds your vision</p>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:40px;"></td></tr>

          <!-- Footer Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px; background:rgba(255,255,255,0.04);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 30px 40px;">
              <p style="margin:0; font-size:13px; font-weight:700; color:#4a4b52; letter-spacing:3px; text-transform:uppercase;">
                NEXORYX
              </p>
              <p style="margin:8px 0 0; font-size:11px; color:#3a3b42; line-height:1.6;">
                The Cinematic AI Director<br>
                You received this because you signed up at Nexoryx.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


@app.post("/api/send-welcome")
async def send_welcome_email(body: dict):
    """Send a cinematic welcome email to new users via Resend."""
    email = body.get("email", "").strip()
    name = body.get("name", "Director").strip()

    if not email:
        return JSONResponse({"error": "Email is required"}, status_code=400)

    if not RESEND_API_KEY:
        print("[WARN] RESEND_API_KEY not set -- skipping welcome email")
        return JSONResponse({"error": "Email service not configured"}, status_code=503)

    try:
        html_content = WELCOME_EMAIL_HTML.replace("{{USER_NAME}}", name)

        params = {
            "from": "Nexoryx <onboarding@resend.dev>",
            "to": [email],
            "subject": "Welcome to Nexoryx -- The Cinematic AI Director",
            "html": html_content,
        }

        result = resend.Emails.send(params)
        email_id = result.id if hasattr(result, 'id') else str(result)
        print(f"[OK] Welcome email sent to {email} (id: {email_id})")
        return {"success": True, "message": f"Welcome email sent to {email}", "id": email_id}

    except Exception as e:
        traceback.print_exc()
        print(f"[ERROR] Failed to send welcome email to {email}: {str(e)}")
        return JSONResponse(
            {"error": f"Failed to send email: {str(e)}"},
            status_code=500,
        )


# ═══════════════════════════════════════════════════════════
# ENDPOINT — List Video Models
# ═══════════════════════════════════════════════════════════
@app.get("/api/models")
async def list_models():
    """Return all available video generation models."""
    models = []
    for mid, m in VIDEO_MODELS.items():
        models.append({
            "id": mid,
            "name": m["name"],
            "provider": m["provider"],
            "provider_logo": m["provider_logo"],
            "quality": m["quality"],
            "speed": m["speed"],
            "cost_per_sec": m["cost_per_sec"],
            "supports_image": m["supports_image"],
            "supports_text": m["supports_text"],
        })
    return {"models": models}


# ═══════════════════════════════════════════════════════════
# ENDPOINT — Quick Generate (single video)
# ═══════════════════════════════════════════════════════════
@app.post("/api/quick-generate")
async def quick_generate(body: dict):
    """Start a single-video generation job. Returns job_id to poll."""
    prompt = body.get("prompt", "").strip()
    model_id = body.get("model_id", "wan-2.1")
    duration = body.get("duration", 5)
    style = body.get("style", "Cinematic")

    if not prompt:
        return JSONResponse({"error": "Prompt is required"}, status_code=400)
    if model_id not in VIDEO_MODELS:
        return JSONResponse({"error": f"Unknown model: {model_id}"}, status_code=400)

    job_id = str(uuid.uuid4())[:8]
    job_dir = STATIC_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    active_jobs[job_id] = {
        "status": "processing", "progress": 0,
        "video_url": None, "error": None,
        "model_id": model_id, "prompt": prompt,
    }

    # Run generation in background
    full_prompt = f"{prompt}. Style: {style}. Duration: ~{duration} seconds."

    async def _run():
        try:
            active_jobs[job_id]["progress"] = 10
            filepath = await asyncio.to_thread(
                generate_video_with_model,
                full_prompt, model_id, None, 1, job_dir,
            )
            active_jobs[job_id]["progress"] = 100
            active_jobs[job_id]["status"] = "done"
            active_jobs[job_id]["video_url"] = f"/api/files/{job_id}/scene_1.mp4"
        except Exception as e:
            traceback.print_exc()
            active_jobs[job_id]["status"] = "failed"
            active_jobs[job_id]["error"] = str(e)

    asyncio.create_task(_run())
    return {"job_id": job_id, "status": "processing"}


@app.get("/api/job/{job_id}/status")
async def job_status(job_id: str):
    """Poll the status of a quick-generate job."""
    job = active_jobs.get(job_id)
    if not job:
        return JSONResponse({"error": "Job not found"}, status_code=404)
    return job


# ═══════════════════════════════════════════════════════════
# ENDPOINT — Search Stock Clips (Pexels + Pixabay)
# ═══════════════════════════════════════════════════════════
@app.post("/api/search-clips")
async def search_clips(body: dict):
    """Search Pexels and/or Pixabay for stock video clips."""
    query = body.get("query", "").strip()
    source = body.get("source", "pexels")  # pexels | pixabay | all
    per_page = min(body.get("per_page", 15), 30)

    if not query:
        return JSONResponse({"error": "Query is required"}, status_code=400)

    results = []

    if source in ("pexels", "all") and PEXELS_API_KEY:
        try:
            r = requests.get(
                "https://api.pexels.com/videos/search",
                headers={"Authorization": PEXELS_API_KEY},
                params={"query": query, "per_page": per_page},
                timeout=10,
            )
            if r.ok:
                for v in r.json().get("videos", []):
                    files = v.get("video_files", [])
                    best = max(files, key=lambda f: f.get("width", 0)) if files else None
                    results.append({
                        "id": f"pexels-{v['id']}",
                        "source": "Pexels",
                        "thumbnail": v.get("image", ""),
                        "url": best["link"] if best else "",
                        "duration": v.get("duration", 0),
                        "width": best.get("width", 0) if best else 0,
                        "height": best.get("height", 0) if best else 0,
                        "license": "Pexels License (Free)",
                    })
        except Exception as e:
            print(f"[WARN] Pexels search failed: {e}")

    if source in ("pixabay", "all") and PIXABAY_API_KEY:
        try:
            r = requests.get(
                "https://pixabay.com/api/videos/",
                params={"key": PIXABAY_API_KEY, "q": query, "per_page": per_page},
                timeout=10,
            )
            if r.ok:
                for v in r.json().get("hits", []):
                    vids = v.get("videos", {})
                    large = vids.get("large", {})
                    results.append({
                        "id": f"pixabay-{v['id']}",
                        "source": "Pixabay",
                        "thumbnail": f"https://i.vimeocdn.com/video/{v['picture_id']}_640x360.jpg",
                        "url": large.get("url", ""),
                        "duration": v.get("duration", 0),
                        "width": large.get("width", 0),
                        "height": large.get("height", 0),
                        "license": "Pixabay License (Free)",
                    })
        except Exception as e:
            print(f"[WARN] Pixabay search failed: {e}")

    return {"clips": results, "total": len(results)}


# ═══════════════════════════════════════════════════════════
# ENDPOINT — ElevenLabs Voices + Voiceover
# ═══════════════════════════════════════════════════════════
@app.get("/api/voices")
async def list_voices():
    """Return available ElevenLabs voices."""
    if not ElevenLabsClient or not ELEVENLABS_API_KEY:
        # Return defaults when API key not configured
        return {"voices": [
            {"voice_id": "JBFqnCBsd6RMkjVDRZzb", "name": "George", "category": "premade"},
            {"voice_id": "EXAVITQu4vr4xnSDxMaL", "name": "Sarah", "category": "premade"},
            {"voice_id": "onwK4e9ZLuTAKqWW03F9", "name": "Daniel", "category": "premade"},
            {"voice_id": "pFZP5JQG7iQjIQuC4Bku", "name": "Lily", "category": "premade"},
        ]}
    try:
        client = ElevenLabsClient(api_key=ELEVENLABS_API_KEY)
        voices_resp = client.voices.get_all()
        voices = [{"voice_id": v.voice_id, "name": v.name, "category": v.category}
                  for v in voices_resp.voices[:20]]
        return {"voices": voices}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/generate-voiceover")
async def generate_voiceover(body: dict):
    """Generate TTS voiceover via ElevenLabs."""
    script = body.get("script", "").strip()
    voice_id = body.get("voice_id", "JBFqnCBsd6RMkjVDRZzb")
    speed = body.get("speed", 1.0)

    if not script:
        return JSONResponse({"error": "Script text is required"}, status_code=400)
    if not ElevenLabsClient or not ELEVENLABS_API_KEY:
        return JSONResponse({"error": "ElevenLabs not configured"}, status_code=503)

    job_id = str(uuid.uuid4())[:8]
    job_dir = STATIC_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    audio_path = str(job_dir / "voiceover.mp3")

    try:
        client = ElevenLabsClient(api_key=ELEVENLABS_API_KEY)
        audio_gen = client.text_to_speech.convert(
            text=script,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )
        with open(audio_path, "wb") as f:
            for chunk in audio_gen:
                f.write(chunk)
        return {
            "audio_url": f"/api/files/{job_id}/voiceover.mp3",
            "job_id": job_id,
        }
    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


# ═══════════════════════════════════════════════════════════
# ENDPOINT — Export Clip Project (stitch clips + voiceover)
# ═══════════════════════════════════════════════════════════
@app.post("/api/export-clip-project")
async def export_clip_project(body: dict):
    """Download clips, stitch them, overlay voiceover audio, export final MP4."""
    clip_urls = body.get("clips", [])  # list of video URLs
    voiceover_url = body.get("voiceover_url", None)

    if not clip_urls:
        return JSONResponse({"error": "No clips provided"}, status_code=400)

    job_id = str(uuid.uuid4())[:8]
    job_dir = STATIC_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Download all clips
        clip_paths = []
        for i, url in enumerate(clip_urls):
            clip_path = str(job_dir / f"clip_{i}.mp4")
            with open(clip_path, "wb") as f:
                f.write(robust_download(url, timeout=120))
            clip_paths.append(clip_path)

        # Stitch clips
        stitched_path = str(job_dir / "stitched.mp4")
        list_file = str(job_dir / "clips.txt")
        with open(list_file, "w") as f:
            for cp in clip_paths:
                f.write(f"file '{cp}'\n")
        subprocess.run(
            [FFMPEG_PATH, "-y", "-f", "concat", "-safe", "0",
             "-i", list_file, "-c", "copy", stitched_path],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )

        final_path = stitched_path

        # Overlay voiceover if provided
        if voiceover_url:
            audio_path = str(job_dir / "voiceover.mp3")
            # If it's a local API URL, resolve to filesystem path
            if voiceover_url.startswith("/api/files/"):
                parts = voiceover_url.replace("/api/files/", "").split("/")
                audio_path = str(STATIC_DIR / parts[0] / parts[1])
            else:
                with open(audio_path, "wb") as f:
                    f.write(robust_download(voiceover_url, timeout=60))

            final_with_audio = str(job_dir / "nexoryx_final.mp4")
            subprocess.run(
                [FFMPEG_PATH, "-y", "-i", stitched_path, "-i", audio_path,
                 "-c:v", "copy", "-c:a", "aac", "-shortest", final_with_audio],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            final_path = final_with_audio

        return {
            "video_url": f"/api/files/{job_id}/{Path(final_path).name}",
            "download_url": f"/api/files/{job_id}/{Path(final_path).name}",
            "job_id": job_id,
        }

    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)

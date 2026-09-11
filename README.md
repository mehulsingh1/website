<div align="center">

# NEXORYX

### AI Cinematic Director Platform

**Multi-Agent Pipeline · Model-Agnostic · Full Creator Studio**

[![Built for Razorpay Buildathon](https://img.shields.io/badge/Built%20for-Razorpay%20Buildathon-2563EB?style=for-the-badge)](https://razorpay.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)

---

*One idea. One pipeline. One cinematic film.*

</div>

---

## What is Nexoryx?

Nexoryx is a **multi-agent AI cinematic production platform** that converts a raw text idea into a fully rendered, scene-stitched cinematic video — end to end, automatically.

It is not a prompt wrapper. It is not a single-model video generator. It is a full **agentic production pipeline** — equivalent to hiring a writer, director, and post-production team — built entirely in software.

---

## ⚠️ Patented Pipeline Notice

> **The core agentic orchestration logic — including the multi-agent director prompt engine, keyframe anchoring system, and inter-scene continuity mechanism — is proprietary and patent-pending.**
>
> This repository contains the **public-facing frontend** and the **basic Python backend workflow** to demonstrate the platform's architecture. The full production pipeline is not open-sourced at this time.

---

## Architecture Overview

```
User Idea (text)
      │
      ▼
┌─────────────────────┐
│   Writer Agent      │  ← Groq LLM (Llama 3.3 70B)
│   Drafts full       │    Generates cinematic script:
│   cinematic script  │    origin frame + scene segments
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Origin Frame      │  ← Flux-Dev (via Replicate)
│   Generation        │    Creates the visual anchor
│                     │    image for the whole film
└────────┬────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│          Model-Agnostic Video Pipeline          │
│                                                 │
│  Scene 1 → [Model Router] → Video Clip 1       │
│  Scene 2 → [Model Router] → Video Clip 2       │
│  Scene N → [Model Router] → Video Clip N       │
│                                                 │
│  Supported Models:                              │
│  ├─ Grok Imagine Video  (xAI / Replicate)      │
│  ├─ Wan 2.1             (WaveSpeed / Replicate) │
│  ├─ Hunyuan Video       (Tencent / Replicate)  │
│  ├─ Minimax Video-01    (Minimax / Replicate)  │
│  ├─ Kling 1.6 Pro       (Kuaishou / Replicate) │
│  ├─ LTX Video           (Lightricks / Replicate)│
│  ├─ Veo 3               (Google DeepMind / fal) │
│  ├─ CogVideoX-5B        (THUDM / fal)          │
│  ├─ Pika 2.2            (Pika Labs / fal)       │
│  └─ Gen-4 Turbo         (Runway ML)             │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│   ffmpeg Stitch     │  Concatenates all scene clips
│                     │  into one final cinematic MP4
└─────────────────────┘
         │
         ▼
    Final Video ✓
```

---

## Basic Python Workflow (Public)

The following shows the core pipeline logic as implemented in `backend/main.py`:

### 1. Script Generation — Groq LLM

```python
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

llm = ChatGroq(temperature=0.4, model_name="llama-3.3-70b-versatile")
chain = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", "{topic}")
]) | llm

response = chain.invoke({"topic": "A man eating Maggie falls into a river and fights a shark"})
scene_data = json.loads(response.content)
# Returns: { origin_image_prompt, segments: [{ video_prompt }] }
```

### 2. Origin Frame Generation — Flux-Dev

```python
import replicate

output = replicate.run(
    "black-forest-labs/flux-dev",
    input={
        "prompt": f"{scene_data['origin_image_prompt']}, cinematic 4k masterpiece",
        "guidance": 3.5,
        "output_format": "png",
        "aspect_ratio": "16:9",
    },
)
origin_image_url = output[0].url
```

### 3. Model-Agnostic Video Generation

```python
def generate_video_with_model(prompt, model_id, image_input, index, job_dir):
    """Routes to Replicate / fal.ai / Runway based on model registry."""
    model = VIDEO_MODELS[model_id]
    platform = model["platform"]

    if platform == "replicate":
        return _replicate_generate(prompt, model, image_input, filepath)
    elif platform == "fal":
        return _fal_generate(prompt, model, image_input, filepath)
    elif platform == "runway":
        return _runway_generate(prompt, model, image_input, filepath)
```

### 4. Inter-Scene Frame Extraction (Continuity)

```python
def extract_last_frame_as_data_uri(video_path, output_image_path):
    """Extract final frame from scene N to use as start of scene N+1."""
    cmd = [FFMPEG_PATH, "-y", "-sseof", "-0.5", "-i", video_path,
           "-vframes", "1", output_image_path]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with open(output_image_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"
```

### 5. Final Stitch — ffmpeg

```python
def _stitch_videos(video_files, job_dir):
    """Concatenate all scene MP4s into one final cinematic video."""
    list_file = str(job_dir / "clips.txt")
    with open(list_file, "w") as f:
        for vid in video_files:
            f.write(f"file '{vid}'\n")

    output_file = str(job_dir / "nexoryx_final.mp4")
    subprocess.run([
        FFMPEG_PATH, "-y", "-f", "concat", "-safe", "0",
        "-i", list_file, "-c", "copy", output_file
    ])
    return output_file
```

---

## Platform Features

| Feature | Description |
|---|---|
| 🎬 **Quick Generate** | One prompt → one video, single model, instant |
| 📖 **Epic Story Mode** | Full agentic pipeline — AI writes story, generates all scenes |
| 🎞 **Cinematic Studio** | Manual storyboard assembly, timeline editor |
| 🎯 **Marketing Studio** | Brand-safe video creation with voiceover |
| 🖼 **Clip Studio** | AI clip search (Pexels/Pixabay), generation, and compositing |
| 🔊 **Voice Synthesis** | ElevenLabs TTS integration for narration |
| 📬 **Welcome Emails** | Resend-powered onboarding email system |

---

## Tech Stack

### Frontend
- **React 18** + **Vite**
- **Framer Motion** — animations
- **Lucide React** — icons
- **React Router v6**

### Backend
- **FastAPI** — REST + WebSocket API
- **Groq** (Llama 3.3 70B) — script generation
- **Replicate** — Flux-Dev, Grok, Wan, Hunyuan, Minimax, Kling, LTX
- **fal.ai** — Veo 3, CogVideoX, Pika 2.2
- **Runway ML** — Gen-4 Turbo
- **ElevenLabs** — voice synthesis
- **Resend** — transactional email
- **ffmpeg** — video stitching

---

## Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- ffmpeg installed and path set in `.env`

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Environment Variables

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_key
REPLICATE_API_TOKEN=your_replicate_token
FAL_KEY=your_fal_key
RUNWAY_API_KEY=your_runway_key
ELEVENLABS_API_KEY=your_elevenlabs_key
RESEND_API_KEY=your_resend_key
PEXELS_API_KEY=your_pexels_key
PIXABAY_API_KEY=your_pixabay_key
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/draft-script` | Generate cinematic script via Groq LLM |
| `WS` | `/api/ws/produce` | Real-time production pipeline (WebSocket) |
| `POST` | `/api/quick-generate` | Single-clip video generation |
| `GET` | `/api/job/{id}/status` | Poll job status |
| `GET` | `/api/models` | List all available video models |
| `POST` | `/api/generate-voiceover` | ElevenLabs TTS synthesis |
| `GET` | `/api/voices` | List available ElevenLabs voices |
| `POST` | `/api/search-clips` | Search Pexels/Pixabay stock |
| `POST` | `/api/export-clip-project` | Stitch clips + voiceover |
| `GET` | `/api/files/{job_id}/{filename}` | Serve generated assets |

---

<div align="center">

Built with ❤️ for **Razorpay Buildathon**

**Team Nexoryx**

*The future of cinematic creation is autonomous.*

</div>

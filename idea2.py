import streamlit as st
import os
import json
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import urllib3
import subprocess
import time
import replicate
import base64
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

# ==========================================
# 0. THE NUCLEAR SSL FIX & API KEYS
# ==========================================
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
os.environ["CURL_CA_BUNDLE"] = ""
os.environ["REQUESTS_CA_BUNDLE"] = ""

os.environ["GROQ_API_KEY"] = "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"
# Make sure your funded r8_ key is pasted here!
os.environ["REPLICATE_API_TOKEN"] = "r8_KtlxaH5HjYTBvBGDfilORJW4wbuQVxR0YuJoG"

# ==========================================
# 1. STREAMLIT STATE MANAGEMENT
# ==========================================
if "stage" not in st.session_state:
    st.session_state.stage = "drafting"
if "scene_data" not in st.session_state:
    st.session_state.scene_data = None

def reset_pipeline():
    st.session_state.stage = "drafting"
    st.session_state.scene_data = None

st.set_page_config(page_title="Nexoryx: xAI Studio", page_icon="🎬", layout="wide")
st.title("🎬 Nexoryx: Infinite Audio-Visual Engine")
st.markdown("Autoregressive Chaining powered by **Groq**, **Flux-Dev**, and **Grok Imagine Video**.")

# ---------------------------------------------------------
# HELPERS
# ---------------------------------------------------------
def robust_download(url, timeout=300):
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
    session.mount('https://', HTTPAdapter(max_retries=retries))
    headers = {"User-Agent": "Mozilla/5.0"}
    response = session.get(url, headers=headers, timeout=timeout, verify=False) 
    response.raise_for_status()
    return response.content

def extract_last_frame_as_data_uri(video_path, output_image_path):
    """Extracts a frame and converts it to a Base64 Data URI to bypass Windows MIME bugs."""
    ffmpeg_path = r"C:\ffmpeg\bin\ffmpeg.exe"
    cmd = [
        ffmpeg_path, "-y", "-sseof", "-0.5", "-i", video_path, 
        "-vframes", "1", output_image_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    with open(output_image_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
        
    data_uri = f"data:image/png;base64,{encoded}"
    return data_uri, output_image_path

# ---------------------------------------------------------
# GENERATORS
# ---------------------------------------------------------
def generate_origin_image(prompt, status_container):
    status_container.info("Generating Origin Frame via Flux-Dev...")
    output = replicate.run(
        "black-forest-labs/flux-dev",
        input={"prompt": f"{prompt}, highly detailed, cinematic 4k masterpiece", "guidance": 3.5, "output_format": "png", "aspect_ratio": "16:9"}
    )
    img_url = output[0].url if isinstance(output, list) else (output.url if hasattr(output, 'url') else str(output))
    
    img_filename = "origin_frame.png"
    with open(img_filename, "wb") as f: f.write(robust_download(img_url, timeout=60))
    return img_url, img_filename

def generate_video_segment(video_prompt, image_input_string, index, status_container):
    status_container.info(f"Animating Segment {index} via Grok Imagine Video (with Audio)...")
    
    prediction = replicate.predictions.create(
        model="xai/grok-imagine-video",
        input={"prompt": video_prompt, "image": image_input_string}
    )
    
    while prediction.status not in ["succeeded", "failed", "canceled"]:
        time.sleep(5)
        prediction.reload()
        
    if prediction.status != "succeeded":
        raise Exception(f"Video API failed. Check Replicate Dashboard. Error: {prediction.error}")
        
    output_url = str(prediction.output)
    
    filename = f"scene_{index}.mp4"
    with open(filename, "wb") as f: f.write(robust_download(output_url, timeout=300))
    return filename

def stitch_videos(video_files, output_file="nexoryx_final.mp4"):
    with open("clips.txt", "w") as f:
        for vid in video_files: f.write(f"file '{vid}'\n")
    ffmpeg_path = r"C:\ffmpeg\bin\ffmpeg.exe"
    subprocess.run([ffmpeg_path, "-y", "-f", "concat", "-safe", "0", "-i", "clips.txt", "-c", "copy", output_file], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return output_file

# ==========================================
# MAIN UI FLOW
# ==========================================

# --- STAGE 1: DRAFTING ---
if st.session_state.stage == "drafting":
    topic = st.text_input("Enter a concept (e.g., 'Cyberpunk Heist' or 'Nike Ad'):")
    if st.button("1. Draft Script with Groq", type="primary"):
        if topic:
            with st.spinner("Groq Director is writing the script & sound design..."):
                llm = ChatGroq(temperature=0.4, model_name="llama-3.3-70b-versatile")
                
                system_prompt = """
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
                response = (ChatPromptTemplate.from_messages([("system", system_prompt), ("human", "{topic}")]) | llm).invoke({"topic": topic})
                try:
                    clean_json = response.content.replace('```json\n', '').replace('```', '')
                    st.session_state.scene_data = json.loads(clean_json)
                    st.session_state.stage = "review"
                    st.rerun() 
                except Exception as e:
                    st.error("JSON Error from Groq. Try again.")

# --- STAGE 2: REVIEW ---
elif st.session_state.stage == "review":
    st.success("✅ Script Drafted! Review before spending API credits.")
    scene_data = st.session_state.scene_data
    
    st.markdown("### 🎬 Storyboard Review")
    st.info(f"**Origin Frame:** {scene_data['origin_image_prompt']}")
    for i, seg in enumerate(scene_data['segments']):
        st.markdown(f"**Scene {i+1} Motion & Audio:** {seg['video_prompt']}")
        
    col1, col2 = st.columns(2)
    with col1:
        if st.button("⏪ Discard & Rewrite"):
            reset_pipeline()
            st.rerun()
    with col2:
        if st.button("🎥 Approve & Shoot Movie (Grok A/V)", type="primary"):
            st.session_state.stage = "production"
            st.rerun() 

# --- STAGE 3: PRODUCTION ---
elif st.session_state.stage == "production":
    status_text = st.empty()
    scene_data = st.session_state.scene_data
    video_files = []
    
    try:
        # Step 1: Origin Image 
        origin_url, current_frame_path = generate_origin_image(scene_data["origin_image_prompt"], status_text)
        st.image(current_frame_path, caption="Origin Frame (The Anchor)")
        
        # THE FIX: 15-second mandatory cooldown before hitting the video API
        status_text.warning("Anti-Rate Limit: Cooling down for 15 seconds...")
        time.sleep(15)
        
        current_input_for_video = origin_url
        
        # Step 2: The Loop
        for i, segment in enumerate(scene_data["segments"]):
            scene_num = i + 1
            
            # Generate Video 
            vid_path = generate_video_segment(segment["video_prompt"], current_input_for_video, scene_num, status_text)
            video_files.append(vid_path)
            st.video(vid_path) 
            
            if scene_num < len(scene_data["segments"]):
                next_frame_path = f"extracted_frame_{scene_num}.png"
                data_uri, current_frame_path = extract_last_frame_as_data_uri(vid_path, next_frame_path)
                current_input_for_video = data_uri
                
                st.image(current_frame_path, caption=f"Extracted End-Frame (Used to start Scene {scene_num + 1})")
                
                # THE FIX: 15-second mandatory cooldown between video generations
                status_text.warning(f"Anti-Rate Limit: Cooling down for 15 seconds before Scene {scene_num + 1}...")
                time.sleep(15)
                
        status_text.info("Stitching the final continuous cut with Audio...")
        final_video_path = stitch_videos(video_files)
        
        status_text.success("✅ Infinite One-Take Complete!")
        st.video(final_video_path)
        
        with open(final_video_path, "rb") as file:
            st.download_button("Download Final Movie", data=file, file_name="nexoryx_master.mp4", mime="video/mp4", type="primary")
            
        if st.button("Start New Project"):
            reset_pipeline()
            st.rerun()
            
    except Exception as e:
        status_text.error(f"❌ Pipeline failed: {e}")
        if st.button("Reset App"):
            reset_pipeline()
            st.rerun()
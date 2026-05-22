import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, Play, ArrowDown, Clock, Cpu, Film,
  Layers, Bot, Clapperboard, Loader2,
  Zap, Eye, ArrowRight, ArrowLeft, Pencil,
  Download, RotateCcw, CheckCircle2, Send,
  MessageSquare, Video, Wand2, AlertTriangle,
  Plus, X
} from 'lucide-react'
import ModelSelector from '../components/ModelSelector'

/* ────────────────────────────────────────────────────────
   STATUS MESSAGES SHOWN WHILE NEXORYX IS WORKING
   ──────────────────────────────────────────────────────── */
const SCRIPT_GEN_STEPS = [
  'Initializing Nexoryx Engine...',
  'Analyzing your creative vision...',
  'Crafting the narrative arc...',
  'Building scene structure...',
  'Generating cinematic script...',
]

const SCENE_FRAMES = [
  '/frame1.png', '/frame2.png', '/frame3.png',
  '/frame4.png', '/frame5.png', '/frame6.png',
]

const SIMULATED_SCRIPT = {
  origin_image_prompt: 'A young man in a plaid flannel shirt sits on weathered rocks at the edge of a dark river gorge, overhead drone shot, golden hour side-lighting, moody cinematic color grade.',
  segments: [
    { video_prompt: 'Slow overhead drone descent — the young man sits on the cliff edge, staring into the dark water below. Sunlight sparkles on the rippling surface. The camera pushes in slowly, building tension. Atmospheric ambient score.' },
    { video_prompt: 'Wide angle from below — the man leaps off the rocky cliff, arms outstretched, plaid shirt billowing. Camera tracks his fall in slow motion against the towering rock face. Water rushes up to meet him. Impact score builds.' },
    { video_prompt: 'Underwater POV — murky green depths. The man turns to find a massive great white shark looming directly behind him, jaws slightly parted. Volumetric light rays pierce from above. Tension reaches peak. Deep bass rumble.' },
    { video_prompt: 'Dynamic underwater tracking — the man grapples with the shark in a cloud of bubbles. His hands push against the creature as it thrashes. Adrenaline-fueled handheld camera movement. Heart-pounding percussion.' },
    { video_prompt: 'Surface-level tracking shot — the shark lunges from the churning water, mouth wide open, as the man desperately claws his way onto the muddy riverbank. Water explodes around them. Frantic string crescendo.' },
    { video_prompt: 'Close-up portrait — the man lies on the dried riverbank, soaked and covered in mud, catching his breath. He looks back at the water where the shark\'s shadow fades. Golden hour backlight. Score resolves to quiet piano.' },
  ],
}

/* ────────────────────────────────────────────────────────
   SHOWCASE & FEATURES (static landing content – unchanged)
   ──────────────────────────────────────────────────────── */
const SHOWCASE_ITEMS = [
  {
    id: 1,
    prompt: 'Luxury cinematic close-up, gold rings on weathered hands cradling a whiskey glass, warm moody lighting',
    duration: '45s',
    model: 'Nexoryx v2',
    video: '/generation.mp4',
  },
  {
    id: 2,
    prompt: 'Portrait of a man in a dark suit and glasses, city bokeh lights at night, shallow depth of field',
    duration: '60s',
    model: 'Nexoryx v2',
    video: '/generation1.mp4',
  },
  {
    id: 3,
    prompt: 'Eating maggi fall into river,fighnting an shark,running away from it to the cliff',
    duration: '45s',
    model: 'Nexoryx Pro',
    video: '/new_generation.mp4',
  },
]

const FEATURES = [
  {
    icon: <Layers size={22} />,
    title: 'Scene-by-Scene Control',
    desc: 'Break your vision into individual scenes. Control camera angles, lighting, mood, and motion for every single shot independently.',
  },
  {
    icon: <Bot size={22} />,
    title: 'AI Agent Director',
    desc: 'Our AI agent understands cinematic language. Describe your intent naturally — it handles composition, pacing, and visual storytelling.',
  },
  {
    icon: <Clapperboard size={22} />,
    title: 'Cinematic Quality Output',
    desc: 'Deliver broadcast-ready content at 4K resolution. Built for advertisers, filmmakers, and content creators who demand excellence.',
  },
]

/* ================================================================
   LANDING COMPONENT
   ================================================================ */
export default function Landing() {
  const navigate = useNavigate()

  /* ---- Core state ---- */
  const [topic, setTopic] = useState('')
  const [uploadedImage, setUploadedImage] = useState(null)
  const fileInputRef = useRef(null)
  // Phases: idle | generating-script | review-script | generating-video | video-ready
  const [phase, setPhase] = useState('idle')
  const [storyTitle, setStoryTitle] = useState('')
  const [selectedModel, setSelectedModel] = useState('grok-imagine-video')
  const [jobId, setJobId] = useState(null)

  /* ---- Script data ---- */
  const [sceneData, setSceneData] = useState(null)
  const [displayScript, setDisplayScript] = useState('')
  const [scriptError, setScriptError] = useState(null)

  /* ---- Generation UI state ---- */
  const [genStep, setGenStep] = useState(0)
  const [genProgress, setGenProgress] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const scriptRef = useRef(null)

  /* ---- Production pipeline state ---- */
  const [consoleLog, setConsoleLog] = useState([])
  const [sceneStatuses, setSceneStatuses] = useState({})
  const [originImageUrl, setOriginImageUrl] = useState(null)
  const [activeStep, setActiveStep] = useState('')
  const [videoProgress, setVideoProgress] = useState(0)
  const [finalVideoUrl, setFinalVideoUrl] = useState(null)
  const [pipelineError, setPipelineError] = useState(null)
  const [completedFrames, setCompletedFrames] = useState([])
  const simTimersRef = useRef([])
  const chatContainerRef = useRef(null)

  /* ──────────────────────────────────────────────────────
    PHASE 1: Generate Script (REAL API)
    ────────────────────────────────────────────────────── */
  const startPipeline = async () => {
    if (!topic.trim() || phase !== 'idle') return
    setPhase('generating-script')
    setGenStep(0)
    setGenProgress(0)
    setScriptError(null)
    setDisplayScript('')
    setSceneData(null)
    setIsEditing(false)

    // Animate progress steps while API call is in flight
    let stepIdx = 0
    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, SCRIPT_GEN_STEPS.length - 1)
      setGenStep(stepIdx)
    }, 700)

    let prog = 0
    const progTimer = setInterval(() => {
      prog = Math.min(prog + 1, 90)
      setGenProgress(prog)
    }, 100)

    try {
      const res = await fetch('/api/draft-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })
      const data = await res.json()

      clearInterval(stepTimer)
      clearInterval(progTimer)

      if (data.error) {
        setScriptError(data.error)
        setPhase('idle')
        return
      }

      setGenProgress(100)
      setJobId(data.job_id)
      setStoryTitle(topic)
      setSceneData(data.scene_data)
      setDisplayScript(data.display_script || '')
      setTimeout(() => setPhase('review-script'), 400)
    } catch (err) {
      clearInterval(stepTimer)
      clearInterval(progTimer)
      setScriptError(err.message || 'Failed to connect to Nexoryx API')
      setPhase('idle')
    }
  }

  const addConsoleMsg = (text, type = 'system', frameUrl = null) => {
    setConsoleLog(prev => [...prev, { text, type, frameUrl, id: Date.now() + Math.random() }])
  }

  /* ──────────────────────────────────────────────────────
     PHASE 3: Production Pipeline (REAL WebSocket)
     ────────────────────────────────────────────────────── */
  const startVideoGeneration = useCallback(() => {
    if (!sceneData) return
    setPhase('generating-video')
    setConsoleLog([])
    setSceneStatuses({})
    setOriginImageUrl(null)
    setActiveStep('')
    setVideoProgress(0)
    setFinalVideoUrl(null)
    setPipelineError(null)
    setCompletedFrames([])

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${window.location.host}/api/ws/produce`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      ws.send(JSON.stringify({
        job_id: jobId || 'live-' + Date.now(),
        scene_data: sceneData,
        model_id: selectedModel,
      }))
      addConsoleMsg('→ Connected to Nexoryx Pipeline Engine...', 'system')
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      const progress = msg.progress || 0
      setVideoProgress(progress)

      if (msg.step === 'origin_image') {
        setActiveStep('origin_image')
        if (msg.status === 'done') {
          setOriginImageUrl(msg.image_url)
          addConsoleMsg('  ✓ Origin frame generated', 'done', msg.image_url)
          setCompletedFrames(prev => [...prev, msg.image_url])
        } else {
          addConsoleMsg('▸ Generating origin anchor frame...', 'render')
        }
      } else if (msg.step?.startsWith('scene_')) {
        setActiveStep(msg.step)
        if (msg.status === 'done') {
          setSceneStatuses(prev => ({ ...prev, [msg.step]: { status: 'done', videoUrl: msg.video_url } }))
          addConsoleMsg(`  ✓ ${msg.step.replace('_', ' ')} complete`, 'done')
        } else if (msg.status === 'rendering') {
          setSceneStatuses(prev => ({ ...prev, [msg.step]: { status: 'rendering' } }))
          addConsoleMsg(`▸ ${msg.message}`, 'render')
        }
      } else if (msg.step === 'stitching') {
        setActiveStep('stitching')
        addConsoleMsg('▸ Stitching all scenes via ffmpeg...', 'render')
      } else if (msg.step === 'final' && msg.status === 'done') {
        setFinalVideoUrl(msg.video_url || msg.download_url)
        addConsoleMsg('✦ Video ready — One-Take Complete!', 'final')
        setTimeout(() => setPhase('video-ready'), 1500)
      } else if (msg.step === 'error') {
        setPipelineError(msg.message)
        addConsoleMsg(`✗ ${msg.message}`, 'error')
      } else if (msg.step === 'cooldown') {
        addConsoleMsg(`⏳ ${msg.message}`, 'system')
      }
    }

    ws.onerror = () => {
      setPipelineError('WebSocket connection failed. Is the backend running?')
    }

    ws.onclose = () => {
      // Normal close after pipeline completes
    }

    // Store ref for cleanup
    simTimersRef.current = [{ close: () => ws.close() }]
  }, [sceneData, jobId, selectedModel])

  /* ---- Auto-scroll console ---- */
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [consoleLog])

  /* ---- Cleanup timers on unmount ---- */
  useEffect(() => {
    return () => {
      simTimersRef.current.forEach(t => clearTimeout(t))
    }
  }, [])

  /* ──────────────────────────────────────────────────────
     UI ACTIONS
     ────────────────────────────────────────────────────── */
  const resetAll = () => {
    simTimersRef.current.forEach(t => clearTimeout(t))
    setPhase('idle')
    setTopic('')
    setStoryTitle('')
    setDisplayScript('')
    setSceneData(null)
    setScriptError(null)
    setConsoleLog([])
    setSceneStatuses({})
    setOriginImageUrl(null)
    setActiveStep('')
    setVideoProgress(0)
    setFinalVideoUrl(null)
    setPipelineError(null)
    setGenStep(0)
    setGenProgress(0)
    setIsEditing(false)
    if (uploadedImage?.url) {
      URL.revokeObjectURL(uploadedImage.url)
    }
    setUploadedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setUploadedImage({ file, url, name: file.name })
    }
  }

  const removeUploadedImage = () => {
    if (uploadedImage?.url) {
      URL.revokeObjectURL(uploadedImage.url)
    }
    setUploadedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const goBack = () => {
    if (phase === 'review-script') {
      setPhase('idle')
    } else if (phase === 'generating-video') {
      simTimersRef.current.forEach(t => clearTimeout(t))
      setPhase('review-script')
      setConsoleLog([])
      setSceneStatuses({})
      setOriginImageUrl(null)
      setActiveStep('')
      setVideoProgress(0)
      setPipelineError(null)
    } else if (phase === 'video-ready') {
      setPhase('review-script')
    }
  }

  const toggleEdit = () => {
    setIsEditing(!isEditing)
    if (!isEditing) {
      setTimeout(() => scriptRef.current?.focus(), 100)
    }
  }

  /* ================================================================
     RENDER: GENERATING SCRIPT
     ================================================================ */
  if (phase === 'generating-script') {
    return (
      <div className="yai-overlay">
        <div className="yai-generating">
          <motion.div
            className="yai-gen-icon"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          >
            <Wand2 size={36} />
          </motion.div>

          <div className="yai-gen-pulse" />

          <motion.h2
            className="yai-gen-title"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Nexoryx is drafting your cinematic script
          </motion.h2>

          <p className="yai-gen-topic">
            <Sparkles size={14} /> {topic}
          </p>

          <div className="yai-gen-progress">
            <div className="yai-gen-progress__track">
              <motion.div
                className="yai-gen-progress__fill"
                animate={{ width: `${genProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="yai-gen-progress__pct">{genProgress}%</span>
          </div>

          <div className="yai-gen-steps">
            <AnimatePresence mode="wait">
              <motion.p
                key={genStep}
                className="yai-gen-step"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <Cpu size={14} />
                {SCRIPT_GEN_STEPS[genStep]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  /* ================================================================
     RENDER: REVIEW SCRIPT
     ================================================================ */
  if (phase === 'review-script') {
    return (
      <div className="yai-overlay">
        <div className="yai-review">
          {/* Header */}
          <div className="yai-review__header">
            <button className="yai-back-btn" onClick={goBack} id="yai-back-btn">
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <div className="yai-review__badge">
              <Bot size={14} />
              <span>Nexoryx AI Script</span>
            </div>
            <button className="yai-new-btn" onClick={resetAll}>
              <RotateCcw size={14} />
              <span>New Topic</span>
            </button>
          </div>

          {/* Topic Display */}
          <div className="yai-review__topic">
            <Sparkles size={16} />
            <h2>{storyTitle}</h2>
          </div>

          {/* Script Content — shows real Groq output */}
          <div className="yai-review__content">
            {isEditing ? (
              <textarea
                ref={scriptRef}
                className="yai-review__editor"
                value={displayScript}
                onChange={(e) => setDisplayScript(e.target.value)}
                id="yai-script-editor"
              />
            ) : (
              <div className="yai-review__script">
                {/* Structured view of scene_data */}
                <h2 className="yai-script-h1">{storyTitle}</h2>

                <div className="yai-script-section">
                  <h3 className="yai-script-h2">🎨 Origin Frame</h3>
                  <p className="yai-script-line">{sceneData?.origin_image_prompt}</p>
                </div>

                <hr className="yai-script-divider" />

                {sceneData?.segments?.map((seg, i) => (
                  <div key={i}>
                    <h3 className="yai-script-h2">🎬 Scene {i + 1} — Motion & Audio</h3>
                    <p className="yai-script-line">{seg.video_prompt}</p>
                    {i < sceneData.segments.length - 1 && <hr className="yai-script-divider" />}
                  </div>
                ))}

                <hr className="yai-script-divider" />
                <p className="yai-script-meta">Total Segments: {sceneData?.segments?.length}</p>
                <p className="yai-script-meta">Pipeline: Flux-Dev → Grok Imagine Video → ffmpeg stitch</p>
              </div>
            )}
          </div>

          {/* Action Buttons — same as before but calls real API */}
          <div className="yai-review__actions">
            <button
              className={`yai-action-btn yai-action-btn--edit ${isEditing ? 'yai-action-btn--active' : ''}`}
              onClick={toggleEdit}
              id="yai-edit-btn"
            >
              {isEditing ? <CheckCircle2 size={18} /> : <Pencil size={18} />}
              <span>{isEditing ? 'Done Editing' : 'Edit Script'}</span>
            </button>

            <button
              className="yai-action-btn yai-action-btn--continue"
              onClick={startVideoGeneration}
              id="yai-continue-btn"
            >
              <Play size={18} />
              <span>Approve & Shoot</span>
              <ArrowRight size={16} />
            </button>

            <button
              className="yai-action-btn yai-action-btn--auto"
              onClick={resetAll}
              id="yai-discard-btn"
            >
              <RotateCcw size={18} />
              <span>Discard & Rewrite</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ================================================================
     RENDER: GENERATING VIDEO (Real Production Pipeline)
     ================================================================ */
  if (phase === 'generating-video') {
    const segments = sceneData?.segments || []
    const totalScenes = segments.length
    const completedScenes = Object.values(sceneStatuses).filter(s => s.status === 'done').length
    const doneFrames = completedFrames

    return (
      <div className="yai-overlay">
        <div className="yai-render">
          {/* Header */}
          <div className="yai-render__header">
            <button className="yai-back-btn" onClick={goBack}>
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <div className="yai-render__title-group">
              <Film size={16} />
              <h3>Nexoryx — Live Production Pipeline</h3>
            </div>
            <div className="yai-render__stats">
              <span className="yai-render__scene-count">{completedScenes}/{totalScenes} scenes</span>
              <div className="yai-render__pct-badge">
                {videoProgress < 100 ? <Loader2 size={14} className="spinning" /> : <CheckCircle2 size={14} />}
                <span>{videoProgress}%</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="yai-render__progress-bar">
            <motion.div
              className="yai-render__progress-fill"
              animate={{ width: `${videoProgress}%` }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          {/* Error Banner */}
          {pipelineError && (
            <div className="yai-render__error">
              <AlertTriangle size={16} />
              <span>{pipelineError}</span>
              <button onClick={resetAll}>Reset</button>
            </div>
          )}

          {/* Main Content Area */}
          <div className="yai-render__body">
            {/* Left: Scene Cards */}
            <div className="yai-render__scenes">
              <div className="yai-render__scenes-header">
                <Sparkles size={14} />
                <span>{storyTitle}</span>
              </div>

              {/* Origin Image Card */}
              <div className={`yai-scene-card ${activeStep === 'origin_image' ? 'yai-scene-card--active' : ''} ${originImageUrl ? 'yai-scene-card--done' : ''}`}>
                <div className="yai-scene-card__top">
                  <div className="yai-scene-card__number">
                    {originImageUrl ? <CheckCircle2 size={14} /> : activeStep === 'origin_image' ? <Loader2 size={14} className="spinning" /> : <Film size={14} />}
                    <span>Origin Frame</span>
                  </div>
                  <span className="yai-scene-card__duration">Flux-Dev</span>
                </div>
                <h4 className="yai-scene-card__title">Anchor Image</h4>
                <p className="yai-scene-card__desc">{sceneData?.origin_image_prompt?.substring(0, 80)}...</p>
                <div className="yai-scene-card__meta">
                  <span><Cpu size={10} /> AI Image Gen</span>
                  <span>{originImageUrl ? 'Complete' : activeStep === 'origin_image' ? 'Generating...' : 'Queued'}</span>
                </div>
                {(activeStep === 'origin_image' || originImageUrl) && (
                  <div className="yai-scene-card__bar">
                    <motion.div
                      className="yai-scene-card__bar-fill"
                      animate={{ width: originImageUrl ? '100%' : '50%' }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>

              {/* Scene Segment Cards */}
              <div className="yai-render__scene-grid">
                {segments.map((seg, i) => {
                  const sceneKey = `scene_${i + 1}`
                  const sceneStatus = sceneStatuses[sceneKey]
                  const isActive = activeStep === sceneKey && sceneStatus?.status !== 'done'
                  const isDone = sceneStatus?.status === 'done'
                  const isPending = !sceneStatus

                  return (
                    <motion.div
                      key={sceneKey}
                      className={`yai-scene-card ${isActive ? 'yai-scene-card--active' : ''} ${isDone ? 'yai-scene-card--done' : ''}`}
                      initial={{ opacity: 0.5, scale: 0.98 }}
                      animate={{
                        opacity: isPending ? 0.4 : 1,
                        scale: isActive ? 1.02 : 1,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="yai-scene-card__top">
                        <div className="yai-scene-card__number">
                          {isDone ? <CheckCircle2 size={14} /> : isActive ? <Loader2 size={14} className="spinning" /> : <Film size={14} />}
                          <span>Scene {i + 1}</span>
                        </div>
                        <span className="yai-scene-card__duration">Grok Video</span>
                      </div>
                      <h4 className="yai-scene-card__title">Segment {i + 1}</h4>
                      <p className="yai-scene-card__desc">{seg.video_prompt.substring(0, 80)}...</p>
                      <div className="yai-scene-card__meta">
                        <span><Cpu size={10} /> xAI Grok</span>
                        <span>{isDone ? 'Complete' : isActive ? 'Rendering...' : 'Queued'}</span>
                      </div>
                      {(isActive || isDone) && (
                        <div className="yai-scene-card__bar">
                          <motion.div
                            className="yai-scene-card__bar-fill"
                            animate={{ width: isDone ? '100%' : '50%' }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Right: Console Log + Frame Gallery */}
            <div className="yai-render__console">
              <div className="yai-render__console-header">
                <div className="yai-console-dots">
                  <span /><span /><span />
                </div>
                <span className="yai-console-title">pipeline.log</span>
              </div>
              <div className="yai-render__console-body" ref={chatContainerRef}>
                <AnimatePresence>
                  {consoleLog.map((msg) => (
                    <motion.div
                      key={msg.id}
                      className={`yai-console-line yai-console-line--${msg.type}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="yai-console-line__text">{msg.text}</span>
                      {msg.frameUrl && (
                        <motion.img
                          src={msg.frameUrl}
                          alt="Generated frame"
                          className="yai-console-frame"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 80 }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {videoProgress < 100 && (
                  <div className="yai-console-cursor">
                    <span className="yai-console-cursor__blink">▋</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ================================================================
     RENDER: VIDEO READY
     ================================================================ */
  if (phase === 'video-ready') {
    const segments = sceneData?.segments || []
    return (
      <div className="yai-overlay">
        <div className="yai-video-ready">
          {/* Header */}
          <div className="yai-video-ready__header">
            <button className="yai-back-btn" onClick={goBack}>
              <ArrowLeft size={18} />
              <span>Back to Script</span>
            </button>
            <div className="yai-video-ready__badge">
              <CheckCircle2 size={14} />
              <span>Video Complete</span>
            </div>
            <button className="yai-new-btn" onClick={resetAll}>
              <RotateCcw size={14} />
              <span>New Topic</span>
            </button>
          </div>

          {/* Video Player — full controls like History page */}
          <div className="yai-video-ready__player-wrap">
            <div className="yai-video-ready__player" style={{ position: 'relative', width: '100%', maxWidth: '900px', margin: '0 auto', aspectRatio: '16/9', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
              <video
                src={finalVideoUrl}
                controls
                autoPlay
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                id="yai-final-video"
              />
              <div className="yai-video-ready__overlay-badge">
                <Film size={12} />
                <span>AI Generated • One-Take</span>
              </div>
            </div>

            <div className="yai-video-ready__info">
              <h3 className="yai-video-ready__topic-name">
                <Sparkles size={16} /> {storyTitle}
              </h3>
              <p className="yai-video-ready__stats">
                {segments.length} scenes • Generated by Nexoryx Pipeline
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="yai-video-ready__actions">
            <a
              href={finalVideoUrl}
              download="nexoryx_final.mp4"
              className="yai-action-btn yai-action-btn--download"
              id="yai-download-btn"
            >
              <Download size={18} />
              <span>Download</span>
            </a>
            <button
              className="yai-action-btn yai-action-btn--architect"
              onClick={() => navigate('/architect')}
              id="yai-edit-architect-btn"
            >
              <Pencil size={18} />
              <span>Edit in Architect</span>
            </button>
            <button
              className="yai-action-btn yai-action-btn--new"
              onClick={resetAll}
              id="yai-new-topic-btn"
            >
              <RotateCcw size={18} />
              <span>New Topic</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ================================================================
     DEFAULT: LANDING (IDLE)
     ================================================================ */
  return (
    <>
      {/* ---- HERO ---- */}
      <section className="hero">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div className="hero__badge" style={{ margin: 0 }}>
              <span className="hero__badge-dot" />
              Now in Public Beta
            </div>
            <button
              onClick={() => navigate('/history')}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '6px 16px',
                borderRadius: '100px',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              <Film size={14} style={{ color: 'var(--accent-violet)' }} />
              <span>Public beta is down temporarily — visit History to see generated videos</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <h1 className="hero__title">
            Cinematic Vision.{' '}
            <br />
            <span className="hero__title-gradient">One Prompt.</span>
          </h1>
          <p className="hero__subtitle">
            Nexoryx is the AI-powered cinematic engine that transforms your text into
            stunning scene-by-scene videos — built for creators who refuse to compromise.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <motion.button
            className="prompt-bar__btn"
            onClick={() => navigate('/generate')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            id="hero-start-generating-btn"
            style={{
              padding: '16px 48px',
              fontSize: '1.1rem',
              fontWeight: 600,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
            }}
          >
            <Sparkles size={20} />
            <span>Start Generating</span>
            <ArrowRight size={18} />
          </motion.button>
          <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} mode="compact" />
        </motion.div>

        {/* Error display */}
        {scriptError && (
          <motion.div
            className="yai-error-toast"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 20,
              padding: '12px 24px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangle size={16} />
            <span>{scriptError}</span>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 1 }} style={{ marginTop: 50 }}>
          <button className="btn-ghost" onClick={() => document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' })} style={{ fontSize: '0.85rem' }}>
            <Eye size={16} /> See Generations <ArrowDown size={14} />
          </button>
        </motion.div>
      </section>

      {/* ---- SHOWCASE ---- */}
      <section className="showcase" id="showcase">
        <motion.div className="showcase__header" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <p className="showcase__label">Recent Visions</p>
          <h2 className="showcase__title">What Creators Are Building</h2>
        </motion.div>
        <div className="showcase__grid">
          {SHOWCASE_ITEMS.map((item, i) => (
            <ShowcaseCard key={item.id} item={item} index={i} />
          ))}
        </div>
      </section>

      {/* ---- FEATURES ---- */}
      <section className="features" id="features">
        <motion.div className="features__header" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <p className="features__label">Why Nexoryx</p>
          <h2 className="features__title">Built for Cinematic Excellence</h2>
        </motion.div>
        <div className="features__grid">
          {FEATURES.map((f, i) => (
            <motion.div key={i} className="feature-card glass-panel" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}>
              <div className="feature-card__icon">{f.icon}</div>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__desc">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <p className="footer__text">© 2026 <span>Nexoryx</span> — Cinematic AI for the bold.</p>
      </footer>
    </>
  )
}

function ShowcaseCard({ item, index }) {
  const videoRef = useRef(null)
  return (
    <motion.div className="showcase-card glass-panel" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => videoRef.current?.play()} onMouseLeave={() => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0 } }}>
      <div className="showcase-card__video-wrap">
        <video ref={videoRef} src={item.video} muted loop playsInline preload="metadata" />
        <span className="showcase-card__badge">{item.model}</span>
      </div>
      <div className="showcase-card__info">
        <p className="showcase-card__prompt">{item.prompt}</p>
        <div className="showcase-card__meta">
          <span className="showcase-card__meta-item"><Clock size={12} /> {item.duration}</span>
          <span className="showcase-card__meta-item"><Film size={12} /> 4K</span>
          <span className="showcase-card__meta-item"><Zap size={12} /> 24fps</span>
        </div>
      </div>
    </motion.div>
  )
}

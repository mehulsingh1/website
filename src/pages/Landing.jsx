import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, Play, ArrowDown, Clock, Cpu, Film,
  Layers, Bot, Clapperboard, Loader2,
  Zap, Eye, ArrowRight, ArrowLeft, Pencil,
  Download, RotateCcw, CheckCircle2, Send,
  MessageSquare, Video, Wand2, AlertTriangle
} from 'lucide-react'

/* ────────────────────────────────────────────────────────
   STATUS MESSAGES SHOWN WHILE GROQ IS WORKING
   ──────────────────────────────────────────────────────── */
const SCRIPT_GEN_STEPS = [
  'Connecting to Groq LLM...',
  'Understanding your topic...',
  'Crafting the narrative arc...',
  'Building scene structure...',
  'Generating audio-visual script...',
]

/* ────────────────────────────────────────────────────────
   SHOWCASE & FEATURES (static landing content – unchanged)
   ──────────────────────────────────────────────────────── */
const SHOWCASE_ITEMS = [
  {
    id: 1,
    prompt: 'A cyberpunk city at dusk, neon reflections on rain-soaked streets, cinematic drone flyover',
    duration: '12s',
    model: 'Nexoryx v2',
    video: '/generation.mp4',
  },
  {
    id: 2,
    prompt: 'Golden hour desert landscape, ancient ruins emerging from sand, slow dolly push',
    duration: '8s',
    model: 'Nexoryx v2',
    video: '/generation1.mp4',
  },
  {
    id: 3,
    prompt: 'Underwater bioluminescent forest, ethereal particles floating, macro lens cinematic',
    duration: '15s',
    model: 'Nexoryx Pro',
    video: '/final.mp4',
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
  // Phases: idle | generating-script | review-script | generating-video | video-ready
  const [phase, setPhase] = useState('idle')

  /* ---- Script data from Groq ---- */
  const [jobId, setJobId] = useState(null)
  const [sceneData, setSceneData] = useState(null)     // JSON from Groq
  const [displayScript, setDisplayScript] = useState('') // formatted text
  const [scriptError, setScriptError] = useState(null)

  /* ---- Generation UI state ---- */
  const [genStep, setGenStep] = useState(0)
  const [genProgress, setGenProgress] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const scriptRef = useRef(null)

  /* ---- Production pipeline state ---- */
  const [consoleLog, setConsoleLog] = useState([])
  const [sceneStatuses, setSceneStatuses] = useState({})  // { scene_1: {status, videoUrl}, ... }
  const [originImageUrl, setOriginImageUrl] = useState(null)
  const [activeStep, setActiveStep] = useState('')
  const [videoProgress, setVideoProgress] = useState(0)
  const [finalVideoUrl, setFinalVideoUrl] = useState(null)
  const [pipelineError, setPipelineError] = useState(null)
  const wsRef = useRef(null)
  const chatContainerRef = useRef(null)

  /* ──────────────────────────────────────────────────────
     PHASE 1: Generate Script via Groq (real API call)
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

    // Animate progress steps while waiting
    let stepIdx = 0
    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, SCRIPT_GEN_STEPS.length - 1)
      setGenStep(stepIdx)
    }, 800)

    let prog = 0
    const progTimer = setInterval(() => {
      prog = Math.min(prog + 1, 90) // cap at 90% until real response
      setGenProgress(prog)
    }, 80)

    try {
      const res = await fetch('/api/draft-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      })

      clearInterval(stepTimer)
      clearInterval(progTimer)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate script')
      }

      const data = await res.json()
      setGenProgress(100)
      setJobId(data.job_id)
      setSceneData(data.scene_data)
      setDisplayScript(data.display_script)

      // Brief pause to show 100%
      setTimeout(() => setPhase('review-script'), 400)
    } catch (e) {
      clearInterval(stepTimer)
      clearInterval(progTimer)
      setScriptError(e.message)
      setPhase('idle')
    }
  }

  /* ──────────────────────────────────────────────────────
     PHASE 3: Production via WebSocket (real pipeline)
     ────────────────────────────────────────────────────── */
  const startVideoGeneration = useCallback(() => {
    if (!sceneData || !jobId) return
    setPhase('generating-video')
    setConsoleLog([])
    setSceneStatuses({})
    setOriginImageUrl(null)
    setActiveStep('')
    setVideoProgress(0)
    setFinalVideoUrl(null)
    setPipelineError(null)

    // Open WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/api/ws/produce`)
    wsRef.current = ws

    ws.onopen = () => {
      // Send the approved script
      ws.send(JSON.stringify({ job_id: jobId, scene_data: sceneData }))
      addConsoleMsg('→ Connected to Nexoryx Pipeline Engine...', 'system')
      addConsoleMsg('→ Script approved — sending to production...', 'system')
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handlePipelineMessage(msg)
      } catch (e) {
        console.error('WS parse error:', e)
      }
    }

    ws.onerror = () => {
      setPipelineError('WebSocket connection error. Is the backend running?')
      addConsoleMsg('✗ Connection error — check backend', 'error')
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
    }
  }, [sceneData, jobId])

  const addConsoleMsg = (text, type = 'system') => {
    setConsoleLog(prev => [...prev, { text, type, id: Date.now() + Math.random() }])
  }

  const handlePipelineMessage = (msg) => {
    const { step, status, message, progress } = msg

    // Update progress
    if (progress !== undefined) setVideoProgress(progress)
    setActiveStep(step)

    // Add to console
    if (message) {
      const type = status === 'done' ? 'done'
        : status === 'failed' ? 'error'
        : status === 'waiting' ? 'system'
        : 'render'
      addConsoleMsg(status === 'done' ? `  ✓ ${message}` : `▸ ${message}`, type)
    }

    // Handle specific steps
    if (step === 'origin_image' && status === 'done') {
      setOriginImageUrl(msg.image_url)
    }

    if (step?.startsWith('scene_') && status === 'rendering') {
      const sceneKey = step
      setSceneStatuses(prev => ({ ...prev, [sceneKey]: { status: 'rendering' } }))
    }

    if (step?.startsWith('scene_') && status === 'done') {
      const sceneKey = step
      setSceneStatuses(prev => ({
        ...prev,
        [sceneKey]: { status: 'done', videoUrl: msg.video_url }
      }))
    }

    if (step === 'final' && status === 'done') {
      setFinalVideoUrl(msg.video_url)
      setVideoProgress(100)
      addConsoleMsg('✦ Video ready — One-Take Complete!', 'final')
      setTimeout(() => setPhase('video-ready'), 1500)
    }

    if (step === 'error' || status === 'failed') {
      setPipelineError(message || 'Pipeline failed')
    }
  }

  /* ---- Auto-scroll console ---- */
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [consoleLog])

  /* ---- Cleanup WebSocket on unmount ---- */
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  /* ──────────────────────────────────────────────────────
     UI ACTIONS
     ────────────────────────────────────────────────────── */
  const resetAll = () => {
    if (wsRef.current) wsRef.current.close()
    setPhase('idle')
    setTopic('')
    setDisplayScript('')
    setSceneData(null)
    setJobId(null)
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
  }

  const goBack = () => {
    if (phase === 'review-script') {
      setPhase('idle')
    } else if (phase === 'generating-video') {
      if (wsRef.current) wsRef.current.close()
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
              <span>Groq AI Script</span>
            </div>
            <button className="yai-new-btn" onClick={resetAll}>
              <RotateCcw size={14} />
              <span>New Topic</span>
            </button>
          </div>

          {/* Topic Display */}
          <div className="yai-review__topic">
            <Sparkles size={16} />
            <h2>{topic}</h2>
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
                <h2 className="yai-script-h1">{topic}</h2>

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
                <span>{topic}</span>
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

            {/* Right: Console Log */}
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

          {/* Video Player */}
          <div className="yai-video-ready__player-wrap">
            <div className="yai-video-ready__player">
              <video
                src={finalVideoUrl}
                controls
                autoPlay
                muted
                className="yai-video-player"
                id="yai-final-video"
              />
              <div className="yai-video-ready__overlay-badge">
                <Film size={12} />
                <span>AI Generated • One-Take</span>
              </div>
            </div>

            <div className="yai-video-ready__info">
              <h3 className="yai-video-ready__topic-name">
                <Sparkles size={16} /> {topic}
              </h3>
              <p className="yai-video-ready__stats">
                {segments.length} scenes • Generated by Nexoryx Pipeline
              </p>
            </div>
          </div>

          {/* Generation Log Preview */}
          <div className="yai-video-ready__chat-preview">
            <div className="yai-chat-preview__header">
              <MessageSquare size={14} />
              <span>Generation Log</span>
            </div>
            <div className="yai-chat-preview__messages">
              {consoleLog.slice(-6).map((msg, i) => (
                <div key={i} className="yai-chat-preview__msg">
                  <p>{msg.text}</p>
                </div>
              ))}
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
          <div className="hero__badge">
            <span className="hero__badge-dot" />
            Now in Public Beta
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

        <motion.div className="prompt-bar" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          <div className="prompt-bar__wrapper">
            <input
              className="prompt-bar__input"
              type="text"
              placeholder="Enter your topic... e.g. 'Cyberpunk Heist' or 'Nike Ad'"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startPipeline()}
              autoComplete="off"
              id="hero-prompt-input"
            />
            <button className="prompt-bar__btn" onClick={startPipeline} disabled={!topic.trim()} id="hero-generate-btn">
              <Sparkles size={16} />
              <span>Generate</span>
            </button>
          </div>
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

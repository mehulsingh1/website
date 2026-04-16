import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, Play, ArrowDown, Clock, Cpu, Film,
  Layers, Bot, Clapperboard, Loader2,
  Zap, Eye, ArrowRight, ArrowLeft, Pencil,
  Download, RotateCcw, CheckCircle2, Send,
  MessageSquare, Video, Wand2
} from 'lucide-react'

/* ---- SIMULATED SCRIPT TEMPLATES ---- */
const generateScript = (topic) => {
  return `# ${topic}

## Scene 1: The Opening
A sweeping aerial shot reveals the world of "${topic}". The camera slowly descends through atmospheric haze, revealing intricate details. Dramatic orchestral score builds tension as light breaks through the clouds.

**Duration:** 4 seconds | **Camera:** Drone Descent | **Mood:** Epic, Mysterious

---

## Scene 2: The Discovery
Close-up details emerge — textures, reflections, movement. The camera traces along surfaces with macro precision. Every detail tells a story. Natural ambient sound design with subtle electronic undertones.

**Duration:** 6 seconds | **Camera:** Macro Tracking | **Mood:** Intimate, Curious

---

## Scene 3: The Journey
A dynamic montage sequence. Quick cuts between wide establishing shots and tight action moments. The rhythm builds — each cut faster than the last. Cinematic color grading shifts from cool blues to warm golds.

**Duration:** 8 seconds | **Camera:** Multi-angle Montage | **Mood:** Energetic, Bold

---

## Scene 4: The Climax
The hero moment. Everything converges — light, sound, motion. A single powerful shot that captures the essence of "${topic}". Slow motion with volumetric lighting. The score reaches its peak.

**Duration:** 5 seconds | **Camera:** Steadicam Arc | **Mood:** Powerful, Triumphant

---

## Scene 5: The Resolution
Fade to a clean, elegant composition. The brand mark appears with subtle particle effects. A quiet, confident ending. The viewer is left with a lasting impression.

**Duration:** 3 seconds | **Camera:** Static, Center Frame | **Mood:** Elegant, Confident

**Total Runtime:** ~26 seconds
**Style:** Cinematic / Premium
**Resolution:** 4K Ultra HD`
}

/* ---- SIMULATED RENDER SCENES ---- */
const RENDER_SCENES = [
  { id: 1, title: 'The Opening', desc: 'Aerial establishing shot', duration: '4s', camera: 'Drone Descent' },
  { id: 2, title: 'The Discovery', desc: 'Macro tracking details', duration: '6s', camera: 'Macro Tracking' },
  { id: 3, title: 'The Journey', desc: 'Dynamic montage sequence', duration: '8s', camera: 'Multi-angle' },
  { id: 4, title: 'The Climax', desc: 'Hero shot, volumetric light', duration: '5s', camera: 'Steadicam Arc' },
  { id: 5, title: 'The Resolution', desc: 'Brand mark composition', duration: '3s', camera: 'Static' },
]

const CONSOLE_MESSAGES = [
  { text: '→ Initializing Y AI Cinematic Engine...', type: 'system', delay: 0 },
  { text: '→ Script parsed — 5 scenes loaded', type: 'system', delay: 800 },
  { text: '▸ Rendering Scene 1 — aerial volumetrics...', type: 'render', delay: 1500 },
  { text: '  ✓ Scene 1 complete (4K HDR)', type: 'done', delay: 3200 },
  { text: '▸ Rendering Scene 2 — depth-of-field sim...', type: 'render', delay: 3800 },
  { text: '  ✓ Scene 2 complete (color graded)', type: 'done', delay: 5800 },
  { text: '▸ Rendering Scene 3 — compositing 12 cuts...', type: 'render', delay: 6400 },
  { text: '  ✓ Scene 3 complete (motion blur)', type: 'done', delay: 8600 },
  { text: '▸ Rendering Scene 4 — volumetric lighting...', type: 'render', delay: 9200 },
  { text: '  ✓ Scene 4 complete (particles active)', type: 'done', delay: 11200 },
  { text: '▸ Rendering Scene 5 — brand integration...', type: 'render', delay: 11800 },
  { text: '  ✓ Scene 5 complete', type: 'done', delay: 13200 },
  { text: '→ Stitching timeline + master grade...', type: 'system', delay: 14000 },
  { text: '→ Audio mix applied', type: 'system', delay: 15000 },
  { text: '✦ Video ready — 26s • 4K • HDR', type: 'final', delay: 16000 },
]

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

/* ---- TYPING STATUS MESSAGES ---- */
const SCRIPT_GEN_STEPS = [
  'Understanding your topic...',
  'Researching cinematic approaches...',
  'Crafting the narrative arc...',
  'Building scene structure...',
  'Finalizing your script...',
]

export default function Landing() {
  const [topic, setTopic] = useState('')
  // Phase: idle | generating-script | review-script | generating-video | video-ready
  const [phase, setPhase] = useState('idle')
  const [script, setScript] = useState('')
  const [autoMode, setAutoMode] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [consoleLog, setConsoleLog] = useState([])
  const [sceneProgress, setSceneProgress] = useState({})
  const [activeScene, setActiveScene] = useState(0)
  const [genStep, setGenStep] = useState(0)
  const [genProgress, setGenProgress] = useState(0)
  const [videoProgress, setVideoProgress] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const scriptRef = useRef(null)
  const chatContainerRef = useRef(null)
  const navigate = useNavigate()

  /* ---- Start the pipeline ---- */
  const startPipeline = () => {
    if (!topic.trim() || phase !== 'idle') return
    setPhase('generating-script')
    setGenStep(0)
    setGenProgress(0)
    setScript('')
    setAutoMode(false)
    setChatMessages([])
    setVideoProgress(0)
    setIsEditing(false)
  }

  /* ---- Script generation simulation ---- */
  useEffect(() => {
    if (phase !== 'generating-script') return

    // Step through generation status messages
    const stepInterval = setInterval(() => {
      setGenStep(prev => {
        if (prev < SCRIPT_GEN_STEPS.length - 1) return prev + 1
        return prev
      })
    }, 700)

    // Progress bar
    const progressInterval = setInterval(() => {
      setGenProgress(prev => {
        if (prev >= 100) return 100
        return prev + 2
      })
    }, 60)

    // Complete after ~3.5s
    const timer = setTimeout(() => {
      setScript(generateScript(topic))
      setPhase('review-script')
    }, 3500)

    return () => {
      clearInterval(stepInterval)
      clearInterval(progressInterval)
      clearTimeout(timer)
    }
  }, [phase, topic])

  /* ---- Auto mode: skip review ---- */
  useEffect(() => {
    if (phase === 'review-script' && autoMode) {
      const timer = setTimeout(() => {
        startVideoGeneration()
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [phase, autoMode])

  /* ---- Video generation pipeline simulation ---- */
  useEffect(() => {
    if (phase !== 'generating-video') return

    const timers = []

    // Console log messages
    CONSOLE_MESSAGES.forEach((msg, i) => {
      const t = setTimeout(() => {
        setConsoleLog(prev => [...prev, { ...msg, id: i }])
        setVideoProgress(Math.min(100, Math.round(((i + 1) / CONSOLE_MESSAGES.length) * 100)))
      }, msg.delay)
      timers.push(t)
    })

    // Scene-by-scene progress simulation
    const sceneTimings = [
      { id: 1, start: 1500, end: 3200 },
      { id: 2, start: 3800, end: 5800 },
      { id: 3, start: 6400, end: 8600 },
      { id: 4, start: 9200, end: 11200 },
      { id: 5, start: 11800, end: 13200 },
    ]

    sceneTimings.forEach(({ id, start, end }) => {
      // Start scene
      timers.push(setTimeout(() => {
        setActiveScene(id)
        setSceneProgress(prev => ({ ...prev, [id]: 0 }))
      }, start))

      // Animate progress 0->100
      const steps = 10
      const stepDuration = (end - start) / steps
      for (let s = 1; s <= steps; s++) {
        timers.push(setTimeout(() => {
          setSceneProgress(prev => ({ ...prev, [id]: s * 10 }))
        }, start + stepDuration * s))
      }

      // Complete scene
      timers.push(setTimeout(() => {
        setSceneProgress(prev => ({ ...prev, [id]: 100 }))
      }, end))
    })

    // Complete
    const finalTimer = setTimeout(() => {
      setPhase('video-ready')
    }, 17000)
    timers.push(finalTimer)

    return () => timers.forEach(clearTimeout)
  }, [phase])

  /* ---- Auto-scroll console ---- */
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [consoleLog])

  const startVideoGeneration = () => {
    setChatMessages([])
    setConsoleLog([])
    setSceneProgress({})
    setActiveScene(0)
    setVideoProgress(0)
    setPhase('generating-video')
  }

  const startAutoMode = () => {
    setAutoMode(true)
    startVideoGeneration()
  }

  const resetAll = () => {
    setPhase('idle')
    setTopic('')
    setScript('')
    setAutoMode(false)
    setChatMessages([])
    setConsoleLog([])
    setSceneProgress({})
    setActiveScene(0)
    setGenStep(0)
    setGenProgress(0)
    setVideoProgress(0)
    setIsEditing(false)
  }

  const goBack = () => {
    if (phase === 'review-script') {
      setPhase('idle')
    } else if (phase === 'generating-video') {
      setPhase('review-script')
      setChatMessages([])
      setConsoleLog([])
      setSceneProgress({})
      setActiveScene(0)
      setVideoProgress(0)
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
     PHASE: GENERATING SCRIPT
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
            Y AI is crafting your story
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
     PHASE: REVIEW SCRIPT
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
              <span>Y AI Script</span>
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

          {/* Script Content */}
          <div className="yai-review__content">
            {isEditing ? (
              <textarea
                ref={scriptRef}
                className="yai-review__editor"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                id="yai-script-editor"
              />
            ) : (
              <div className="yai-review__script">
                {script.split('\n').map((line, i) => {
                  if (line.startsWith('# ')) {
                    return <h2 key={i} className="yai-script-h1">{line.replace('# ', '')}</h2>
                  }
                  if (line.startsWith('## ')) {
                    return <h3 key={i} className="yai-script-h2">{line.replace('## ', '')}</h3>
                  }
                  if (line.startsWith('---')) {
                    return <hr key={i} className="yai-script-divider" />
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={i} className="yai-script-bold">{line.replace(/\*\*/g, '')}</p>
                  }
                  if (line.startsWith('**')) {
                    return <p key={i} className="yai-script-meta">{line.replace(/\*\*/g, '')}</p>
                  }
                  if (line.trim() === '') return <br key={i} />
                  return <p key={i} className="yai-script-line">{line}</p>
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
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
              <span>Continue</span>
              <ArrowRight size={16} />
            </button>

            <button
              className="yai-action-btn yai-action-btn--auto"
              onClick={startAutoMode}
              id="yai-auto-btn"
            >
              <Zap size={18} />
              <span>Auto Mode</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ================================================================
     PHASE: GENERATING VIDEO (Rendering Pipeline)
     ================================================================ */
  if (phase === 'generating-video') {
    const completedScenes = Object.values(sceneProgress).filter(p => p === 100).length
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
              <h3>Y AI — Rendering Pipeline</h3>
            </div>
            <div className="yai-render__stats">
              <span className="yai-render__scene-count">{completedScenes}/5 scenes</span>
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

          {/* Main Content Area */}
          <div className="yai-render__body">
            {/* Left: Scene Cards + Progress */}
            <div className="yai-render__scenes">
              <div className="yai-render__scenes-header">
                <Sparkles size={14} />
                <span>{topic}</span>
              </div>

              <div className="yai-render__scene-grid">
                {RENDER_SCENES.map((scene) => {
                  const progress = sceneProgress[scene.id] ?? -1
                  const isActive = activeScene === scene.id && progress < 100
                  const isDone = progress === 100
                  const isPending = progress === -1

                  return (
                    <motion.div
                      key={scene.id}
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
                          <span>Scene {scene.id}</span>
                        </div>
                        <span className="yai-scene-card__duration">{scene.duration}</span>
                      </div>
                      <h4 className="yai-scene-card__title">{scene.title}</h4>
                      <p className="yai-scene-card__desc">{scene.desc}</p>
                      <div className="yai-scene-card__meta">
                        <span><Cpu size={10} /> {scene.camera}</span>
                        <span>{isDone ? '4K HDR' : isActive ? 'Rendering...' : 'Queued'}</span>
                      </div>
                      {(isActive || isDone) && (
                        <div className="yai-scene-card__bar">
                          <motion.div
                            className="yai-scene-card__bar-fill"
                            animate={{ width: `${Math.max(0, progress)}%` }}
                            transition={{ duration: 0.2 }}
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
                <span className="yai-console-title">render.log</span>
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
     PHASE: VIDEO READY
     ================================================================ */
  if (phase === 'video-ready') {
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
                src="/final.mp4"
                controls
                autoPlay
                muted
                className="yai-video-player"
                id="yai-final-video"
              />
              <div className="yai-video-ready__overlay-badge">
                <Film size={12} />
                <span>4K • HDR • 24fps</span>
              </div>
            </div>

            <div className="yai-video-ready__info">
              <h3 className="yai-video-ready__topic-name">
                <Sparkles size={16} /> {topic}
              </h3>
              <p className="yai-video-ready__stats">
                5 scenes • 26 seconds • Generated by Y AI
              </p>
            </div>
          </div>

          {/* Chat History Sidebar */}
          <div className="yai-video-ready__chat-preview">
            <div className="yai-chat-preview__header">
              <MessageSquare size={14} />
              <span>Generation Log</span>
            </div>
            <div className="yai-chat-preview__messages">
              {CONSOLE_MESSAGES.slice(-5).map((msg, i) => (
                <div key={i} className="yai-chat-preview__msg">
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="yai-video-ready__actions">
            <button className="yai-action-btn yai-action-btn--download" id="yai-download-btn">
              <Download size={18} />
              <span>Download</span>
            </button>
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
              placeholder="Enter your topic... e.g. 'Premium sports watch ad'"
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

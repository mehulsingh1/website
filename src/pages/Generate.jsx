import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, Play, Wand2, Loader2, Download,
  RotateCcw, Clock, CheckCircle2, Film,
  AlertTriangle, ArrowRight, Zap, ChevronDown, BookOpen, Crown,
  Plus, X, Image, Video, ArrowLeft, Cpu, Bot, Pencil
} from 'lucide-react'
import ModelSelector, { FALLBACK_MODELS } from '../components/ModelSelector'
import { useHistory } from '../components/HistoryContext'

/* ────────────────────────────────────────────────────────
   NORMAL MODE CONSTANTS
   ──────────────────────────────────────────────────────── */
const ALL_DURATIONS = [5, 10, 15, 20, 25, 30]
const STYLES = ['Cinematic', 'Anime', 'Photorealistic']

/* ────────────────────────────────────────────────────────
   STORY MODE CONSTANTS
   ──────────────────────────────────────────────────────── */
const SCRIPT_GEN_STEPS = [
  'Initializing story engine...',
  'Analyzing your creative vision...',
  'Crafting the narrative arc...',
  'Building scene-by-scene structure...',
  'Writing cinematic descriptions...',
  'Finalizing your story script...',
]

const SIMULATED_SCRIPTS = {
  default: {
    title: '',
    origin_image_prompt: 'Cinematic establishing shot — a young man in a plaid flannel shirt sits on a rocky riverbank, peacefully eating a bowl of Maggie noodles. The river glimmers behind him in golden afternoon light. Camera slowly pushes in from overhead. Photorealistic, dramatic natural lighting.',
    segments: [
      { video_prompt: 'Close-up on the man happily slurping Maggie noodles at the river edge — steam rises from the bowl. He leans forward to look at his reflection in the water. The camera tilts slowly, river ripples distorting his image. A sense of calm before chaos. Golden-hour cinematic color grade.' },
      { video_prompt: 'Sudden mid-air tumble — the man slips on the mossy rocks, the bowl of Maggie goes flying in slow motion. His arms flail dramatically as he plummets toward the dark rushing river below. Rocky cliff face behind him, camera tracking his fall in handheld panic style. Dramatic score sting.' },
      { video_prompt: 'Underwater shock — the man sinks into the dark murky river water, bubbles erupting all around. He opens his eyes and freezes — a massive great white shark turns directly toward him, ancient black eyes locking onto his. Inches away. Extreme close-up on the shark\'s open jaws filled with jagged teeth. Dead silence, then a deep bass pulse.' },
      { video_prompt: 'Explosive underwater fight — the man summons every ounce of courage and throws a desperate punch at the shark\'s snout. Water erupts in violent white foam and bubbles. The shark thrashes wildly. Underwater camera spins in chaos. Adrenaline-charged orchestral score peaks. The man\'s knuckles meet the beast head-on.' },
      { video_prompt: 'Desperate escape — the man claws his way through the water toward the riverbank. The massive shark lunges from behind, jaws wide open, crashing through the shallows in an explosion of spray. The man\'s soaking hand grabs the muddy bank. Shark\'s teeth miss by inches. Dynamic camera push from behind. Maximum tension.' },
      { video_prompt: 'Survival — the man collapses face-down on the cracked muddy bank, gasping and trembling, completely drenched. He slowly lifts his head and looks back — the shark\'s dark fin circles silently in the water. He stares at it, eyes wide, heart pounding. Close-up on his face: wet, dirty, and barely alive. Silence. Then a slow exhale. Cut to black.' },
    ],
  },
}

const SCENE_FRAMES = [
  '/frame1.png', '/frame2.png', '/frame3.png',
  '/frame4.png', '/frame5.png', '/frame6.png',
]

const SIM_CONSOLE_MSGS = [
  { text: '→ Connected to Nexoryx Pipeline Engine...', type: 'system', delay: 0 },
  { text: '▸ Initializing Nexoryx Image model...', type: 'render', delay: 800 },
  { text: '▸ Generating origin frame — river scene with Maggie...', type: 'render', delay: 1500, step: 'origin_image_start' },
  { text: '  ✓ Origin frame generated — man at riverbank eating noodles', type: 'done', delay: 4000, step: 'origin_image_done' },
  { text: '▸ Loading Nexoryx Video pipeline...', type: 'render', delay: 5000 },
  { text: '▸ Rendering scene 1 — peaceful Maggie moment at the river...', type: 'render', delay: 6000, step: 'scene_1_start' },
  { text: '  ✓ Scene 1 complete — noodles, steam, calm before chaos', type: 'done', delay: 9000, step: 'scene_1_done' },
  { text: '▸ Rendering scene 2 — the slip, the fall, the chaos...', type: 'render', delay: 10000, step: 'scene_2_start' },
  { text: '  ✓ Scene 2 complete — man tumbling into the dark river', type: 'done', delay: 13000, step: 'scene_2_done' },
  { text: '▸ Rendering scene 3 — underwater face-off with the shark...', type: 'render', delay: 14000, step: 'scene_3_start' },
  { text: '  ✓ Scene 3 complete — eye to eye with the beast', type: 'done', delay: 17000, step: 'scene_3_done' },
  { text: '▸ Rendering scene 4 — the fight: man vs shark...', type: 'render', delay: 18000, step: 'scene_4_start' },
  { text: '  ✓ Scene 4 complete — punching the shark underwater', type: 'done', delay: 21000, step: 'scene_4_done' },
  { text: '▸ Rendering scene 5 — desperate escape from the jaws...', type: 'render', delay: 22000, step: 'scene_5_start' },
  { text: '  ✓ Scene 5 complete — clawing out of river as shark lunges', type: 'done', delay: 25000, step: 'scene_5_done' },
  { text: '▸ Rendering scene 6 — survivor collapses on the bank...', type: 'render', delay: 26000, step: 'scene_6_start' },
  { text: '  ✓ Scene 6 complete — alive, barely, staring at the shark', type: 'done', delay: 29000, step: 'scene_6_done' },
  { text: '▸ Stitching all 6 scenes via ffmpeg...', type: 'render', delay: 30000, step: 'stitching' },
  { text: '✦ Epic story complete — One-Take Maggie Madness!', type: 'final', delay: 33000, step: 'final' },
]

export default function Generate() {
  const navigate = useNavigate()
  const { addVideo } = useHistory()

  // Common UI State
  const [activeMode, setActiveMode] = useState('normal') // 'normal' | 'story'
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState(null)
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const modeDropdownRef = useRef(null)
  const fileInputRef = useRef(null)
  const promptInputRef = useRef(null)

  // Normal Mode State
  const [duration, setDuration] = useState(5)
  const [style, setStyle] = useState('Cinematic')

  // Compute allowed durations based on selected model's max_duration
  const allowedDurations = useMemo(() => {
    if (!selectedModel) return ALL_DURATIONS
    const model = FALLBACK_MODELS.find(m => m.id === selectedModel)
    const maxDur = model?.max_duration || 30
    return ALL_DURATIONS.filter(d => d <= maxDur)
  }, [selectedModel])

  // Auto-adjust duration when switching to a model that doesn't support it
  useEffect(() => {
    if (!allowedDurations.includes(duration)) {
      setDuration(allowedDurations[allowedDurations.length - 1])
    }
  }, [allowedDurations, duration])

  // Phase State (Common for routing renders)
  // idle | generating | done | error | generating-script | review-script | generating-video | video-ready
  const [phase, setPhase] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [jobId, setJobId] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  // Story Mode State
  const [storyTitle, setStoryTitle] = useState('')
  const [sceneData, setSceneData] = useState(null)
  const [displayScript, setDisplayScript] = useState('')
  const [genStep, setGenStep] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const scriptRef = useRef(null)
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

  // Auto-grow the prompt textarea to fit content instead of leaving dead space
  useEffect(() => {
    const el = promptInputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 60), 240)}px`
  }, [prompt, activeMode])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(e.target)) {
        setModeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /* ══════════════════════════════════════════════════════
     NORMAL MODE GENERATION
     ══════════════════════════════════════════════════════ */
  const startGeneration = async () => {
    if (!prompt.trim()) return
    setPhase('generating')
    setProgress(0)
    setError(null)
    setVideoUrl(null)

    try {
      const res = await fetch('/api/quick-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model_id: selectedModel, duration, style }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setJobId(data.job_id)

      // Poll for completion
      pollRef.current = setInterval(async () => {
        try {
          const sr = await fetch(`/api/job/${data.job_id}/status`)
          const status = await sr.json()
          setProgress(status.progress || 0)

          if (status.status === 'done') {
            clearInterval(pollRef.current)
            setVideoUrl(status.video_url)
            setPhase('done')
            addVideo({
              title: prompt.slice(0, 50),
              duration,
              quality: '4K',
              videoUrl: status.video_url,
            })
          } else if (status.status === 'failed') {
            clearInterval(pollRef.current)
            setError(status.error || 'Generation failed')
            setPhase('error')
          }
        } catch { /* keep polling */ }
      }, 3000)
    } catch (err) {
      setError(err.message)
      setPhase('error')
    }
  }

  /* ══════════════════════════════════════════════════════
     STORY MODE GENERATION
     ══════════════════════════════════════════════════════ */
  const startStoryPipeline = async () => {
    if (!prompt.trim() || phase !== 'idle') return
    setPhase('generating-script')
    setGenStep(0)
    setProgress(0)
    setDisplayScript('')
    setSceneData(null)
    setIsEditing(false)

    let stepIdx = 0
    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, SCRIPT_GEN_STEPS.length - 1)
      setGenStep(stepIdx)
    }, 600)

    let prog = 0
    const progTimer = setInterval(() => {
      prog = Math.min(prog + 2, 95)
      setProgress(prog)
    }, 80)

    try {
      const res = await fetch('/api/draft-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: prompt }),
      })
      const data = await res.json()
      clearInterval(stepTimer)
      clearInterval(progTimer)
      if (data.error) throw new Error(data.error)

      setProgress(100)
      setStoryTitle(prompt)
      setSceneData(data.scene_data)
      setDisplayScript(data.display_script || '')
      setTimeout(() => setPhase('review-script'), 400)
    } catch {
      clearInterval(stepTimer)
      clearInterval(progTimer)

      const simTitle = 'Shark Water Survival'
      const sim = SIMULATED_SCRIPTS.default
      const script = { ...sim, title: simTitle }
      let scriptText = `# ${simTitle}\n\n`
      scriptText += `## 🎨 Origin Frame\n${script.origin_image_prompt}\n\n`
      script.segments.forEach((seg, i) => {
        scriptText += `## 🎬 Scene ${i + 1}\n${seg.video_prompt}\n\n`
      })

      setProgress(100)
      setStoryTitle(simTitle)
      setSceneData(script)
      setDisplayScript(scriptText)
      setTimeout(() => setPhase('review-script'), 500)
    }
  }

  const addConsoleMsg = (text, type = 'system', frameUrl = null) => {
    setConsoleLog(prev => [...prev, { text, type, frameUrl, id: Date.now() + Math.random() }])
  }

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

    const totalDuration = 33000
    const timers = []

    const progTimer = setInterval(() => {
      setVideoProgress(prev => {
        if (prev >= 100) { clearInterval(progTimer); return 100 }
        return Math.min(prev + 1, 99)
      })
    }, totalDuration / 100)
    timers.push(progTimer)

    SIM_CONSOLE_MSGS.forEach((msg) => {
      const t = setTimeout(() => {
        let frameUrl = null
        if (msg.step === 'origin_image_done') {
          frameUrl = SCENE_FRAMES[0]
        } else if (msg.step?.endsWith('_done')) {
          const sceneNum = parseInt(msg.step.replace('scene_', '').replace('_done', ''))
          if (sceneNum <= SCENE_FRAMES.length) {
            frameUrl = SCENE_FRAMES[sceneNum - 1]
          }
        }
        addConsoleMsg(msg.text, msg.type, frameUrl)

        if (msg.step === 'origin_image_start') {
          setActiveStep('origin_image')
        } else if (msg.step === 'origin_image_done') {
          setOriginImageUrl(SCENE_FRAMES[0])
          setCompletedFrames(prev => [...prev, SCENE_FRAMES[0]])
        } else if (msg.step?.endsWith('_start')) {
          const sceneNum = msg.step.replace('scene_', '').replace('_start', '')
          setActiveStep(`scene_${sceneNum}`)
          setSceneStatuses(prev => ({ ...prev, [`scene_${sceneNum}`]: { status: 'rendering' } }))
        } else if (msg.step?.endsWith('_done')) {
          const sceneNum = msg.step.replace('scene_', '').replace('_done', '')
          setSceneStatuses(prev => ({ ...prev, [`scene_${sceneNum}`]: { status: 'done' } }))
          if (parseInt(sceneNum) <= SCENE_FRAMES.length) {
            setCompletedFrames(prev => [...prev, SCENE_FRAMES[parseInt(sceneNum) - 1]])
          }
        } else if (msg.step === 'stitching') {
          setActiveStep('stitching')
        } else if (msg.step === 'final') {
          setVideoProgress(100)
          clearInterval(progTimer)
          setFinalVideoUrl('/nexoryx_generation.mp4')
          setTimeout(() => setPhase('video-ready'), 1500)
        }
      }, msg.delay)
      timers.push(t)
    })
    simTimersRef.current = timers
  }, [sceneData])

  /* ══════════════════════════════════════════════════════
     COMMON ACTIONS & CLEANUP
     ══════════════════════════════════════════════════════ */
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      simTimersRef.current.forEach(t => clearTimeout(t))
    }
  }, [])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [consoleLog])

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    const newFiles = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      type: file.type.startsWith('video/') ? 'video' : 'image',
      id: Date.now() + Math.random(),
    }))
    setUploadedFiles(prev => [...prev, ...newFiles])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (id) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file) URL.revokeObjectURL(file.url)
      return prev.filter(f => f.id !== id)
    })
  }

  const resetAll = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    simTimersRef.current.forEach(t => clearTimeout(t))
    setPhase('idle')
    setPrompt('')
    setProgress(0)
    setVideoUrl(null)
    setError(null)
    setJobId(null)
    uploadedFiles.forEach(f => URL.revokeObjectURL(f.url))
    setUploadedFiles([])

    // Story mode resets
    setStoryTitle('')
    setDisplayScript('')
    setSceneData(null)
    setConsoleLog([])
    setSceneStatuses({})
    setOriginImageUrl(null)
    setActiveStep('')
    setVideoProgress(0)
    setFinalVideoUrl(null)
    setPipelineError(null)
    setGenStep(0)
    setIsEditing(false)
  }

  const goBack = () => {
    if (phase === 'review-script') setPhase('idle')
    else if (phase === 'generating-video') {
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
    if (!isEditing) setTimeout(() => scriptRef.current?.focus(), 100)
  }

  /* ══════════════════════════════════════════════════════
     RENDER: GENERATING (Normal Mode)
     ══════════════════════════════════════════════════════ */
  if (phase === 'generating') {
    return (
      <div className="qs-page">
        <div className="qs-container">
          <motion.div className="qs-generating glass-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <motion.div className="qs-gen-icon" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}>
              <Wand2 size={36} />
            </motion.div>
            <h2 className="qs-gen-title">Generating your video</h2>
            <p className="qs-gen-prompt"><Sparkles size={14} /> {prompt}</p>
            <div className="qs-gen-progress">
              <div className="qs-gen-progress__track">
                <motion.div className="qs-gen-progress__fill" animate={{ width: `${Math.max(progress, 5)}%` }} transition={{ duration: 0.4 }} />
              </div>
              <span className="qs-gen-progress__pct">{progress}%</span>
            </div>
            <p className="qs-gen-meta">
              <Film size={14} /> Model: {selectedModel} • Style: {style} • {duration}s
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════
     RENDER: DONE (Normal Mode)
     ══════════════════════════════════════════════════════ */
  if (phase === 'done' && videoUrl) {
    return (
      <div className="qs-page">
        <div className="qs-container">
          <motion.div className="qs-done glass-panel" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="qs-done__badge">
              <CheckCircle2 size={14} />
              <span>Video Ready</span>
            </div>
            <div className="qs-done__player">
              <video src={videoUrl} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <h3 className="qs-done__title"><Sparkles size={16} /> {prompt.slice(0, 60)}</h3>
            <p className="qs-done__meta">{duration}s • {style} • {selectedModel}</p>
            <div className="qs-done__actions">
              <a href={videoUrl} download="nexoryx_quick.mp4" className="qs-action-btn qs-action-btn--download">
                <Download size={18} /> Download
              </a>
              <button className="qs-action-btn qs-action-btn--history" onClick={() => navigate('/history')}>
                <Film size={18} /> View History
              </button>
              <button className="qs-action-btn qs-action-btn--new" onClick={resetAll}>
                <RotateCcw size={18} /> New Video
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════
     RENDER: ERROR (Normal Mode)
     ══════════════════════════════════════════════════════ */
  if (phase === 'error') {
    return (
      <div className="qs-page">
        <div className="qs-container">
          <motion.div className="qs-error glass-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AlertTriangle size={32} />
            <h3>Generation Failed</h3>
            <p>{error}</p>
            <button className="qs-action-btn qs-action-btn--new" onClick={resetAll}>
              <RotateCcw size={18} /> Try Again
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════
     RENDER: STORY MODE PIPELINE PHASES
     ══════════════════════════════════════════════════════ */
  if (phase === 'generating-script') {
    return (
      <div className="yai-overlay">
        <div className="yai-generating">
          <motion.div className="yai-gen-icon" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}><Wand2 size={36} /></motion.div>
          <div className="yai-gen-pulse" />
          <motion.h2 className="yai-gen-title" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>Nexoryx is drafting your cinematic script</motion.h2>
          <p className="yai-gen-topic"><Sparkles size={14} /> {prompt}</p>
          <div className="yai-gen-progress">
            <div className="yai-gen-progress__track">
              <motion.div className="yai-gen-progress__fill" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
            </div>
            <span className="yai-gen-progress__pct">{progress}%</span>
          </div>
          <div className="yai-gen-steps">
            <AnimatePresence mode="wait">
              <motion.p key={genStep} className="yai-gen-step" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                <Cpu size={14} /> {SCRIPT_GEN_STEPS[genStep]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'review-script') {
    return (
      <div className="yai-overlay">
        <div className="yai-review">
          <div className="yai-review__header">
            <button className="yai-back-btn" onClick={goBack}><ArrowLeft size={18} /><span>Back</span></button>
            <div className="yai-review__badge"><Bot size={14} /><span>Nexoryx AI Story Script</span></div>
            <button className="yai-new-btn" onClick={resetAll}><RotateCcw size={14} /><span>New Story</span></button>
          </div>
          <div className="yai-review__topic"><Sparkles size={16} /><h2>{storyTitle}</h2></div>
          <div className="yai-review__content">
            {isEditing ? (
              <textarea ref={scriptRef} className="yai-review__editor" value={displayScript} onChange={(e) => setDisplayScript(e.target.value)} />
            ) : (
              <div className="yai-review__script">
                <h2 className="yai-script-h1">{storyTitle}</h2>
                <div className="yai-script-section"><h3 className="yai-script-h2">🎨 Origin Frame</h3><p className="yai-script-line">{sceneData?.origin_image_prompt}</p></div>
                <hr className="yai-script-divider" />
                {sceneData?.segments?.map((seg, i) => (
                  <div key={i}><h3 className="yai-script-h2">🎬 Scene {i + 1} — Motion & Audio</h3><p className="yai-script-line">{seg.video_prompt}</p>{i < sceneData.segments.length - 1 && <hr className="yai-script-divider" />}</div>
                ))}
                <hr className="yai-script-divider" />
                <p className="yai-script-meta">Total Segments: {sceneData?.segments?.length}</p>
                <p className="yai-script-meta">Pipeline: Nexoryx Image → Nexoryx Video → ffmpeg stitch</p>
              </div>
            )}
          </div>
          <div className="yai-review__actions">
            <button className={`yai-action-btn yai-action-btn--edit ${isEditing ? 'yai-action-btn--active' : ''}`} onClick={toggleEdit}>
              {isEditing ? <CheckCircle2 size={18} /> : <Pencil size={18} />}<span>{isEditing ? 'Done Editing' : 'Edit Script'}</span>
            </button>
            <button className="yai-action-btn yai-action-btn--continue" onClick={startVideoGeneration}>
              <Play size={18} /><span>Approve & Shoot</span><ArrowRight size={16} />
            </button>
            <button className="yai-action-btn yai-action-btn--auto" onClick={resetAll}>
              <RotateCcw size={18} /><span>Discard & Rewrite</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'generating-video') {
    const segments = sceneData?.segments || []
    const totalScenes = segments.length
    const completedScenes = Object.values(sceneStatuses).filter(s => s.status === 'done').length

    return (
      <div className="yai-overlay">
        <div className="yai-render">
          <div className="yai-render__header">
            <button className="yai-back-btn" onClick={goBack}><ArrowLeft size={18} /><span>Back</span></button>
            <div className="yai-render__title-group"><Film size={16} /><h3>Nexoryx — Live Production Pipeline</h3></div>
            <div className="yai-render__stats">
              <span className="yai-render__scene-count">{completedScenes}/{totalScenes} scenes</span>
              <div className="yai-render__pct-badge">
                {videoProgress < 100 ? <Loader2 size={14} className="spinning" /> : <CheckCircle2 size={14} />}
                <span>{videoProgress}%</span>
              </div>
            </div>
          </div>
          <div className="yai-render__progress-bar"><motion.div className="yai-render__progress-fill" animate={{ width: `${videoProgress}%` }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} /></div>
          {pipelineError && (
            <div className="yai-render__error"><AlertTriangle size={16} /><span>{pipelineError}</span><button onClick={resetAll}>Reset</button></div>
          )}
          <div className="yai-render__body">
            <div className="yai-render__scenes">
              <div className="yai-render__scenes-header"><Sparkles size={14} /><span>{storyTitle}</span></div>
              <div className={`yai-scene-card ${activeStep === 'origin_image' ? 'yai-scene-card--active' : ''} ${originImageUrl ? 'yai-scene-card--done' : ''}`}>
                <div className="yai-scene-card__top">
                  <div className="yai-scene-card__number">{originImageUrl ? <CheckCircle2 size={14} /> : activeStep === 'origin_image' ? <Loader2 size={14} className="spinning" /> : <Film size={14} />}<span>Origin Frame</span></div>
                  <span className="yai-scene-card__duration">Image</span>
                </div>
                <h4 className="yai-scene-card__title">Anchor Image</h4>
                <p className="yai-scene-card__desc">{sceneData?.origin_image_prompt?.substring(0, 80)}...</p>
                <div className="yai-scene-card__meta"><span><Cpu size={10} /> Nexoryx AI</span><span>{originImageUrl ? 'Complete' : activeStep === 'origin_image' ? 'Generating...' : 'Queued'}</span></div>
                {(activeStep === 'origin_image' || originImageUrl) && (
                  <div className="yai-scene-card__bar"><motion.div className="yai-scene-card__bar-fill" animate={{ width: originImageUrl ? '100%' : '50%' }} transition={{ duration: 0.3 }} /></div>
                )}
              </div>
              <div className="yai-render__scene-grid">
                {segments.map((seg, i) => {
                  const sceneKey = `scene_${i + 1}`
                  const sceneStatus = sceneStatuses[sceneKey]
                  const isActive = activeStep === sceneKey && sceneStatus?.status !== 'done'
                  const isDone = sceneStatus?.status === 'done'
                  const isPending = !sceneStatus
                  return (
                    <motion.div key={sceneKey} className={`yai-scene-card ${isActive ? 'yai-scene-card--active' : ''} ${isDone ? 'yai-scene-card--done' : ''}`} initial={{ opacity: 0.5, scale: 0.98 }} animate={{ opacity: isPending ? 0.4 : 1, scale: isActive ? 1.02 : 1 }} transition={{ duration: 0.3 }}>
                      <div className="yai-scene-card__top">
                        <div className="yai-scene-card__number">{isDone ? <CheckCircle2 size={14} /> : isActive ? <Loader2 size={14} className="spinning" /> : <Film size={14} />}<span>Scene {i + 1}</span></div>
                        <span className="yai-scene-card__duration">Nexoryx Video</span>
                      </div>
                      <h4 className="yai-scene-card__title">{['Maggie at River', 'The Fall', 'Shark Encounter', 'The Fight', 'Desperate Escape', 'Survived'][i] || `Scene ${i + 1}`}</h4>
                      <p className="yai-scene-card__desc">{seg.video_prompt.substring(0, 80)}...</p>
                      <div className="yai-scene-card__meta"><span><Cpu size={10} /> Nexoryx AI</span><span>{isDone ? 'Complete' : isActive ? 'Rendering...' : 'Queued'}</span></div>
                      {(isActive || isDone) && (
                        <div className="yai-scene-card__bar"><motion.div className="yai-scene-card__bar-fill" animate={{ width: isDone ? '100%' : '50%' }} transition={{ duration: 0.3 }} /></div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
            <div className="yai-render__console">
              <div className="yai-render__console-header"><div className="yai-console-dots"><span /><span /><span /></div><span className="yai-console-title">pipeline.log</span></div>
              <div className="yai-render__console-body" ref={chatContainerRef}>
                <AnimatePresence>
                  {consoleLog.map((msg) => (
                    <motion.div key={msg.id} className={`yai-console-line yai-console-line--${msg.type}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                      <span className="yai-console-line__text">{msg.text}</span>
                      {msg.frameUrl && (
                        <motion.img src={msg.frameUrl} alt="Generated frame" className="yai-console-frame" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 80 }} transition={{ duration: 0.5, delay: 0.2 }} />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {videoProgress < 100 && (<div className="yai-console-cursor"><span className="yai-console-cursor__blink">▋</span></div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'video-ready') {
    const segments = sceneData?.segments || []
    return (
      <div className="yai-overlay">
        <div className="yai-video-ready">
          <div className="yai-video-ready__header">
            <button className="yai-back-btn" onClick={goBack}><ArrowLeft size={18} /><span>Back to Script</span></button>
            <div className="yai-video-ready__badge"><CheckCircle2 size={14} /><span>Video Complete</span></div>
            <button className="yai-new-btn" onClick={resetAll}><RotateCcw size={14} /><span>New Story</span></button>
          </div>
          <div className="yai-video-ready__player-wrap">
            <div className="yai-video-ready__player" style={{ position: 'relative', width: '100%', maxWidth: '900px', margin: '0 auto', aspectRatio: '16/9', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
              <video src={finalVideoUrl} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              <div className="yai-video-ready__overlay-badge"><Film size={12} /><span>AI Generated • Story Mode</span></div>
            </div>
            <div className="yai-video-ready__info">
              <h3 className="yai-video-ready__topic-name"><Sparkles size={16} /> {storyTitle}</h3>
              <p className="yai-video-ready__stats">{segments.length} scenes • Generated by Nexoryx Story Pipeline</p>
            </div>
          </div>
          <div className="yai-video-ready__actions">
            <a href={finalVideoUrl} download="nexoryx_story.mp4" className="yai-action-btn yai-action-btn--download"><Download size={18} /><span>Download</span></a>
            <button className="yai-action-btn yai-action-btn--architect" onClick={() => navigate('/architect')}><Pencil size={18} /><span>Edit in Architect</span></button>
            <button className="yai-action-btn yai-action-btn--new" onClick={resetAll}><RotateCcw size={18} /><span>New Story</span></button>
          </div>
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════
     RENDER: IDLE — Main Generation Form (Shared)
     ══════════════════════════════════════════════════════ */
  return (
    <div className="qs-page" data-mode={activeMode}>
      <div className="qs-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>

          {/* Header */}
          <div className="qs-header">
            <div className="qs-header__badge">
              {activeMode === 'story' ? <BookOpen size={14} /> : <Sparkles size={14} />}
              {activeMode === 'story' ? 'STORY BOARD (PRO)' : 'QUICK GENERATE'}
            </div>
            <h1 className="qs-header__title">
              {activeMode === 'story' ? (
                <span className="qs-header__title--story">
                  Epic Story. Watch it Unfold.
                </span>
              ) : (
                <>One Prompt. <span className="qs-header__accent">One Video.</span></>
              )}
            </h1>
            <p className="qs-header__sub">
              {activeMode === 'story'
                ? 'Enter a topic and our AI will write a cinematic story, then generate a full video scene-by-scene — all automatically.'
                : 'Skip the storyboard — go straight from text to a stunning AI-generated video.'}
            </p>
          </div>

          {/* Uploaded Files Preview */}
          {uploadedFiles.length > 0 && (
            <div className="qs-uploads">
              <AnimatePresence>
                {uploadedFiles.map((f) => (
                  <motion.div
                    key={f.id}
                    className="qs-upload-thumb"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {f.type === 'video' ? (
                      <video src={f.url} className="qs-upload-thumb__media" muted />
                    ) : (
                      <img src={f.url} alt={f.name} className="qs-upload-thumb__media" />
                    )}
                    <span className="qs-upload-thumb__type">
                      {f.type === 'video' ? <Video size={10} /> : <Image size={10} />}
                    </span>
                    <button className="qs-upload-thumb__remove" onClick={() => removeFile(f.id)}>
                      <X size={12} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Prompt */}
          <div className="qs-prompt glass-panel">
            <div className="qs-prompt__wrapper">
              <div className="qs-prompt__upload-area">
                <button
                  className="qs-prompt__upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload images or videos"
                  id="qs-upload-btn"
                >
                  <Plus size={20} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileUpload}
                />
              </div>
              <textarea
                ref={promptInputRef}
                className="qs-prompt__input"
                placeholder={activeMode === 'story'
                  ? "Enter your story topic... e.g. 'A heist in neon Tokyo' or 'Time traveler's last day'"
                  : "Describe your video... e.g. 'A golden retriever running through a field of sunflowers at sunset'"}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={1}
                id="qs-prompt-input"
              />
              <div className="qs-mode-toggle" ref={modeDropdownRef}>
                <button
                  className="qs-mode-toggle__btn"
                  onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
                  title="Switch mode"
                  id="qs-mode-toggle-btn"
                  style={{
                    background: activeMode === 'story' ? 'rgba(245, 158, 11, 0.1)' : undefined,
                    color: activeMode === 'story' ? '#f59e0b' : undefined,
                    borderColor: activeMode === 'story' ? 'rgba(245, 158, 11, 0.3)' : undefined
                  }}
                >
                  {activeMode === 'story' ? <BookOpen size={18} /> : <Zap size={18} />}
                  <ChevronDown size={14} className={`qs-mode-toggle__chevron ${modeDropdownOpen ? 'qs-mode-toggle__chevron--open' : ''}`} />
                </button>
                <AnimatePresence>
                  {modeDropdownOpen && (
                    <motion.div
                      className="qs-mode-dropdown"
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      <button
                        className={`qs-mode-dropdown__item ${activeMode === 'normal' ? 'qs-mode-dropdown__item--active' : ''}`}
                        onClick={() => {
                          setActiveMode('normal')
                          setModeDropdownOpen(false)
                        }}
                        id="qs-mode-normal"
                      >
                        <div className="qs-mode-dropdown__icon qs-mode-dropdown__icon--normal">
                          <Zap size={16} />
                        </div>
                        <div className="qs-mode-dropdown__text">
                          <span className="qs-mode-dropdown__name">Normal</span>
                          <span className="qs-mode-dropdown__desc">Quick single-clip generation</span>
                        </div>
                      </button>
                      <button
                        className={`qs-mode-dropdown__item ${activeMode === 'story' ? 'qs-mode-dropdown__item--active' : ''}`}
                        onClick={() => {
                          setActiveMode('story')
                          setModeDropdownOpen(false)
                        }}
                        id="qs-mode-story"
                        style={{ background: activeMode === 'story' ? 'rgba(245, 158, 11, 0.1)' : undefined, border: activeMode === 'story' ? '1px solid rgba(245, 158, 11, 0.3)' : undefined }}
                      >
                        <div className="qs-mode-dropdown__icon qs-mode-dropdown__icon--story">
                          <BookOpen size={16} />
                        </div>
                        <div className="qs-mode-dropdown__text">
                          <span className="qs-mode-dropdown__name">
                            Story Mode
                            <span className="qs-mode-premium-badge"><Crown size={10} /> PRO</span>
                          </span>
                          <span className="qs-mode-dropdown__desc">AI writes a story, then generates video</span>
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Controls Row — Normal Mode only */}
          {activeMode === 'normal' && (
            <div className="qs-controls">
              <div className="qs-control-group">
                <label className="qs-control-label"><Clock size={12} /> Duration</label>
                <div className="qs-pills">
                  {allowedDurations.map(d => (
                    <button key={d} className={`qs-pill ${duration === d ? 'qs-pill--active' : ''}`} onClick={() => setDuration(d)}>{d}s</button>
                  ))}
                </div>
              </div>
              <div className="qs-control-group">
                <label className="qs-control-label"><Wand2 size={12} /> Style</label>
                <div className="qs-pills">
                  {STYLES.map(s => (
                    <button key={s} className={`qs-pill ${style === s ? 'qs-pill--active' : ''}`} onClick={() => setStyle(s)}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Model Selector — Normal Mode only */}
          {activeMode === 'normal' && (
            <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} mode="full" />
          )}


          {/* Generate Button */}
          <button
            className="qs-generate-btn"
            onClick={activeMode === 'story' ? startStoryPipeline : startGeneration}
            disabled={!prompt.trim()}
            id="qs-generate-btn"
          >
            <Sparkles size={18} />
            <span>{activeMode === 'story' ? 'Launch Story Pipeline' : 'Generate Video'}</span>
            <ArrowRight size={16} />
          </button>

        </motion.div>
      </div>
    </div>
  )
}

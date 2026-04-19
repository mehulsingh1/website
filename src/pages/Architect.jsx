import { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft, Download, Play, Pause, Save, CheckCircle2, Loader2,
  Trash2, Clock, RefreshCw, Film, Plus, Camera, Type, Wand2,
  Volume2, VolumeX, Maximize2, SkipBack, SkipForward,
  ChevronLeft, ChevronRight, Layers, Sparkles, Settings,
  Copy, Move, Palette
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useHistory } from '../components/HistoryContext'

const MOCK_VIDEOS = [
  "/generation.mp4",
  "/generation1.mp4",
  "/final.mp4",
]

const CAMERA_OPTIONS = ['Drone Descent', 'Macro Tracking', 'Multi-angle', 'Steadicam Arc', 'Static', 'Dolly Push', 'Handheld', 'Crane Shot']
const STYLE_OPTIONS = ['Cinematic', 'Documentary', 'Commercial', 'Music Video', 'Narrative', 'Abstract']
const MOOD_OPTIONS = ['Dramatic', 'Uplifting', 'Mysterious', 'Energetic', 'Calm', 'Intense']

const DEFAULT_SCENES = [
  {
    id: 1,
    title: 'The Opening',
    prompt: 'Wide aerial establishing shot — the product emerges from shadow into dramatic rim lighting with atmospheric volumetrics.',
    duration: 4,
    camera: 'Drone Descent',
    style: 'Cinematic',
    mood: 'Dramatic',
  },
  {
    id: 2,
    title: 'The Discovery',
    prompt: 'Macro tracking sequence revealing intricate details. Shallow depth-of-field creates an intimate, premium feel.',
    duration: 6,
    camera: 'Macro Tracking',
    style: 'Commercial',
    mood: 'Mysterious',
  },
  {
    id: 3,
    title: 'The Journey',
    prompt: 'Dynamic montage with quick cuts between multiple angles. Motion blur and grain add texture and energy to the sequence.',
    duration: 8,
    camera: 'Multi-angle',
    style: 'Music Video',
    mood: 'Energetic',
  },
  {
    id: 4,
    title: 'The Climax',
    prompt: 'Hero shot with volumetric lighting and slow motion. The score reaches its peak as the product commands the frame.',
    duration: 5,
    camera: 'Steadicam Arc',
    style: 'Cinematic',
    mood: 'Intense',
  },
  {
    id: 5,
    title: 'The Resolution',
    prompt: 'Clean, elegant composition. The brand mark appears with subtle particle effects. A confident, lasting impression.',
    duration: 3,
    camera: 'Static',
    style: 'Commercial',
    mood: 'Calm',
  },
]

export default function Architect() {
  const navigate = useNavigate()
  const { addVideo } = useHistory()
  const videoRef = useRef(null)
  const timelineRef = useRef(null)

  const [projectTitle, setProjectTitle] = useState('Cinematic Product Showcase')
  const [scenes, setScenes] = useState(DEFAULT_SCENES)
  const [selectedId, setSelectedId] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [regeneratingIds, setRegeneratingIds] = useState([])
  const [isCompiling, setIsCompiling] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)

  const selectedScene = scenes.find(s => s.id === selectedId) || scenes[0]
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0)
  const selectedIndex = scenes.findIndex(s => s.id === selectedId)
  const videoUrl = MOCK_VIDEOS[(selectedScene.id - 1) % MOCK_VIDEOS.length]

  /* ---- Video controls ---- */
  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => setCurrentTime(v.currentTime)
    const onDur = () => setVideoDuration(v.duration)
    const onEnd = () => setIsPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onDur)
    v.addEventListener('ended', onEnd)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onDur)
      v.removeEventListener('ended', onEnd)
    }
  }, [selectedId])

  /* ---- Scene navigation ---- */
  const selectPrev = () => {
    if (selectedIndex > 0) {
      setSelectedId(scenes[selectedIndex - 1].id)
      setIsPlaying(false)
    }
  }

  const selectNext = () => {
    if (selectedIndex < scenes.length - 1) {
      setSelectedId(scenes[selectedIndex + 1].id)
      setIsPlaying(false)
    }
  }

  /* ---- Actions ---- */
  const handleSave = () => {
    setSaveStatus('saving')
    setTimeout(() => {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    }, 1200)
  }

  const handleRegenerate = (id) => {
    setRegeneratingIds(prev => [...prev, id])
    setTimeout(() => {
      setRegeneratingIds(prev => prev.filter(r => r !== id))
    }, 2500)
  }

  const handleCompile = () => {
    setIsCompiling(true)
    setTimeout(() => {
      setIsCompiling(false)
      addVideo({
        title: projectTitle || 'Cinematic Creation',
        duration: totalDuration,
        quality: '4K',
        videoUrl: videoUrl, // Save the currently playing full "mock" sequence
      })
      navigate('/history')
    }, 3000)
  }

  const updateScene = (id, updates) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const addScene = (afterIndex) => {
    const newId = Math.max(...scenes.map(s => s.id), 0) + 1
    const newScene = {
      id: newId,
      title: `Scene ${scenes.length + 1}`,
      prompt: '',
      duration: 5,
      camera: 'Static',
      style: 'Cinematic',
      mood: 'Dramatic',
    }
    setScenes(prev => {
      const copy = [...prev]
      copy.splice(afterIndex + 1, 0, newScene)
      return copy
    })
    setSelectedId(newId)
  }

  const deleteScene = (id) => {
    if (scenes.length <= 1) return
    setScenes(prev => {
      const remaining = prev.filter(s => s.id !== id)
      if (id === selectedId) {
        setSelectedId(remaining[0].id)
      }
      return remaining
    })
  }

  const duplicateScene = (id) => {
    const source = scenes.find(s => s.id === id)
    if (!source) return
    const newId = Math.max(...scenes.map(s => s.id), 0) + 1
    const idx = scenes.findIndex(s => s.id === id)
    const dup = { ...source, id: newId, title: `${source.title} (Copy)` }
    setScenes(prev => {
      const copy = [...prev]
      copy.splice(idx + 1, 0, dup)
      return copy
    })
    setSelectedId(newId)
  }

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const isRegenerating = regeneratingIds.includes(selectedScene.id)

  return (
    <div className="arch-editor">
      {/* ==================== HEADER ==================== */}
      <header className="arch-header">
        <div className="arch-header__left">
          <button className="arch-header__back" onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
          </button>
          <div className="arch-header__meta">
            <span className="arch-header__badge">
              <Layers size={10} /> Y AI ARCHITECT
            </span>
            <input
              className="arch-header__title-input"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>
        <div className="arch-header__right">
          <span className="arch-header__info">
            {scenes.length} scenes • ~{totalDuration}s
          </span>
          <button
            className={`arch-btn arch-btn--save ${saveStatus === 'saved' ? 'arch-btn--success' : ''}`}
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? <Loader2 size={14} className="spinning" /> : saveStatus === 'saved' ? <CheckCircle2 size={14} /> : <Save size={14} />}
            <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}</span>
          </button>
          <button
            className={`arch-btn arch-btn--compile ${isCompiling ? 'arch-btn--loading' : ''}`}
            onClick={handleCompile}
            disabled={isCompiling}
          >
            {isCompiling ? <Loader2 size={14} className="spinning" /> : <Download size={14} />}
            <span>{isCompiling ? 'Compiling...' : 'Export'}</span>
          </button>
        </div>
      </header>

      {/* ==================== MAIN WORKSPACE ==================== */}
      <div className="arch-workspace">

        {/* ---- LEFT: Video Preview ---- */}
        <div className="arch-preview">
          <div className="arch-preview__player-wrap">
            {isRegenerating ? (
              <div className="arch-preview__loading">
                <Loader2 size={40} className="spinning" />
                <span>Regenerating scene...</span>
              </div>
            ) : (
              <video
                ref={videoRef}
                key={selectedScene.id}
                src={videoUrl}
                className="arch-preview__video"
                muted={isMuted}
                onClick={togglePlay}
              />
            )}

            {/* Overlay: scene badge */}
            <div className="arch-preview__scene-badge">
              <Film size={12} />
              <span>Scene {selectedIndex + 1} / {scenes.length}</span>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="arch-preview__controls">
            <div className="arch-transport">
              <button className="arch-transport__btn" onClick={selectPrev} disabled={selectedIndex === 0} title="Previous Scene">
                <SkipBack size={16} />
              </button>
              <button className="arch-transport__play" onClick={togglePlay}>
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button className="arch-transport__btn" onClick={selectNext} disabled={selectedIndex === scenes.length - 1} title="Next Scene">
                <SkipForward size={16} />
              </button>
            </div>

            <div className="arch-scrubber">
              <span className="arch-scrubber__time">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={videoDuration || 100}
                value={currentTime}
                onChange={(e) => { if (videoRef.current) videoRef.current.currentTime = e.target.value }}
                className="arch-scrubber__bar"
              />
              <span className="arch-scrubber__time">{formatTime(videoDuration)}</span>
            </div>

            <div className="arch-preview__extra-controls">
              <button className="arch-transport__btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* ---- RIGHT: Scene Inspector ---- */}
        <div className="arch-inspector">
          <div className="arch-inspector__header">
            <h3 className="arch-inspector__title">
              <Settings size={14} />
              Scene Inspector
            </h3>
            <div className="arch-inspector__actions">
              <button className="arch-icon-btn" onClick={() => duplicateScene(selectedScene.id)} title="Duplicate">
                <Copy size={14} />
              </button>
              <button className="arch-icon-btn arch-icon-btn--danger" onClick={() => deleteScene(selectedScene.id)} title="Delete" disabled={scenes.length <= 1}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="arch-inspector__body">
            {/* Scene Title */}
            <div className="arch-field">
              <label className="arch-field__label">
                <Type size={12} /> Title
              </label>
              <input
                className="arch-field__input"
                value={selectedScene.title}
                onChange={(e) => updateScene(selectedScene.id, { title: e.target.value })}
                placeholder="Scene title..."
              />
            </div>

            {/* Scene Prompt */}
            <div className="arch-field">
              <label className="arch-field__label">
                <Wand2 size={12} /> Scene Prompt
              </label>
              <textarea
                className="arch-field__textarea"
                value={selectedScene.prompt}
                onChange={(e) => updateScene(selectedScene.id, { prompt: e.target.value })}
                placeholder="Describe the cinematic action..."
                rows={4}
              />
            </div>

            {/* Duration */}
            <div className="arch-field">
              <label className="arch-field__label">
                <Clock size={12} /> Duration
              </label>
              <div className="arch-field__row">
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={selectedScene.duration}
                  onChange={(e) => updateScene(selectedScene.id, { duration: parseInt(e.target.value) })}
                  className="arch-field__slider"
                />
                <span className="arch-field__value">{selectedScene.duration}s</span>
              </div>
            </div>

            {/* Camera */}
            <div className="arch-field">
              <label className="arch-field__label">
                <Camera size={12} /> Camera Move
              </label>
              <select
                className="arch-field__select"
                value={selectedScene.camera}
                onChange={(e) => updateScene(selectedScene.id, { camera: e.target.value })}
              >
                {CAMERA_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Style */}
            <div className="arch-field">
              <label className="arch-field__label">
                <Palette size={12} /> Style
              </label>
              <div className="arch-field__chips">
                {STYLE_OPTIONS.map(s => (
                  <button
                    key={s}
                    className={`arch-chip ${selectedScene.style === s ? 'arch-chip--active' : ''}`}
                    onClick={() => updateScene(selectedScene.id, { style: s })}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood */}
            <div className="arch-field">
              <label className="arch-field__label">
                <Sparkles size={12} /> Mood
              </label>
              <div className="arch-field__chips">
                {MOOD_OPTIONS.map(m => (
                  <button
                    key={m}
                    className={`arch-chip ${selectedScene.mood === m ? 'arch-chip--active' : ''}`}
                    onClick={() => updateScene(selectedScene.id, { mood: m })}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Regenerate */}
            <button
              className={`arch-btn-regen ${isRegenerating ? 'arch-btn-regen--loading' : ''}`}
              onClick={() => handleRegenerate(selectedScene.id)}
              disabled={isRegenerating}
            >
              <RefreshCw size={16} className={isRegenerating ? 'spinning' : ''} />
              <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Scene'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================== TIMELINE STRIP ==================== */}
      <div className="arch-timeline">
        <div className="arch-timeline__header">
          <div className="arch-timeline__label">
            <Film size={12} />
            <span>Timeline</span>
          </div>
          <span className="arch-timeline__duration">Total: {totalDuration}s</span>
        </div>

        <div className="arch-timeline__strip" ref={timelineRef}>
          {scenes.map((scene, idx) => {
            const isSelected = scene.id === selectedId
            const isRegen = regeneratingIds.includes(scene.id)

            return (
              <div key={scene.id} className="arch-timeline__item-wrap">
                <motion.button
                  className={`arch-tl-card ${isSelected ? 'arch-tl-card--active' : ''} ${isRegen ? 'arch-tl-card--regen' : ''}`}
                  onClick={() => { setSelectedId(scene.id); setIsPlaying(false) }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  layout
                >
                  <div className="arch-tl-card__thumb">
                    {isRegen ? (
                      <Loader2 size={16} className="spinning" />
                    ) : (
                      <Film size={16} />
                    )}
                  </div>
                  <div className="arch-tl-card__info">
                    <span className="arch-tl-card__num">S{idx + 1}</span>
                    <span className="arch-tl-card__name">{scene.title}</span>
                    <span className="arch-tl-card__dur">{scene.duration}s</span>
                  </div>
                  {isSelected && <div className="arch-tl-card__indicator" />}
                </motion.button>

                {/* Add button between scenes */}
                <button className="arch-timeline__add" onClick={() => addScene(idx)} title="Insert scene">
                  <Plus size={12} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

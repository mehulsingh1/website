import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, Play, Wand2, Loader2, Download,
  RotateCcw, Clock, CheckCircle2, Film,
  AlertTriangle, ArrowRight
} from 'lucide-react'
import ModelSelector from '../components/ModelSelector'
import { useHistory } from '../components/HistoryContext'

const DURATIONS = [5, 10, 15, 30]
const STYLES = ['Cinematic', 'Anime', 'Photorealistic', 'Abstract']

export default function Generate() {
  const navigate = useNavigate()
  const { addVideo } = useHistory()

  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('wan-2.1')
  const [duration, setDuration] = useState(5)
  const [style, setStyle] = useState('Cinematic')

  // Generation state
  const [phase, setPhase] = useState('idle') // idle | generating | done | error
  const [progress, setProgress] = useState(0)
  const [jobId, setJobId] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  /* ── Start Generation ── */
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

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const resetAll = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setPhase('idle')
    setPrompt('')
    setProgress(0)
    setVideoUrl(null)
    setError(null)
    setJobId(null)
  }

  /* ══════════════════════════════════════════════════════
     RENDER: GENERATING
     ══════════════════════════════════════════════════════ */
  if (phase === 'generating') {
    return (
      <div className="qs-page">
        <div className="qs-container">
          <motion.div
            className="qs-generating glass-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              className="qs-gen-icon"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
            >
              <Wand2 size={36} />
            </motion.div>
            <h2 className="qs-gen-title">Generating your video</h2>
            <p className="qs-gen-prompt"><Sparkles size={14} /> {prompt}</p>
            <div className="qs-gen-progress">
              <div className="qs-gen-progress__track">
                <motion.div
                  className="qs-gen-progress__fill"
                  animate={{ width: `${Math.max(progress, 5)}%` }}
                  transition={{ duration: 0.4 }}
                />
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
     RENDER: DONE
     ══════════════════════════════════════════════════════ */
  if (phase === 'done' && videoUrl) {
    return (
      <div className="qs-page">
        <div className="qs-container">
          <motion.div
            className="qs-done glass-panel"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
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
     RENDER: ERROR
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
     RENDER: IDLE — Main Generation Form
     ══════════════════════════════════════════════════════ */
  return (
    <div className="qs-page">
      <div className="qs-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="qs-header">
            <div className="qs-header__badge">
              <Sparkles size={14} /> QUICK GENERATE
            </div>
            <h1 className="qs-header__title">
              One Prompt. <span className="qs-header__accent">One Video.</span>
            </h1>
            <p className="qs-header__sub">
              Skip the storyboard — go straight from text to a stunning AI-generated video.
            </p>
          </div>

          {/* Prompt */}
          <div className="qs-prompt glass-panel">
            <textarea
              className="qs-prompt__input"
              placeholder="Describe your video... e.g. 'A golden retriever running through a field of sunflowers at sunset, cinematic slow motion'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              id="qs-prompt-input"
            />
          </div>

          {/* Controls Row */}
          <div className="qs-controls">
            {/* Duration */}
            <div className="qs-control-group">
              <label className="qs-control-label"><Clock size={12} /> Duration</label>
              <div className="qs-pills">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    className={`qs-pill ${duration === d ? 'qs-pill--active' : ''}`}
                    onClick={() => setDuration(d)}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div className="qs-control-group">
              <label className="qs-control-label"><Wand2 size={12} /> Style</label>
              <div className="qs-pills">
                {STYLES.map(s => (
                  <button
                    key={s}
                    className={`qs-pill ${style === s ? 'qs-pill--active' : ''}`}
                    onClick={() => setStyle(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Model Selector */}
          <ModelSelector
            selectedModel={selectedModel}
            onSelect={setSelectedModel}
            mode="full"
          />

          {/* Generate Button */}
          <motion.button
            className="qs-generate-btn"
            onClick={startGeneration}
            disabled={!prompt.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            id="qs-generate-btn"
          >
            <Sparkles size={18} />
            <span>Generate Video</span>
            <ArrowRight size={16} />
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}

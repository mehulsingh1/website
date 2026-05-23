import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Image as ImageIcon, Film, Play, Plus, Trash2, X, Volume2, Download,
  Loader2, Clock, Sparkles, Wand2, User, ChevronDown, ArrowRight, Video,
  CheckCircle2, AlertTriangle, GripVertical, Clapperboard
} from 'lucide-react'

// Mock Data
const MOCK_CLIPS = [
  { id: 'c1', type: 'stock', thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&q=80', duration: 8, source: 'pexels' },
  { id: 'c2', type: 'generated', thumbnail: 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=500&q=80', duration: 5, source: 'ai' },
  { id: 'c3', type: 'stock', thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&q=80', duration: 12, source: 'pexels' },
]

export default function CinematicStudio() {
  /* ── Asset Library State ── */
  const [characterImage, setCharacterImage] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [generatingClip, setGeneratingClip] = useState(false)
  const [library, setLibrary] = useState(MOCK_CLIPS)

  /* ── Timeline State ── */
  const [timeline, setTimeline] = useState([])

  /* ── Export State ── */
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState(null)
  const [error, setError] = useState(null)
  const [movieTitle, setMovieTitle] = useState('')

  /* ── Handlers ── */
  const handleUploadCharacter = () => {
    // Simulate image upload
    setCharacterImage('https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80')
  }

  const generateAIClip = async () => {
    if (!prompt.trim() && !characterImage) {
      setError("Please provide a prompt or a character reference image.")
      return
    }
    setGeneratingClip(true)
    setError(null)
    
    try {
      // Mock generation delay
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      const newClip = {
        id: `gen_${Date.now()}`,
        type: 'generated',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80',
        duration: 5,
        source: 'ai'
      }
      setLibrary([newClip, ...library])
    } catch (err) {
      setError(err.message || 'Failed to generate clip')
    } finally {
      setGeneratingClip(false)
    }
  }

  const addToTimeline = (clip) => {
    setTimeline(prev => [...prev, { ...clip, tlId: Date.now().toString() }])
  }

  const removeFromTimeline = (tlId) => {
    setTimeline(prev => prev.filter(c => c.tlId !== tlId))
  }

  const exportMovie = async () => {
    if (timeline.length === 0) return
    setExporting(true)
    setError(null)
    setExportResult(null)
    try {
      await new Promise(resolve => setTimeout(resolve, 3500))
      setExportResult({
        video_url: "#",
        message: "Movie exported successfully!"
      })
    } catch (err) {
      setError(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const totalDuration = timeline.reduce((sum, c) => sum + (c.duration || 0), 0)

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  return (
    <div className="cs-page">
      {/* Header */}
      <div className="cs-header">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div className="cs-header__badge"><Clapperboard size={14} /> CINEMATIC STUDIO</div>
          <h1 className="cs-header__title">Movie <span className="cs-header__accent">Director</span></h1>
          <p className="cs-header__sub">Upload character references, generate AI scenes, and assemble your cinematic masterpiece.</p>
        </motion.div>
      </div>

      <div className="cs-workspace">

        {/* ── LEFT: Assets & Generation ── */}
        <div className="cs-search-panel glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="cs-search-panel__header">
            <h3><Wand2 size={14} /> AI Scene Generator</h3>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
            
            <div className="cs-voice-field" style={{ marginBottom: 0 }}>
              <label className="cs-voice-label">Character Reference (Optional)</label>
              {!characterImage ? (
                <button 
                  className="cs-export-btn" 
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px dashed rgba(255,255,255,0.2)' }}
                  onClick={handleUploadCharacter}
                >
                  <User size={16} /> Upload Character Face
                </button>
              ) : (
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', height: '100px', width: '100px' }}>
                  <img src={characterImage} alt="Character" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    onClick={() => setCharacterImage(null)}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', color: '#fff', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            <div className="cs-voice-field" style={{ marginBottom: 0 }}>
              <label className="cs-voice-label">Scene Prompt</label>
              <textarea
                className="cs-voice-textarea"
                placeholder="Describe the action and environment... e.g. 'Walking through a neon-lit cyberpunk street, cinematic lighting, 4k'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
              />
            </div>

            <button
              className="cs-voice-generate-btn"
              onClick={generateAIClip}
              disabled={generatingClip || (!prompt.trim() && !characterImage)}
              style={{ marginTop: 'auto' }}
            >
              {generatingClip ? <Loader2 size={14} className="spinning" /> : <Sparkles size={14} />}
              <span>{generatingClip ? 'Generating Scene...' : 'Generate AI Clip'}</span>
            </button>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '10px 0' }}></div>

            <label className="cs-voice-label"><ImageIcon size={14} style={{display:'inline', marginRight: 4}}/> Library</label>
            <div className="cs-clips-grid" style={{ padding: 0 }}>
              {library.map((clip) => (
                <motion.div
                  key={clip.id}
                  className="cs-clip-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.03 }}
                >
                  <div className="cs-clip-card__thumb">
                    <img src={clip.thumbnail} alt="" loading="lazy" />
                    <span className="cs-clip-card__dur"><Clock size={10} /> {clip.duration}s</span>
                    <span className="cs-clip-card__source" style={{ background: clip.type === 'generated' ? 'var(--accent-violet)' : 'rgba(0,0,0,0.6)' }}>
                      {clip.type === 'generated' ? 'AI' : 'Stock'}
                    </span>
                  </div>
                  <button
                    className="cs-clip-card__add"
                    onClick={() => addToTimeline(clip)}
                  >
                    <Plus size={14} /> Add
                  </button>
                </motion.div>
              ))}
            </div>

          </div>
        </div>

        {/* ── CENTER: Timeline ── */}
        <div className="cs-timeline-panel glass-panel">
          <div className="cs-timeline-panel__header">
            <h3><Film size={14} /> Storyboard Timeline</h3>
            <span className="cs-timeline-panel__info">
              {timeline.length} scenes • {totalDuration}s total
            </span>
          </div>

          {timeline.length === 0 ? (
            <div className="cs-timeline-empty">
              <Plus size={28} />
              <p>Add clips from your library</p>
            </div>
          ) : (
            <div className="cs-timeline-clips">
              {timeline.map((clip, idx) => (
                <motion.div
                  key={clip.tlId}
                  className="cs-tl-clip"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{ borderLeft: clip.type === 'generated' ? '3px solid var(--accent-violet)' : '3px solid transparent' }}
                >
                  <div className="cs-tl-clip__grip"><GripVertical size={14} /></div>
                  <div className="cs-tl-clip__thumb">
                    <img src={clip.thumbnail} alt="" />
                  </div>
                  <div className="cs-tl-clip__info">
                    <span className="cs-tl-clip__num">Scene {idx + 1}</span>
                    <span className="cs-tl-clip__dur">{clip.duration}s • {clip.type}</span>
                  </div>
                  <button className="cs-tl-clip__remove" onClick={() => removeFromTimeline(clip.tlId)}>
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Export & Settings ── */}
        <div className="cs-voice-panel glass-panel">
          <div className="cs-voice-panel__header">
            <h3><Clapperboard size={14} /> Movie Settings</h3>
          </div>

          <div className="cs-voice-field">
            <label className="cs-voice-label">Movie Title</label>
            <input
              type="text"
              className="cs-search-bar__input"
              style={{ width: '100%', borderRadius: '8px', padding: '12px' }}
              placeholder="e.g. The Cyberpunk Chronicle"
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
            />
          </div>

          <div className="cs-export-section" style={{ marginTop: 'auto' }}>
            {error && (
              <div className="cs-error" style={{ marginBottom: '16px' }}>
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            {exportResult ? (
              <div className="cs-export-done">
                <CheckCircle2 size={16} />
                <span>{exportResult.message}</span>
                <a href={exportResult.video_url} download className="cs-export-download">
                  <Download size={14} /> Download Movie
                </a>
              </div>
            ) : (
              <button
                className="cs-export-btn"
                onClick={exportMovie}
                disabled={timeline.length === 0 || exporting}
                style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))', color: '#fff' }}
              >
                {exporting ? <Loader2 size={16} className="spinning" /> : <Film size={16} />}
                <span>{exporting ? 'Rendering Movie...' : 'Export Movie'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

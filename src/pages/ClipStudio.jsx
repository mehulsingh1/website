import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Film, Play, Plus, Trash2, X, Volume2, Download,
  Loader2, Clock, Sparkles, Mic, ChevronDown, ArrowRight,
  CheckCircle2, AlertTriangle, GripVertical, Monitor, Smartphone,
  Square, Globe, Pause, Eye, Wand2, RotateCcw
} from 'lucide-react'

export default function ClipStudio() {
  /* ── Clip Search State ── */
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSource, setSearchSource] = useState('pexels')
  const [orientation, setOrientation] = useState('')
  const [minDuration, setMinDuration] = useState(0)
  const [clips, setClips] = useState([])
  const [searching, setSearching] = useState(false)

  /* ── Timeline State ── */
  const [timeline, setTimeline] = useState([])
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  /* ── Preview Modal ── */
  const [previewClip, setPreviewClip] = useState(null)

  /* ── Voiceover State ── */
  const [script, setScript] = useState('')
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [voiceSpeed, setVoiceSpeed] = useState(1.0)
  const [voiceoverUrl, setVoiceoverUrl] = useState(null)
  const [generatingVoice, setGeneratingVoice] = useState(false)
  const [generatingScript, setGeneratingScript] = useState(false)
  const [scriptTone, setScriptTone] = useState('professional')

  /* ── Export State ── */
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState(null)
  const [error, setError] = useState(null)

  /* ── Hover preview ref ── */
  const videoPreviewRefs = useRef({})

  /* ── Fetch voices on mount ── */
  useEffect(() => {
    fetch('/api/voices')
      .then(r => r.json())
      .then(data => {
        if (data.voices) {
          setVoices(data.voices)
          if (data.voices.length > 0) setSelectedVoice(data.voices[0].voice_id)
        }
      })
      .catch(() => {})
  }, [])

  /* ── Search clips ── */
  const searchClips = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setError(null)
    try {
      const res = await fetch('/api/search-clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          source: searchSource,
          orientation,
          min_duration: minDuration,
        }),
      })
      const data = await res.json()
      setClips(data.clips || [])
    } catch (err) {
      setError('Search failed. Check backend connection.')
    } finally {
      setSearching(false)
    }
  }

  /* ── Add clip to timeline ── */
  const addToTimeline = (clip) => {
    if (timeline.find(c => c.id === clip.id)) return
    setTimeline(prev => [...prev, clip])
  }

  const removeFromTimeline = (id) => {
    setTimeline(prev => prev.filter(c => c.id !== id))
  }

  /* ── Drag reorder ── */
  const handleDragStart = (idx) => setDragIdx(idx)
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx) }
  const handleDrop = (idx) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return }
    setTimeline(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(dragIdx, 1)
      updated.splice(idx, 0, moved)
      return updated
    })
    setDragIdx(null)
    setDragOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null) }

  /* ── Hover preview ── */
  const handleClipHover = (clipId) => {
    const vid = videoPreviewRefs.current[clipId]
    if (vid) vid.play().catch(() => {})
  }
  const handleClipLeave = (clipId) => {
    const vid = videoPreviewRefs.current[clipId]
    if (vid) { vid.pause(); vid.currentTime = 0 }
  }

  /* ── Generate AI narration ── */
  const generateAIScript = async () => {
    if (!searchQuery.trim()) return
    setGeneratingScript(true)
    setError(null)
    try {
      const totalDur = timeline.reduce((sum, c) => sum + (c.duration || 0), 0)
      const res = await fetch('/api/generate-narration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: searchQuery,
          tone: scriptTone,
          duration: totalDur || 30,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setScript(data.script || '')
    } catch (err) {
      setError(err.message || 'Script generation failed')
    } finally {
      setGeneratingScript(false)
    }
  }

  /* ── Generate voiceover ── */
  const generateVoiceover = async () => {
    if (!script.trim()) return
    setGeneratingVoice(true)
    try {
      const res = await fetch('/api/generate-voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, voice_id: selectedVoice, speed: voiceSpeed }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setVoiceoverUrl(data.audio_url)
    } catch (err) {
      setError(err.message || 'Voiceover generation failed')
    } finally {
      setGeneratingVoice(false)
    }
  }

  /* ── Export project ── */
  const exportProject = async () => {
    if (timeline.length === 0) return
    setExporting(true)
    setError(null)
    try {
      const res = await fetch('/api/export-clip-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips: timeline.map(c => c.url),
          voiceover_url: voiceoverUrl,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setExportResult(data)
    } catch (err) {
      setError(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const totalDuration = timeline.reduce((sum, c) => sum + (c.duration || 0), 0)

  const formatDuration = (s) => {
    if (!s) return '0s'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  return (
    <div className="cs-creator-page">
      {/* Header */}
      <div className="cs-header">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="cs-header__badge"><Film size={14} /> CLIP STUDIO</div>
          <h1 className="cs-header__title">Faceless Video <span className="cs-header__accent">Creator</span></h1>
          <p className="cs-header__sub">Search stock clips via Pexels API or web scraping, arrange on a timeline, add AI voiceover, and export.</p>
        </motion.div>
      </div>

      {/* Main 3-panel layout */}
      <div className="cs-creator-workspace">

        {/* ── LEFT: Clip Search ── */}
        <motion.div
          className="cs-search-panel glass-panel"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="cs-search-panel__header">
            <h3><Search size={14} /> Find Clips</h3>
          </div>


          {/* Orientation Filter */}
          <div className="cs-filter-row">
            <span className="cs-filter-label">Orientation</span>
            <div className="cs-orientation-btns">
              {[
                { key: '', label: 'Any', icon: null },
                { key: 'landscape', label: 'Wide', icon: <Monitor size={12} /> },
                { key: 'portrait', label: 'Tall', icon: <Smartphone size={12} /> },
                { key: 'square', label: 'Square', icon: <Square size={12} /> },
              ].map(o => (
                <button
                  key={o.key}
                  className={`cs-orient-btn ${orientation === o.key ? 'cs-orient-btn--active' : ''}`}
                  onClick={() => setOrientation(o.key)}
                >
                  {o.icon} {o.label}
                </button>
              ))}
            </div>
          </div>


          {/* Search Bar */}
          <div className="cs-search-bar">
            <input
              className="cs-search-bar__input"
              placeholder="Search clips... e.g. 'ocean waves', 'city night'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchClips()}
            />
            <button className="cs-search-bar__btn" onClick={searchClips} disabled={searching}>
              {searching ? <Loader2 size={16} className="spinning" /> : <Search size={16} />}
            </button>
          </div>

          {/* Clips Grid */}
          <div className="cs-clips-grid">
            {clips.length === 0 && !searching && (
              <div className="cs-clips-empty">
                <Film size={28} />
                <p>Search for stock video clips to get started</p>
                <span>Powered by Pexels API</span>
              </div>
            )}
            {searching && (
              <div className="cs-clips-empty">
                <Loader2 size={28} className="spinning" />
                <p>Searching clips...</p>
              </div>
            )}
            <AnimatePresence>
              {clips.map((clip, i) => (
                <motion.div
                  key={clip.id}
                  className="cs-clip-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  onMouseEnter={() => handleClipHover(clip.id)}
                  onMouseLeave={() => handleClipLeave(clip.id)}
                >
                  <div className="cs-clip-card__thumb">
                    <img src={clip.thumbnail} alt={clip.title || ''} loading="lazy" />
                    {/* Hover preview video overlay */}
                    {(clip.preview_url || clip.url) && (
                      <video
                        ref={el => { if (el) videoPreviewRefs.current[clip.id] = el }}
                        className="cs-clip-card__preview-video"
                        src={clip.preview_url || clip.url}
                        muted
                        loop
                        playsInline
                        preload="none"
                      />
                    )}
                    <span className="cs-clip-card__dur"><Clock size={10} /> {formatDuration(clip.duration)}</span>
                    <span className="cs-clip-card__source">{clip.source}</span>
                    {/* Preview button */}
                    <button className="cs-clip-card__preview-btn" onClick={(e) => { e.stopPropagation(); setPreviewClip(clip) }}>
                      <Eye size={14} />
                    </button>
                  </div>
                  {clip.title && (
                    <div className="cs-clip-card__title">{clip.title}</div>
                  )}
                  <button
                    className="cs-clip-card__add"
                    onClick={() => addToTimeline(clip)}
                    disabled={!!timeline.find(c => c.id === clip.id)}
                  >
                    {timeline.find(c => c.id === clip.id) ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                    {timeline.find(c => c.id === clip.id) ? 'Added' : 'Add to Timeline'}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── CENTER: Timeline ── */}
        <motion.div
          className="cs-timeline-panel glass-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="cs-timeline-panel__header">
            <h3><Film size={14} /> Timeline</h3>
            <span className="cs-timeline-panel__info">
              {timeline.length} clip{timeline.length !== 1 ? 's' : ''} • {formatDuration(totalDuration)}
            </span>
          </div>

          {timeline.length === 0 ? (
            <div className="cs-timeline-empty">
              <div className="cs-timeline-empty__icon">
                <Plus size={28} />
              </div>
              <p>Add clips from the search panel</p>
              <span>Drag to reorder clips on the timeline</span>
            </div>
          ) : (
            <div className="cs-timeline-clips">
              {timeline.map((clip, idx) => (
                <motion.div
                  key={clip.id}
                  className={`cs-tl-clip ${dragOverIdx === idx ? 'cs-tl-clip--drag-over' : ''} ${dragIdx === idx ? 'cs-tl-clip--dragging' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  layout
                >
                  <div className="cs-tl-clip__grip"><GripVertical size={14} /></div>
                  <div className="cs-tl-clip__thumb">
                    <img src={clip.thumbnail} alt="" />
                    <span className="cs-tl-clip__play" onClick={() => setPreviewClip(clip)}>
                      <Play size={10} />
                    </span>
                  </div>
                  <div className="cs-tl-clip__info">
                    <span className="cs-tl-clip__num">Clip {idx + 1}</span>
                    <span className="cs-tl-clip__dur">{formatDuration(clip.duration)} • {clip.source}</span>
                  </div>
                  {/* Duration bar */}
                  <div className="cs-tl-clip__bar">
                    <div
                      className="cs-tl-clip__bar-fill"
                      style={{ width: `${Math.min(100, (clip.duration / Math.max(totalDuration, 1)) * 100)}%` }}
                    />
                  </div>
                  <button className="cs-tl-clip__remove" onClick={() => removeFromTimeline(clip.id)}>
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {/* Export Section */}
          <div className="cs-export-section">
            {error && (
              <motion.div className="cs-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <AlertTriangle size={14} /> {error}
                <button className="cs-error__dismiss" onClick={() => setError(null)}><X size={12} /></button>
              </motion.div>
            )}

            {exportResult ? (
              <motion.div className="cs-export-done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <CheckCircle2 size={18} />
                <span>Video exported successfully!</span>
                <a href={exportResult.video_url} download className="cs-export-download">
                  <Download size={14} /> Download MP4
                </a>
                <button className="cs-export-reset" onClick={() => setExportResult(null)}>
                  <RotateCcw size={12} /> New Export
                </button>
              </motion.div>
            ) : (
              <button
                className="cs-export-btn"
                onClick={exportProject}
                disabled={timeline.length === 0 || exporting}
              >
                {exporting ? <Loader2 size={16} className="spinning" /> : <Download size={16} />}
                <span>{exporting ? 'Exporting...' : 'Export Video'}</span>
                {timeline.length > 0 && <span className="cs-export-btn__count">{timeline.length} clips</span>}
              </button>
            )}
          </div>
        </motion.div>

        {/* ── RIGHT: Voiceover ── */}
        <motion.div
          className="cs-voice-panel glass-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="cs-voice-panel__header">
            <h3><Mic size={14} /> AI Voiceover</h3>
          </div>

          {/* AI Script Generator */}
          <div className="cs-voice-field">
            <label className="cs-voice-label"><Wand2 size={12} /> AI Script Generator</label>
            <div className="cs-tone-tabs">
              {['professional', 'casual', 'dramatic', 'educational'].map(tone => (
                <button
                  key={tone}
                  className={`cs-tone-tab ${scriptTone === tone ? 'cs-tone-tab--active' : ''}`}
                  onClick={() => setScriptTone(tone)}
                >
                  {tone.charAt(0).toUpperCase() + tone.slice(1)}
                </button>
              ))}
            </div>
            <button
              className="cs-ai-script-btn"
              onClick={generateAIScript}
              disabled={!searchQuery.trim() || generatingScript}
            >
              {generatingScript ? <Loader2 size={14} className="spinning" /> : <Sparkles size={14} />}
              <span>{generatingScript ? 'Writing Script...' : 'Generate Script from Topic'}</span>
            </button>
          </div>

          <div className="cs-voice-divider" />

          <div className="cs-voice-field">
            <label className="cs-voice-label">Script</label>
            <textarea
              className="cs-voice-textarea"
              placeholder="Write your narration script here or generate one with AI above..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={6}
            />
            {script && (
              <span className="cs-voice-word-count">{script.split(/\s+/).filter(Boolean).length} words • ~{Math.ceil(script.split(/\s+/).filter(Boolean).length / 2.5)}s</span>
            )}
          </div>

          <div className="cs-voice-field">
            <label className="cs-voice-label">Voice</label>
            <select
              className="cs-voice-select"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
            >
              {voices.map(v => (
                <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="cs-voice-field">
            <label className="cs-voice-label">Speed: {voiceSpeed.toFixed(1)}x</label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
              className="cs-voice-slider"
            />
          </div>

          <button
            className="cs-voice-generate-btn"
            onClick={generateVoiceover}
            disabled={!script.trim() || generatingVoice}
          >
            {generatingVoice ? <Loader2 size={14} className="spinning" /> : <Volume2 size={14} />}
            <span>{generatingVoice ? 'Generating...' : 'Generate Voiceover'}</span>
          </button>

          {voiceoverUrl && (
            <motion.div
              className="cs-voice-preview"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="cs-voice-preview__header">
                <CheckCircle2 size={14} />
                <span>Voiceover ready</span>
              </div>
              <audio controls src={voiceoverUrl} className="cs-voice-audio" />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── VIDEO PREVIEW MODAL ── */}
      <AnimatePresence>
        {previewClip && (
          <motion.div
            className="cs-preview-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewClip(null)}
          >
            <motion.div
              className="cs-preview-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cs-preview-modal__header">
                <h3>{previewClip.title || 'Video Preview'}</h3>
                <div className="cs-preview-modal__meta">
                  <span>{previewClip.source}</span>
                  <span>{formatDuration(previewClip.duration)}</span>
                  <span>{previewClip.width}×{previewClip.height}</span>
                </div>
                <button className="cs-preview-modal__close" onClick={() => setPreviewClip(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="cs-preview-modal__body">
                <video
                  src={previewClip.preview_url || previewClip.url}
                  controls
                  autoPlay
                  className="cs-preview-modal__video"
                />
              </div>
              <div className="cs-preview-modal__footer">
                <button
                  className="cs-preview-modal__add"
                  onClick={() => { addToTimeline(previewClip); setPreviewClip(null) }}
                  disabled={!!timeline.find(c => c.id === previewClip.id)}
                >
                  {timeline.find(c => c.id === previewClip.id) ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {timeline.find(c => c.id === previewClip.id) ? 'Already in Timeline' : 'Add to Timeline'}
                </button>
                <span className="cs-preview-modal__license">{previewClip.license}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

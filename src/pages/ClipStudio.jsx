import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Film, Play, Plus, Trash2, X, Volume2, Download,
  Loader2, Clock, Sparkles, Mic, ChevronDown, ArrowRight,
  CheckCircle2, AlertTriangle, GripVertical
} from 'lucide-react'

export default function ClipStudio() {
  /* ── Clip Search State ── */
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSource, setSearchSource] = useState('pexels')
  const [clips, setClips] = useState([])
  const [searching, setSearching] = useState(false)

  /* ── Timeline State ── */
  const [timeline, setTimeline] = useState([])

  /* ── Voiceover State ── */
  const [script, setScript] = useState('')
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [voiceSpeed, setVoiceSpeed] = useState(1.0)
  const [voiceoverUrl, setVoiceoverUrl] = useState(null)
  const [generatingVoice, setGeneratingVoice] = useState(false)

  /* ── Export State ── */
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState(null)
  const [error, setError] = useState(null)

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
        body: JSON.stringify({ query: searchQuery, source: searchSource }),
      })
      const data = await res.json()
      setClips(data.clips || [])
    } catch (err) {
      setError('Search failed. Check your API keys.')
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

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  return (
    <div className="cs-page">
      {/* Header */}
      <div className="cs-header">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div className="cs-header__badge"><Film size={14} /> CLIP STUDIO</div>
          <h1 className="cs-header__title">Faceless Video <span className="cs-header__accent">Creator</span></h1>
          <p className="cs-header__sub">Search stock clips, arrange them on a timeline, add AI voiceover, and export.</p>
        </motion.div>
      </div>

      {/* Main 3-panel layout */}
      <div className="cs-workspace">

        {/* ── LEFT: Clip Search ── */}
        <div className="cs-search-panel glass-panel">
          <div className="cs-search-panel__header">
            <h3><Search size={14} /> Find Clips</h3>
            <div className="cs-source-tabs">
              {['pexels', 'pixabay', 'all'].map(s => (
                <button
                  key={s}
                  className={`cs-source-tab ${searchSource === s ? 'cs-source-tab--active' : ''}`}
                  onClick={() => setSearchSource(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="cs-search-bar">
            <input
              className="cs-search-bar__input"
              placeholder="Search for clips... e.g. 'ocean waves'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchClips()}
            />
            <button className="cs-search-bar__btn" onClick={searchClips} disabled={searching}>
              {searching ? <Loader2 size={16} className="spinning" /> : <Search size={16} />}
            </button>
          </div>

          <div className="cs-clips-grid">
            {clips.length === 0 && !searching && (
              <div className="cs-clips-empty">
                <Film size={24} />
                <p>Search for stock video clips to get started</p>
              </div>
            )}
            {clips.map((clip) => (
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
                  <span className="cs-clip-card__source">{clip.source}</span>
                </div>
                <button
                  className="cs-clip-card__add"
                  onClick={() => addToTimeline(clip)}
                  disabled={!!timeline.find(c => c.id === clip.id)}
                >
                  {timeline.find(c => c.id === clip.id) ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {timeline.find(c => c.id === clip.id) ? 'Added' : 'Add'}
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── CENTER: Timeline ── */}
        <div className="cs-timeline-panel glass-panel">
          <div className="cs-timeline-panel__header">
            <h3><Film size={14} /> Timeline</h3>
            <span className="cs-timeline-panel__info">
              {timeline.length} clips • {totalDuration}s total
            </span>
          </div>

          {timeline.length === 0 ? (
            <div className="cs-timeline-empty">
              <Plus size={28} />
              <p>Add clips from the search panel</p>
            </div>
          ) : (
            <div className="cs-timeline-clips">
              {timeline.map((clip, idx) => (
                <motion.div
                  key={clip.id}
                  className="cs-tl-clip"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div className="cs-tl-clip__grip"><GripVertical size={14} /></div>
                  <div className="cs-tl-clip__thumb">
                    <img src={clip.thumbnail} alt="" />
                  </div>
                  <div className="cs-tl-clip__info">
                    <span className="cs-tl-clip__num">Clip {idx + 1}</span>
                    <span className="cs-tl-clip__dur">{clip.duration}s • {clip.source}</span>
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
              <div className="cs-error">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            {exportResult ? (
              <div className="cs-export-done">
                <CheckCircle2 size={16} />
                <span>Video exported!</span>
                <a href={exportResult.video_url} download className="cs-export-download">
                  <Download size={14} /> Download
                </a>
              </div>
            ) : (
              <button
                className="cs-export-btn"
                onClick={exportProject}
                disabled={timeline.length === 0 || exporting}
              >
                {exporting ? <Loader2 size={16} className="spinning" /> : <Download size={16} />}
                <span>{exporting ? 'Exporting...' : 'Export Video'}</span>
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: Voiceover ── */}
        <div className="cs-voice-panel glass-panel">
          <div className="cs-voice-panel__header">
            <h3><Mic size={14} /> Voiceover</h3>
          </div>

          <div className="cs-voice-field">
            <label className="cs-voice-label">Script</label>
            <textarea
              className="cs-voice-textarea"
              placeholder="Write your narration script here..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={6}
            />
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
            {generatingVoice ? <Loader2 size={14} className="spinning" /> : <Sparkles size={14} />}
            <span>{generatingVoice ? 'Generating...' : 'Generate Voiceover'}</span>
          </button>

          {voiceoverUrl && (
            <div className="cs-voice-preview">
              <CheckCircle2 size={14} />
              <span>Voiceover ready</span>
              <audio controls src={voiceoverUrl} style={{ width: '100%', marginTop: 8 }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Image as ImageIcon, Briefcase, Play, Plus, Trash2, X, Volume2, Download,
  Loader2, Clock, Sparkles, Mic, ChevronDown, ArrowRight, Video,
  CheckCircle2, AlertTriangle, GripVertical
} from 'lucide-react'

// Mock Data for AI Models
const MOCK_MODELS = [
  { id: 'm1', name: 'Sarah', type: 'UGC Creator', thumbnail: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&q=80', duration: 12 },
  { id: 'm2', name: 'James', type: 'Professional', thumbnail: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&q=80', duration: 15 },
  { id: 'm3', name: 'Elena', type: 'Lifestyle', thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&q=80', duration: 10 },
  { id: 'm4', name: 'David', type: 'Tech Reviewer', thumbnail: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&q=80', duration: 18 },
]

export default function MarketingStudio() {
  /* ── Brand Assets State ── */
  const [brandName, setBrandName] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [assets, setAssets] = useState([]) // mock uploaded images

  /* ── AI Model State ── */
  const [models] = useState(MOCK_MODELS)
  const [selectedModel, setSelectedModel] = useState(null)

  /* ── Voiceover & Script State ── */
  const [script, setScript] = useState('')
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [voiceSpeed, setVoiceSpeed] = useState(1.0)
  
  /* ── Generation State ── */
  const [generating, setGenerating] = useState(false)
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

  /* ── Mock Upload Asset ── */
  const handleUploadClick = () => {
    // Simulate file selection and upload
    const mockAsset = {
      id: Date.now().toString(),
      name: `product_img_${assets.length + 1}.jpg`,
      url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80'
    }
    setAssets([...assets, mockAsset])
  }

  const removeAsset = (id) => {
    setAssets(assets.filter(a => a.id !== id))
  }

  /* ── Generate Advertisement ── */
  const generateAd = async () => {
    if (!selectedModel || !script.trim()) {
      setError("Please select an AI model and provide a script.")
      return
    }
    setGenerating(true)
    setError(null)
    setExportResult(null)
    
    try {
      // Mock generation delay
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      setExportResult({
        video_url: "#",
        message: "Advertisement generated successfully!"
      })
    } catch (err) {
      setError(err.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  return (
    <div className="cs-page">
      {/* Header */}
      <div className="cs-header">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div className="cs-header__badge"><Briefcase size={14} /> MARKETING STUDIO</div>
          <h1 className="cs-header__title">UGC Ad<span className="cs-header__accent">Maker</span></h1>
          <p className="cs-header__sub">Upload brand assets, select an AI spokesperson, and generate converting video ads.</p>
        </motion.div>
      </div>

      {/* Main 3-panel layout */}
      <div className="cs-workspace">

        {/* ── LEFT: Brand Assets ── */}
        <div className="cs-search-panel glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="cs-search-panel__header">
            <h3><Briefcase size={14} /> Brand Assets</h3>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            <div className="cs-voice-field" style={{ marginBottom: 0 }}>
              <label className="cs-voice-label">Brand/Product Name</label>
              <input
                type="text"
                className="cs-search-bar__input"
                style={{ width: '100%', borderRadius: '8px', padding: '12px' }}
                placeholder="e.g. Nexoryx Headphones"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>
            
            <div className="cs-voice-field" style={{ marginBottom: 0 }}>
              <label className="cs-voice-label">Product Description / Guidelines</label>
              <textarea
                className="cs-voice-textarea"
                placeholder="Describe the product and the tone of the ad..."
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
                rows={4}
              />
            </div>

            <div className="cs-voice-field">
              <label className="cs-voice-label">Product Images / Logos</label>
              <button 
                className="cs-export-btn" 
                style={{ width: '100%', marginBottom: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)' }}
                onClick={handleUploadClick}
              >
                <Upload size={16} /> Upload Asset
              </button>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {assets.map(asset => (
                  <div key={asset.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img src={asset.url} alt={asset.name} style={{ width: '100%', height: '80px', objectFit: 'cover', display: 'block' }} />
                    <button 
                      onClick={() => removeAsset(asset.id)}
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', color: '#fff', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTER: AI Models ── */}
        <div className="cs-timeline-panel glass-panel">
          <div className="cs-timeline-panel__header">
            <h3><Video size={14} /> AI Model Selection</h3>
          </div>

          <div className="cs-clips-grid" style={{ padding: '20px' }}>
            {models.map((model) => (
              <motion.div
                key={model.id}
                className={`cs-clip-card ${selectedModel?.id === model.id ? 'cs-clip-card--selected' : ''}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => setSelectedModel(model)}
                style={{ 
                  cursor: 'pointer',
                  border: selectedModel?.id === model.id ? '2px solid var(--accent-violet)' : '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <div className="cs-clip-card__thumb">
                  <img src={model.thumbnail} alt={model.name} loading="lazy" />
                  <span className="cs-clip-card__dur">{model.type}</span>
                </div>
                <div style={{ padding: '10px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
                  {model.name}
                  {selectedModel?.id === model.id && (
                    <CheckCircle2 size={14} style={{ color: 'var(--accent-violet)', marginLeft: '6px', verticalAlign: 'middle' }} />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Voiceover & Generation ── */}
        <div className="cs-voice-panel glass-panel">
          <div className="cs-voice-panel__header">
            <h3><Mic size={14} /> Script & Generate</h3>
          </div>

          <div className="cs-voice-field">
            <label className="cs-voice-label">Ad Script (Spoken by AI Model)</label>
            <textarea
              className="cs-voice-textarea"
              placeholder="Write the exact script the actor will say..."
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
              {voices.length > 0 ? voices.map(v => (
                <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
              )) : <option value="default">Default AI Voice</option>}
            </select>
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
                  <Download size={14} /> Download Ad
                </a>
              </div>
            ) : (
              <button
                className="cs-export-btn"
                onClick={generateAd}
                disabled={!selectedModel || !script.trim() || generating}
                style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))', color: '#fff' }}
              >
                {generating ? <Loader2 size={16} className="spinning" /> : <Sparkles size={16} />}
                <span>{generating ? 'Generating Ad...' : 'Generate Advertisement'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

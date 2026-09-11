import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Cpu, Zap, Eye, Clock, Check, Sparkles, Loader2 } from 'lucide-react'

/* ────────────────────────────────────────────────────────
   Hardcoded fallback models (used if backend unreachable)
   ──────────────────────────────────────────────────────── */
export const FALLBACK_MODELS = [
  { id: 'grok-imagine-video', name: 'Grok Imagine Video', provider: 'xAI', provider_logo: 'xai', quality: '4K', speed: 'Balanced', cost_per_sec: 0.25, max_duration: 15, supports_image: true, supports_text: true },
  { id: 'wan-2.1', name: 'Wan 2.1', provider: 'WaveSpeed AI', provider_logo: 'wavespeed', quality: 'HD', speed: 'Fast', cost_per_sec: 0.10, max_duration: 10, supports_image: false, supports_text: true },
  { id: 'hunyuan-video', name: 'Hunyuan Video', provider: 'Tencent', provider_logo: 'tencent', quality: 'HD', speed: 'Quality', cost_per_sec: 0.18, max_duration: 15, supports_image: false, supports_text: true },
  { id: 'minimax-video-01', name: 'Minimax Video-01', provider: 'Minimax', provider_logo: 'minimax', quality: 'HD', speed: 'Balanced', cost_per_sec: 0.15, max_duration: 15, supports_image: true, supports_text: true },
  { id: 'kling-1.6-pro', name: 'Kling 1.6 Pro', provider: 'Kuaishou', provider_logo: 'kling', quality: '4K', speed: 'Quality', cost_per_sec: 0.30, max_duration: 30, supports_image: true, supports_text: true },
  { id: 'ltx-video', name: 'LTX Video', provider: 'Lightricks', provider_logo: 'lightricks', quality: 'HD', speed: 'Fast', cost_per_sec: 0.08, max_duration: 10, supports_image: false, supports_text: true },
  { id: 'veo-3', name: 'Veo 3', provider: 'Google DeepMind', provider_logo: 'google', quality: '4K', speed: 'Quality', cost_per_sec: 0.35, max_duration: 30, supports_image: true, supports_text: true },
  { id: 'cogvideox-5b', name: 'CogVideoX-5B', provider: 'THUDM', provider_logo: 'thudm', quality: 'HD', speed: 'Balanced', cost_per_sec: 0.12, max_duration: 10, supports_image: true, supports_text: true },
  { id: 'pika-2.2', name: 'Pika 2.2', provider: 'Pika Labs', provider_logo: 'pika', quality: 'HD', speed: 'Fast', cost_per_sec: 0.14, max_duration: 10, supports_image: true, supports_text: true },
  { id: 'gen4-turbo', name: 'Gen-4 Turbo', provider: 'Runway ML', provider_logo: 'runway', quality: '4K', speed: 'Fast', cost_per_sec: 0.20, max_duration: 15, supports_image: true, supports_text: true },
]

const SPEED_COLORS = { Fast: '#22c55e', Balanced: '#f59e0b', Quality: '#8b5cf6' }
const QUALITY_COLORS = { SD: '#6b7280', HD: '#3b82f6', '4K': '#f59e0b' }

/**
 * Reusable Model Selector component.
 * @param {string}   selectedModel - Currently selected model ID
 * @param {function} onSelect      - Callback when a model is selected
 * @param {string}   mode          - 'full' (card grid) or 'compact' (dropdown-style)
 */
export default function ModelSelector({ selectedModel, onSelect, mode = 'full' }) {
  const [models, setModels] = useState(FALLBACK_MODELS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then(data => { if (data.models) setModels(data.models) })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  /* ── Compact mode: horizontal scrollable chips ── */
  if (mode === 'compact') {
    return (
      <div className="ms-compact">
        <div className="ms-compact__label">
          <Cpu size={12} /> Model
        </div>
        <div className="ms-compact__list">
          {models.map(m => (
            <button
              key={m.id}
              className={`ms-compact__chip ${selectedModel === m.id ? 'ms-compact__chip--active' : ''}`}
              onClick={() => onSelect(m.id)}
            >
              <span className={`ms-compact__quality ms-compact__quality--${m.quality.toLowerCase()}`}>
                {m.quality}
              </span>
              <span className="ms-compact__name">{m.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  /* ── Full mode: card grid ── */
  return (
    <div className="ms-grid">
      <div className="ms-grid__header">
        <Sparkles size={16} />
        <h3>Select Video Model</h3>
        <span className="ms-grid__count">{models.length} models</span>
      </div>

      <div className="ms-grid__cards">
        {models.map((m, i) => {
          const isActive = selectedModel === m.id
          return (
            <motion.button
              key={m.id}
              className={`ms-card glass-panel ${isActive ? 'ms-card--active' : ''}`}
              onClick={() => onSelect(m.id)}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isActive && (
                <div className="ms-card__check">
                  <Check size={14} />
                </div>
              )}

              <div className="ms-card__top">
                <span className="ms-card__provider">{m.provider}</span>
                <span
                  className="ms-card__quality-badge"
                  style={{ background: QUALITY_COLORS[m.quality] + '22', color: QUALITY_COLORS[m.quality] }}
                >
                  {m.quality}
                </span>
              </div>

              <h4 className="ms-card__name">{m.name}</h4>

              <div className="ms-card__meta">
                <span className="ms-card__speed" style={{ color: SPEED_COLORS[m.speed] }}>
                  <Zap size={10} /> {m.speed}
                </span>
                <span className="ms-card__cost">
                  <Clock size={10} /> ${m.cost_per_sec}/s
                </span>
              </div>

              <div className="ms-card__caps">
                {m.supports_text && <span className="ms-card__cap">Text→Video</span>}
                {m.supports_image && <span className="ms-card__cap">Image→Video</span>}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

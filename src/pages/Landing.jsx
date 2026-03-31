import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, Play, ArrowDown, Clock, Cpu, Film,
  Layers, Bot, Clapperboard, Loader2,
  Zap, Eye, ArrowRight
} from 'lucide-react'

/* ---- SIMULATED SCRIPT GENERATION ---- */
const SCRIPT_SCENES = [
  {
    id: 1,
    title: 'Scene 1: The Reveal',
    description: 'Wide establishing shot — the product emerges from shadow into dramatic rim lighting. Slow dolly push forward.',
    duration: 4,
    camera: 'Dolly In',
  },
  {
    id: 2,
    title: 'Scene 2: In Action',
    description: 'Dynamic sequence showing the product in use. Quick cuts between macro details and wide context shots. Energetic pacing.',
    duration: 6,
    camera: 'Tracking Shot',
  },
  {
    id: 3,
    title: 'Scene 3: The Lifestyle',
    description: 'Cinematic lifestyle vignette — golden hour lighting, shallow depth of field. The product woven naturally into an aspirational setting.',
    duration: 5,
    camera: 'Pan Right',
  },
  {
    id: 4,
    title: 'Scene 4: The Close',
    description: 'Hero shot with product center frame. Logo and tagline fade in with subtle particle effects. Orchestral swell.',
    duration: 3,
    camera: 'Static',
  },
]

const SHOWCASE_ITEMS = [
  {
    id: 1,
    prompt: 'A cyberpunk city at dusk, neon reflections on rain-soaked streets, cinematic drone flyover',
    duration: '12s',
    model: 'Nexoryx v2',
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
  {
    id: 2,
    prompt: 'Golden hour desert landscape, ancient ruins emerging from sand, slow dolly push',
    duration: '8s',
    model: 'Nexoryx v2',
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  },
  {
    id: 3,
    prompt: 'Underwater bioluminescent forest, ethereal particles floating, macro lens cinematic',
    duration: '15s',
    model: 'Nexoryx Pro',
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
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

export default function Landing() {
  const [topic, setTopic] = useState('')
  const [showPAI, setShowPAI] = useState(false)
  const navigate = useNavigate()

  /* ---- Open PAI preview inside our site ---- */
  const startPipeline = () => {
    if (!topic.trim() || showPAI) return
    setShowPAI(true)
  }

  const goBack = () => {
    setShowPAI(false)
  }

  const resetAll = () => {
    setShowPAI(false)
    setTopic('')
  }

  const openPAI = () => {
    window.open('https://pai.utopaistudios.com/', '_blank', 'noopener,noreferrer')
  }

  /* ---- FULLSCREEN PAI PREVIEW OVERLAY ---- */
  if (showPAI) {
    return (
      <div className="pai-overlay">
        {/* Back Bar */}
        <div className="pai-overlay__bar">
          <button className="pai-overlay__back-btn" onClick={goBack} id="pai-back-btn">
            <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
            <span>Back to Nexoryx</span>
          </button>
          <div className="pai-overlay__topic">
            <Sparkles size={14} />
            <span>{topic}</span>
          </div>
          <button className="pai-overlay__new-btn" onClick={resetAll}>
            <Sparkles size={14} />
            <span>New Topic</span>
          </button>
        </div>

        {/* PAI Preview Content */}
        <div className="pai-preview">
          <div className="pai-preview__image-wrap">
            <img src="/pai-preview.png" alt="PAI by Utopai Studios" className="pai-preview__image" />
            <div className="pai-preview__overlay">
              <div className="pai-preview__badge">
                <Sparkles size={16} />
                <span>PAI by Utopai Studios</span>
              </div>
              <h2 className="pai-preview__title">Where AI meets cinema<br />to create epic stories</h2>
              <p className="pai-preview__desc">Your topic "<strong>{topic}</strong>" is ready to be brought to life with PAI's cinematic AI engine.</p>
              <button className="pai-preview__open-btn" onClick={openPAI} id="pai-open-btn">
                <Play size={18} />
                <span>Open PAI Studio</span>
                <ArrowRight size={16} />
              </button>
              <p className="pai-preview__hint">Opens in a new tab</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

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

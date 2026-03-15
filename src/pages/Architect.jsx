import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, Clock, Camera, Check,
  Loader2, Sparkles, Save, Download, RefreshCw,
  Video, Wand2, Pen, MonitorPlay, MoveHorizontal, ZoomIn, ArrowDownLeft, RotateCw, ChevronUp, ChevronDown,
  Clapperboard, Play, Speaker, Bot
} from 'lucide-react'

const CAMERA_MOTIONS = [
  'Static', 'Pan Left', 'Pan Right', 'Dolly In', 'Zoom Out', 'Tracking Shot', 'Orbit'
]

const DEFAULT_SCENES = [
  { id: 1, title: 'Scene 1: The Reveal', description: 'Wide establishing shot — the product emerges from shadow into dramatic rim lighting.', duration: 4, camera: 'Dolly In' },
  { id: 2, title: 'Scene 2: In Action', description: 'Dynamic sequence showing the product in use. Quick cuts between macro details.', duration: 6, camera: 'Tracking Shot' },
]

export default function Architect() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // 3 Steps: 1 (Scenes), 2 (Generate), 3 (Export)
  const [step, setStep] = useState(1)
  
  // State
  const [topic, setTopic] = useState(location.state?.topic || 'Untitled Project')
  const [scenes, setScenes] = useState(location.state?.scenes || DEFAULT_SCENES)
  const [activeSceneId, setActiveSceneId] = useState(scenes[0]?.id || 1)
  
  // Generation state
  const [genPhase, setGenPhase] = useState('idle') // idle, rendering, compositing, done
  const [renderProgress, setRenderProgress] = useState(0)
  
  // Export state
  const [saved, setSaved] = useState(false)

  const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0]
  const totalDuration = scenes.reduce((s, sc) => s + sc.duration, 0)

  const updateScene = (id, updates) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const addScene = () => {
    const newId = Math.max(0, ...scenes.map(s => s.id)) + 1
    const newScene = { id: newId, title: `Scene ${newId}`, description: '', duration: 4, camera: 'Static' }
    setScenes(prev => [...prev, newScene])
    setActiveSceneId(newId)
  }

  const deleteScene = (id) => {
    if (scenes.length <= 1) return
    const remaining = scenes.filter(s => s.id !== id)
    setScenes(remaining)
    if (activeSceneId === id) setActiveSceneId(remaining[0].id)
  }

  const moveScene = (index, direction) => {
    setScenes(prev => {
      const copy = [...prev]
      if (direction === 'up' && index > 0) {
        [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]]
      } else if (direction === 'down' && index < copy.length - 1) {
        [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]]
      }
      // Re-title scenes to maintain order 1, 2, 3...
      return copy.map((scene, i) => ({ ...scene, title: `Scene ${i + 1}` }))
    })
  }

  const startGeneration = () => {
    setStep(2)
    setGenPhase('rendering')
    setRenderProgress(0)

    let p = 0
    const interval = setInterval(() => {
      p += Math.random() * 8 + 2
      if (p >= 100) {
        p = 100
        clearInterval(interval)
        setGenPhase('compositing')
        setTimeout(() => {
          setGenPhase('done')
          setTimeout(() => setStep(3), 1500)
        }, 2000)
      }
      setRenderProgress(Math.min(p, 100))
    }, 150)
  }

  return (
    <div className="editor-layout">
      {/* LEFT PANEL: STORYBOARD */}
      <aside className="editor-sidebar">
        <div className="sidebar-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> STORYBOARD
          </button>
          <span className="scene-count">{scenes.length} Scenes</span>
        </div>

        <div className="storyboard-list" style={{ overflowY: 'auto', flex: 1, padding: '0 16px 20px' }}>
          {scenes.map((scene, idx) => (
            <div 
              key={scene.id} 
              className={`story-card ${activeSceneId === scene.id ? 'active' : ''}`}
              onClick={() => setActiveSceneId(scene.id)}
            >
              <div className="story-card-header">
                <span className="sc-num">SCENE {idx + 1}</span>
              </div>
              
              <div className="story-card-thumb">
                 <Clapperboard size={24} className="thumb-icon" />
              </div>

              <textarea 
                className="story-prompt-input"
                value={scene.description}
                onChange={(e) => updateScene(scene.id, { description: e.target.value })}
                placeholder="Describe the next scene..."
              />

              <div className="story-card-footer">
                <div className="sc-duration">
                  <Clock size={12} /> {scene.duration}s
                </div>
                <button className="btn-rerender">RERENDER</button>
              </div>
            </div>
          ))}

          <button className="add-scene-ghost" onClick={addScene}>
            <Plus size={16} /> ADD SCENE
          </button>
        </div>
      </aside>

      {/* CENTER PANEL: CANVAS & TIMELINE */}
      <main className="editor-canvas">
        <header className="canvas-header">
          <div className="project-title-group">
            <div className="logo-box">N</div>
            <h1 className="proj-title">{topic}</h1>
            <span className="auto-save-badge"><span className="dot"></span> AUTO-SAVING</span>
          </div>
          
          <div className="canvas-actions">
             <button className="icon-btn"><RotateCw size={16} /></button>
             <button className="btn-export">
               <Download size={16} /> Export Video
             </button>
          </div>
        </header>

        <div className="canvas-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 32px' }}>
          
          {/* Main Video Player Area */}
          <div className="video-preview-box">
             <div className="video-placeholder-bg"></div>
             
             {/* Big Play Button Overlay */}
             <button className="big-play-btn">
               <Play size={32} fill="currentColor" />
             </button>
             
             {/* Player Controls Overlay */}
             <div className="v-controls">
               <span className="timecode">00:00:00:00</span>
               <button className="v-fullscreen"><MoveHorizontal size={14} /></button>
             </div>
          </div>

          {/* Timeline Editor */}
          <div className="timeline-editor">
            
            <div className="tl-toolbar">
              <div className="tl-play-group">
                 <button className="btn-play-small"><Play size={14} fill="currentColor" /></button>
                 <span className="tl-time">00:00:00:00</span>
              </div>
              <div className="tl-tabs">
                <button className="tab active"><Video size={12}/> VIDEO</button>
                <button className="tab"><Speaker size={12}/> AUDIO</button>
              </div>
            </div>

            {/* Timestamps */}
            <div className="tl-ruler">
               {['00:00', '00:01', '00:02', '00:03', '00:04', '00:05', '00:06', '00:07', '00:08', '00:09', '00:010', '00:011', '00:012', '00:013', '00:014', '00:015', '00:016', '00:017'].map(t => (
                 <span key={t} className="tick">{t}</span>
               ))}
            </div>

            {/* Tracks */}
            <div className="tl-tracks">
               <div className="tl-track tl-visual-track">
                 <div className="tl-block block-visual" style={{ width: '40%' }}>
                   <span>S1_VISUAL</span>
                 </div>
               </div>
               
               <div className="tl-track tl-audio-track">
                 <div className="tl-block block-audio" style={{ width: '60%' }}>
                   <span>CINEMATIC_AMBIENCE.WAV</span>
                 </div>
               </div>
            </div>

          </div>
        </div>
      </main>

      {/* RIGHT PANEL: AGENT CHAT */}
      <aside className="editor-agent">
        <div className="agent-header">
           <div className="agent-title">
             <Bot size={18} color="var(--accent-violet)" />
             <span style={{fontWeight: 700}}>NEXORYX AGENT</span>
           </div>
           <p className="agent-sub">AI Director for content creators</p>
        </div>

        <div className="agent-chat-history">
          <div className="chat-bubble bot-bubble">
            Welcome to Nexoryx Studio. I'm your cinematic agent. How can I help you shape your vision today?
          </div>
        </div>

        <div className="agent-input-area">
           <div className="agent-textfield">
              <textarea placeholder="Ask the director..." rows={3} />
              <button className="btn-send"><Wand2 size={16} /></button>
           </div>
           
           <div className="quick-actions">
              <button className="chip">CHANGE LIGHTING</button>
              <button className="chip">ADD SLOW MOTION</button>
              <button className="chip">COLOR GRADE</button>
           </div>
        </div>
      </aside>
    </div>
  )
}

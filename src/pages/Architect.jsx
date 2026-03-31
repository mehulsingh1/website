import { useState, useEffect, useRef } from 'react'
import { Plus, ArrowLeft, Download, Play, Pause, Save, CheckCircle2, Loader2, Trash2, Clock, RefreshCw, Film } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const MOCK_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
]

export default function Architect() {
  const navigate = useNavigate()
  // Mock Data
  const [topic, setTopic] = useState('Cinematic Product Showcase')
  const [scenes, setScenes] = useState([
    { 
      id: 1, 
      title: 'Scene 1', 
      description: 'Wide establishing shot — the product emerges from shadow into dramatic rim lighting.', 
      duration: 5,
      poster: "/cinematic1.png"
    },
    { 
      id: 2, 
      title: 'Scene 2', 
      description: 'Dynamic sequence showing the product in use. Quick cuts between macro details.', 
      duration: 10,
      poster: "/cinematic2.png"
    },
  ])

  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle') // idle, saving, saved
  const [regeneratingIds, setRegeneratingIds] = useState([])
  const [isCompiling, setIsCompiling] = useState(false)

  const handleSave = () => {
    setSaveStatus('saving')
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }, 1200)
  }

  const handleRegenerate = (id) => {
    setRegeneratingIds(prev => [...prev, id])
    setTimeout(() => {
      setRegeneratingIds(prev => prev.filter(reqId => reqId !== id))
    }, 2500)
  }

  const handleCompile = () => {
    setIsCompiling(true)
    setTimeout(() => {
      setIsCompiling(false)
      alert("Compilation complete! Your master video is ready for download.")
    }, 3000)
  }

  const updateScene = (id, updates) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const addSceneAt = (index) => {
    const newId = scenes.length > 0 ? Math.max(...scenes.map(s => s.id)) + 1 : 1
    const newScene = { 
      id: newId, 
      title: `Scene ${newId}`, 
      description: '', 
      duration: 5,
      poster: "/cinematic1.png" 
    }
    setScenes(prev => {
      const copy = [...prev]
      copy.splice(index, 0, newScene)
      // Re-title scenes to maintain order visually
      return copy.map((s, i) => ({ ...s, title: `Scene ${i + 1}` }))
    })
  }

  const deleteScene = (id) => {
    setScenes(prev => {
      const remaining = prev.filter(s => s.id !== id)
      return remaining.map((s, i) => ({ ...s, title: `Scene ${i + 1}` }))
    })
  }

  return (
    <div className="flow-page-layout">
      {/* Top Fixed Header */}
      <header className="flow-header">
        <div className="flow-header-left">
          <button className="flow-back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
          </button>
          <div className="flow-project-meta">
            <span className="flow-badge">NEXORYX STUDIO</span>
            <h1 className="flow-title">{topic}</h1>
          </div>
        </div>

        <div className="flow-header-actions">
          <span className="flow-auto-save"><span className="dot"></span> AUTO-SAVING</span>
          <button
            className={`flow-btn-save ${saveStatus === 'saved' ? 'success' : ''}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {saveStatus === 'saving' ? <Loader2 size={16} className="spin" /> : saveStatus === 'saved' ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Draft'}
          </button>
        </div>
      </header>

      {/* Main Vertical Flow Center */}
      <main className="flow-main-container">
        <div className="flow-canvas">
          
          <AnimatePresence>
            {scenes.map((scene, idx) => {
              const videoUrl = MOCK_VIDEOS[(scene.id - 1) % MOCK_VIDEOS.length]
              const isRegenerating = regeneratingIds.includes(scene.id)

              return (
                <motion.div 
                  key={scene.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flow-node-wrapper"
                >
                  {/* SCENE BLOCK */}
                  <div className="flow-scene-card glass-panel">
                    <div className="fsc-video-area">
                      {isRegenerating ? (
                        <div className="fsc-video-placeholder pulse-overlay">
                          <Loader2 size={32} className="spin text-indigo" />
                          <span>Generating Video...</span>
                        </div>
                      ) : (
                        <video 
                          src={videoUrl} 
                          controls 
                          controlsList="nodownload" 
                          className="fsc-video-player" 
                          poster={scene.poster} 
                        />
                      )}
                    </div>

                    <div className="fsc-details-area">
                      <div className="fsc-header">
                        <div className="fsc-meta-group">
                          <span className="sc-badge">{scene.title}</span>
                          <span className="sc-duration-badge"><Clock size={12}/> {scene.duration}s</span>
                        </div>
                        <button className="icon-btn-danger" onClick={() => deleteScene(scene.id)} title="Delete Scene">
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="fsc-prompt-box">
                        <label>SCENE PROMPT</label>
                        <textarea
                          className="fsc-textarea"
                          value={scene.description}
                          onChange={(e) => updateScene(scene.id, { description: e.target.value })}
                          placeholder="Describe the cinematic action occurring in this scene..."
                        />
                      </div>

                      <div className="fsc-footer">
                        <button className="flow-btn-primary" onClick={() => handleRegenerate(scene.id)} disabled={isRegenerating}>
                          <RefreshCw size={14} className={isRegenerating ? "spin" : ""} /> 
                          {isRegenerating ? "GENERATING..." : "REGENERATE CLIP"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CONNECTION LINE & PLUS BUTTON */}
                  <div className="flow-connection">
                    <div className="fc-line"></div>
                    <button className="fc-add-btn" onClick={() => addSceneAt(idx + 1)} title="Add Scene Here">
                      <Plus size={18} />
                    </button>
                    {idx === scenes.length - 1 && <div className="fc-line fc-line-extended"></div>}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {scenes.length === 0 && (
            <div className="flow-empty-state">
              <Film size={48} className="text-muted mb-4" />
              <h3>Your Pipeline is Empty</h3>
              <p>Start your cinematic journey by adding your first scene.</p>
              <button className="flow-btn-primary mt-4" onClick={() => addSceneAt(0)}>
                <Plus size={16} /> CREATE INITIAL SCENE
              </button>
            </div>
          )}

          {/* FINAL MASTER COMPILATION SECTION */}
          {scenes.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flow-final-section glass-panel-heavy"
            >
              <div className="final-header">
                <h2>Master Video Compilation</h2>
                <p>Preview the seamless combination of all your generated scenes above.</p>
              </div>

              <div className="final-video-wrapper">
                <video 
                  src={MOCK_VIDEOS[0]} 
                  controls 
                  preload="metadata"
                  className="master-video-player"
                  poster="/cinematic1.png"
                />
              </div>

              <div className="final-actions">
                <button 
                  className={`flow-btn-compile ${isCompiling ? 'compiling' : ''}`}
                  onClick={handleCompile}
                  disabled={isCompiling}
                >
                  {isCompiling ? <Loader2 size={20} className="spin" /> : <Film size={20} />}
                  {isCompiling ? "COMPILING PIPELINE..." : "COMPILE & DOWNLOAD MASTER"}
                </button>
              </div>
            </motion.div>
          )}

          {/* Bottom Padding spacer */}
          <div className="flow-bottom-spacer"></div>

        </div>
      </main>
    </div>
  )
}

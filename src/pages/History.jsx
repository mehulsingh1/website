import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Film, Play, Trash2, Calendar, Clock, Download, Sparkles, X } from 'lucide-react'
import { useHistory } from '../components/HistoryContext'

export default function History() {
  const { history, deleteVideo } = useHistory()
  const [selectedVideo, setSelectedVideo] = useState(null)

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="history-page" style={{ paddingTop: '100px', minHeight: '100vh', paddingBottom: '50px' }}>
      <div className="profile-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="history-header"
          style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}
        >
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Film size={32} /> Video History
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              All your generated cinematic sequences in one place.
            </p>
          </div>
          <Link to="/architect" className="arch-btn arch-btn--compile" style={{ textDecoration: 'none' }}>
            <Sparkles size={16} /> Create New
          </Link>
        </motion.div>

        {history.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="profile-empty-card glass-panel"
            style={{ textAlign: 'center', padding: '4rem 2rem' }}
          >
            <Film size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.5 }} />
            <h2>No videos yet</h2>
            <p style={{ marginBottom: '2rem' }}>Start generating your first cinematic masterpiece.</p>
            <Link to="/architect" className="profile-signin-btn" style={{ display: 'inline-flex' }}>
              Open Architect
            </Link>
          </motion.div>
        ) : (
          <div className="history-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
            {history.map((video, idx) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="history-card glass-panel"
                style={{ overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column' }}
              >
                <div className="history-card-video" style={{ position: 'relative', aspectRatio: '16/9', backgroundColor: '#000', cursor: 'pointer' }} onClick={() => setSelectedVideo(video)}>
                  <video
                    src={video.videoUrl}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    onMouseEnter={(e) => { e.target.play().catch(() => {}) }}
                    onMouseLeave={(e) => { e.target.pause() }}
                  />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}>
                      <Play size={24} fill="currentColor" style={{ marginLeft: '4px' }} />
                    </div>
                  </div>
                </div>
                
                <div className="history-card-info" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', lineHeight: 1.3 }}>
                    {video.title}
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} /> {formatDate(video.date)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={14} /> {formatDuration(video.duration)} • <span className="arch-header__badge" style={{ padding: '2px 8px' }}>{video.quality}</span>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                    <a href={video.videoUrl} download={`${video.title}.mp4`} className="arch-btn" style={{ flex: 1, justifyContent: 'center', padding: '0.5rem', textDecoration: 'none' }}>
                      <Download size={14} /> Download
                    </a>
                    <button 
                      className="arch-icon-btn arch-icon-btn--danger" 
                      onClick={() => deleteVideo(video.id)}
                      title="Delete Video"
                      style={{ padding: '0.5rem' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Full Screen Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onClick={() => setSelectedVideo(null)}
          >
            <button 
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%',
                color: 'white',
                cursor: 'pointer',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                zIndex: 10000
              }}
              onClick={() => setSelectedVideo(null)}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,0,0,0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
            >
              <X size={24} />
            </button>
            <div style={{ position: 'relative', width: '90%', maxWidth: '1200px', aspectRatio: '16/9', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
              <video
                src={selectedVideo.videoUrl}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                controls
                autoPlay
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

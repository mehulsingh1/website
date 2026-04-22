import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import {
  User, Mail, Calendar, Zap, Rocket,
  LogOut, Settings, Shield, Clock, Film,
  ArrowRight, Sparkles, ChevronRight, Play, Film as FilmIcon
} from 'lucide-react'
import { useAuth } from '../components/AuthContext'
import { useHistory } from '../components/HistoryContext'

export default function Profile() {
  const { user, logout } = useAuth()
  const { history } = useHistory()
  const navigate = useNavigate()

  if (!user) {
    return (
      <div className="profile-empty-state">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="profile-empty-card glass-panel"
        >
          <User className="profile-empty-icon" size={48} />
          <h2>Welcome to Nexoryx</h2>
          <p>Please sign in to view your cinematic projects and manage your cinematic workspace.</p>
          <Link to="/login" className="profile-signin-btn">
            Account Login <ArrowRight size={18} style={{ marginLeft: 8 }} />
          </Link>
        </motion.div>
      </div>
    )
  }

  const tokenPercent = (user.tokens / user.total_tokens) * 100

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* --- Hero Profile Card --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="profile-hero glass-panel"
        >
          <div className="profile-avatar-wrap">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.name} className="profile-avatar-img" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
            ) : (
              <div className="profile-avatar">
                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="profile-plan-badge">
              <Shield size={10} /> {user.plan}
            </div>
          </div>

          <div className="profile-hero-info">
            <h1 className="profile-name">{user.name}</h1>
            <div className="profile-email"><Mail size={14} /> {user.email}</div>
            <div className="profile-since"><Calendar size={14} /> Member since {user.joined}</div>
          </div>

          <div className="profile-hero-actions">
            <Link to="/pricing" className="profile-upgrade-btn">
              <Rocket size={14} /> Upgrade
            </Link>
            <button className="profile-logout-btn" onClick={() => { logout(); navigate('/') }}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </motion.div>

        {/* --- Stats Row --- */}
        <div className="profile-stats-row">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="profile-stat-card glass-panel"
          >
            <div className="profile-stat-icon"><Film size={20} /></div>
            <div className="profile-stat-value">{user.videos_created}</div>
            <div className="profile-stat-label">Videos Created</div>
            <div className="profile-stat-sub">Across all projects</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="profile-stat-card glass-panel"
          >
            <div className="profile-stat-icon"><Zap size={20} /></div>
            <div className="profile-stat-value">{user.tokens.toLocaleString()}</div>
            <div className="profile-stat-label">Tokens Left</div>
            <div className="profile-stat-sub">Resets next month</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="profile-stat-card glass-panel"
          >
            <div className="profile-stat-icon"><Clock size={20} /></div>
            <div className="profile-stat-value">12.4h</div>
            <div className="profile-stat-label">Export Time</div>
            <div className="profile-stat-sub">Saved with AI</div>
          </motion.div>
        </div>

        {/* --- Token Usage Meter --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="profile-tokens-card glass-panel"
        >
          <div className="profile-tokens-header">
            <div>
              <h3>Cinematic Tokens</h3>
              <p>Your tokens fuel every frame, camera move, and lighting setup.</p>
            </div>
            <Link to="/pricing" className="profile-get-more-btn">
              Get More Tokens <ChevronRight size={14} />
            </Link>
          </div>
          <div className="profile-token-bar-track">
            <motion.div
              className="profile-token-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${tokenPercent}%` }}
              transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
            />
          </div>
          <div className="profile-token-counts">
            <span>{user.tokens.toLocaleString()} remaining</span>
            <span>{user.total_tokens.toLocaleString()} total</span>
          </div>
        </motion.div>

        {/* --- Recent Projects --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="profile-recent glass-panel"
        >
          <div className="profile-section-header">
            <h3>Recent Creations</h3>
            <Link to="/architect" className="profile-view-all">Open Architect <Sparkles size={14} /></Link>
          </div>

          <div className="profile-video-list">
            {history.slice(0, 3).map((vid) => (
              <div key={vid.id} className="profile-video-item">
                <div className="profile-video-thumb">
                  {vid.videoUrl ? (
                    <video src={vid.videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} autoPlay loop muted />
                  ) : (
                    <Play size={16} />
                  )}
                </div>
                <div className="profile-video-info">
                  <div className="profile-video-title">{vid.title}</div>
                  <div className="profile-video-meta">
                    {new Date(vid.date).toLocaleDateString()} · {vid.duration}s · {vid.quality}
                  </div>
                </div>
                <div className="profile-video-status">
                  Completed
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
                <FilmIcon size={24} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                No recent creations. Head to Architect to get started!
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  )
}

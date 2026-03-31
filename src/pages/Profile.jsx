import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import {
  User, Mail, Calendar, Zap, Rocket,
  LogOut, Settings, Shield, Clock, Film,
  ArrowRight, Sparkles, ChevronRight, Play
} from 'lucide-react'
import { useAuth } from '../components/AuthContext'

export default function Profile() {
  const { user, logout } = useAuth()
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
            <div className="profile-avatar">
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
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
            {[
              { id: 1, name: "Midnight Cyberpunk City", date: "2h ago", scenes: 12, quality: "4K" },
              { id: 2, name: "Luxury Watch Commercial", date: "1d ago", scenes: 8, quality: "4K" },
              { id: 3, name: "Golden Hour Desert Flyover", date: "3d ago", scenes: 24, quality: "8K" },
            ].map((vid) => (
              <div key={vid.id} className="profile-video-item">
                <div className="profile-video-thumb">
                  <Play size={16} />
                </div>
                <div className="profile-video-info">
                  <div className="profile-video-title">{vid.name}</div>
                  <div className="profile-video-meta">
                    {vid.date} · {vid.scenes} scenes · {vid.quality}
                  </div>
                </div>
                <div className="profile-video-status">
                  Completed
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  )
}

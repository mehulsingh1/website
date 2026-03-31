import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Mail, Lock, User, Eye, EyeOff,
  ChevronRight, Sparkles, Shield, AlertCircle,
  Loader2, ArrowRight
} from 'lucide-react'
import { useAuth } from '../components/AuthContext'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPass, setShowPass] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const { login, signup, loading, error } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect if already logged in handled by App.jsx or useEffect here
  const from = location.state?.from?.pathname || '/profile'

  const handleSubmit = async (e) => {
    e.preventDefault()
    let success = false
    if (isLogin) {
      success = await login(email, password)
    } else {
      success = await signup(email, password, name)
    }
    if (success) {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="login-page">
      <div className="login-glow" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="login-card glass-panel"
      >
        <Link to="/" className="login-logo">
          Nexo<span>ryx</span>
        </Link>
        <div className="login-subtitle">
          {isLogin
            ? 'Access your cinematic workspace and continue creating.'
            : 'Join the next generation of cinematic AI directors.'}
        </div>

        <div className="login-tabs">
          <button
            className={`login-tab ${isLogin ? 'login-tab--active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Sign In
          </button>
          <button
            className={`login-tab ${!isLogin ? 'login-tab--active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Create Account
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="login-field">
              <label className="login-label"><User size={14} /> Full Name</label>
              <input
                className="login-input"
                type="text"
                placeholder="Bruce Wayne"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="login-field">
            <label className="login-label"><Mail size={14} /> Email Address</label>
            <input
              className="login-input"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label className="login-label"><Lock size={14} /> Password</label>
            <div className="login-input-wrap">
              <input
                className="login-input login-input--pass"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="login-error"
              >
                <AlertCircle size={14} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button className="login-submit-btn" type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="spinning" size={18} />
            ) : (
              <>
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                <ChevronRight size={18} />
              </>
            )}
          </button>

          <div className="login-hint">
            Demo: any email + password (6+ chars)
          </div>

          <div className="login-divider">
            <span />
            <small>OR</small>
            <span />
          </div>

          <button type="button" className="login-google-btn">
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </form>

        <div className="login-footer-link">
          Forgot password? <button className="login-switch-btn">Reset here</button>
        </div>

        <div className="login-pricing-link">
          <Link to="/pricing" className="login-switch-btn">View pricing & plans</Link>
        </div>
      </motion.div>
    </div>
  )
}

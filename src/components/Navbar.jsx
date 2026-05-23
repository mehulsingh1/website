import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sparkles, Rocket, Sun, Moon, User, LogOut, Menu, X, ChevronDown } from 'lucide-react'
import { useTheme } from './ThemeContext'
import { useAuth } from './AuthContext'

export default function Navbar() {
  const location = useLocation()
  const isArchitect = location.pathname === '/architect'
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className="navbar">
      <Link to="/" className="navbar__logo" onClick={closeMenu}>
        Nexo<span>ryx</span>
      </Link>

      <button
        className="navbar__hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle navigation menu"
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <div className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
        <Link to="/#showcase" className="navbar__link" onClick={closeMenu}>Showcase</Link>
        <Link to="/generate" className="navbar__link" onClick={closeMenu}>Quick Generate</Link>
        <Link to="/pricing" className="navbar__link" onClick={closeMenu}>Pricing</Link>
        <div className="navbar__dropdown">
          <span className="navbar__link">Clip Studio <ChevronDown size={14} style={{ display: 'inline', marginLeft: '4px' }} /></span>
          <div className="navbar__dropdown-menu">
            <Link to="/clip-studio" className="navbar__dropdown-item" onClick={closeMenu}>Faceless Creator</Link>
            <Link to="/clip-studio/marketing" className="navbar__dropdown-item" onClick={closeMenu}>Marketing Admaker</Link>
            <Link to="/clip-studio/cinematic" className="navbar__dropdown-item" onClick={closeMenu}>Cinematic Video Creator</Link>
          </div>
        </div>
        <Link to="/history" className="navbar__link" onClick={closeMenu}>History</Link>

        <button
          className="theme-toggle"
          onClick={() => { toggleTheme(); closeMenu() }}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          id="theme-toggle-btn"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {isArchitect ? (
          <Link to="/" className="navbar__cta" onClick={closeMenu}>
            <Sparkles size={14} style={{ marginRight: 6, display: 'inline' }} />
            Home
          </Link>
        ) : (
          <Link to="/architect" className="navbar__cta" onClick={closeMenu}>
            <Rocket size={14} style={{ marginRight: 6, display: 'inline' }} />
            Launch Architect
          </Link>
        )}

        {user ? (
          <div className="navbar__user-menu">
            <Link to="/profile" className="navbar__avatar" title={user.name} onClick={closeMenu} style={{ padding: user.photoUrl ? 0 : '', overflow: 'hidden' }}>
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
              )}
            </Link>
          </div>
        ) : (
          <Link to="/login" className="navbar__login-btn" id="navbar-login-btn" onClick={closeMenu}>
            <User size={14} />
            Sign In
          </Link>
        )}
      </div>
    </nav>
  )
}

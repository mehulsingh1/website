import { Link, useLocation } from 'react-router-dom'
import { Sparkles, Rocket, Sun, Moon } from 'lucide-react'
import { useTheme } from './ThemeContext'

export default function Navbar() {
  const location = useLocation()
  const isArchitect = location.pathname === '/architect'
  const { theme, toggleTheme } = useTheme()

  return (
    <nav className="navbar">
      <Link to="/" className="navbar__logo">
        Nexo<span>ryx</span>
      </Link>

      <div className="navbar__links">
        <Link to="/#showcase" className="navbar__link">Showcase</Link>
        <a href="#features" className="navbar__link">Features</a>

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          id="theme-toggle-btn"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {isArchitect ? (
          <Link to="/" className="navbar__cta">
            <Sparkles size={14} style={{ marginRight: 6, display: 'inline' }} />
            Home
          </Link>
        ) : (
          <Link to="/architect" className="navbar__cta">
            <Rocket size={14} style={{ marginRight: 6, display: 'inline' }} />
            Launch Architect
          </Link>
        )}
      </div>
    </nav>
  )
}

import { Link, useLocation } from 'react-router-dom'
import { Sparkles, Rocket } from 'lucide-react'

export default function Navbar() {
  const location = useLocation()
  const isArchitect = location.pathname === '/architect'

  return (
    <nav className="navbar">
      <Link to="/" className="navbar__logo">
        Nexo<span>ryx</span>
      </Link>

      <div className="navbar__links">
        <Link to="/#showcase" className="navbar__link">Showcase</Link>
        <a href="#features" className="navbar__link">Features</a>

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

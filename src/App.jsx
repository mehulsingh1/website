import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import BackgroundEffects from './components/BackgroundEffects'
import Landing from './pages/Landing'
import Architect from './pages/Architect'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Pricing from './pages/Pricing'
import History from './pages/History'
import Generate from './pages/Generate'
import ClipStudio from './pages/ClipStudio'
import MarketingStudio from './pages/MarketingStudio'
import CinematicStudio from './pages/CinematicStudio'
import { AuthProvider } from './components/AuthContext'
import { HistoryProvider } from './components/HistoryContext'

function App() {
  return (
    <AuthProvider>
      <HistoryProvider>
        <BackgroundEffects />
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/architect" element={<Architect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/history" element={<History />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/clip-studio" element={<ClipStudio />} />
          <Route path="/clip-studio/marketing" element={<MarketingStudio />} />
          <Route path="/clip-studio/cinematic" element={<CinematicStudio />} />
        </Routes>
      </HistoryProvider>
    </AuthProvider>
  )
}

export default App

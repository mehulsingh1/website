import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import BackgroundEffects from './components/BackgroundEffects'
import Landing from './pages/Landing'
import Architect from './pages/Architect'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Pricing from './pages/Pricing'
import History from './pages/History'
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
        </Routes>
      </HistoryProvider>
    </AuthProvider>
  )
}

export default App

import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import BackgroundEffects from './components/BackgroundEffects'
import Landing from './pages/Landing'
import Architect from './pages/Architect'

function App() {
  return (
    <>
      <BackgroundEffects />
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/architect" element={<Architect />} />
      </Routes>
    </>
  )
}

export default App

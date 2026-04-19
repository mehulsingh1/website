import { createContext, useContext, useState, useEffect } from 'react'

const HistoryContext = createContext()

export function HistoryProvider({ children }) {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('nexoryx_history')
    if (saved) return JSON.parse(saved)
    return [
      { id: 1, title: 'Midnight Cyberpunk City', date: new Date(Date.now() - 7200000).toISOString(), duration: 12, quality: '4K', videoUrl: '/generation.mp4' },
      { id: 2, title: 'Luxury Watch Commercial', date: new Date(Date.now() - 86400000).toISOString(), duration: 8, quality: '4K', videoUrl: '/generation1.mp4' },
      { id: 3, title: 'Epic Mountain Flight', date: new Date(Date.now() - 259200000).toISOString(), duration: 15, quality: '8K', videoUrl: '/final.mp4' },
    ]
  })

  useEffect(() => {
    localStorage.setItem('nexoryx_history', JSON.stringify(history))
  }, [history])

  const addVideo = (video) => {
    setHistory(prev => [
      {
        id: Date.now(),
        date: new Date().toISOString(),
        ...video
      },
      ...prev
    ])
  }

  const deleteVideo = (id) => {
    setHistory(prev => prev.filter(v => v.id !== id))
  }

  return (
    <HistoryContext.Provider value={{ history, addVideo, deleteVideo }}>
      {children}
    </HistoryContext.Provider>
  )
}

export const useHistory = () => useContext(HistoryContext)

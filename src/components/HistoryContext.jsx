import { createContext, useContext, useState, useEffect } from 'react'

const HistoryContext = createContext()

export function HistoryProvider({ children }) {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('nexoryx_history_v2')
    if (saved) return JSON.parse(saved)
    return [
      { id: 1, title: 'Dark Romance Mafia', date: new Date(Date.now() - 7200000).toISOString(), duration: 45, quality: '4K', videoUrl: '/generation.mp4' },
      { id: 2, title: 'Racing Company Ceo', date: new Date(Date.now() - 86400000).toISOString(), duration: 60, quality: '4K', videoUrl: '/generation1.mp4' },
      { id: 3, title: 'Shark Survival Fighting', date: new Date(Date.now() - 259200000).toISOString(), duration: 45, quality: '8K', videoUrl: '/new_generation.mp4' },
    ]
  })

  useEffect(() => {
    localStorage.setItem('nexoryx_history_v2', JSON.stringify(history))
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

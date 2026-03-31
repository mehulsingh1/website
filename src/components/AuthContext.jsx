import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Demo effect to check local storage
  useEffect(() => {
    const savedUser = localStorage.getItem('nexoryx_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    setError(null)
    setLoading(true)
    
    // Demo logic: any email + password >= 6 chars
    try {
      await new Promise(resolve => setTimeout(resolve, 800)) // Simulation
      
      if (password.length >= 6) {
        const userData = {
          name: 'Urvashi Mehta',
          email: email,
          plan: 'Pro',
          tokens: 4820,
          total_tokens: 10000,
          joined: 'March 2026',
          videos_created: 37,
        }
        setUser(userData)
        localStorage.setItem('nexoryx_user', JSON.stringify(userData))
        return true
      } else {
        throw new Error('Invalid credentials')
      }
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const signup = async (email, password, name) => {
    setError(null)
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const userData = {
        name: name || 'New User',
        email: email,
        plan: 'Free',
        tokens: 500,
        total_tokens: 500,
        joined: 'March 2026',
        videos_created: 0,
      }
      setUser(userData)
      localStorage.setItem('nexoryx_user', JSON.stringify(userData))
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('nexoryx_user')
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

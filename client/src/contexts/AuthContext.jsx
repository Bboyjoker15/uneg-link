import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

function decodificarToken(token) {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return decoded
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingToken, setPendingToken] = useState(null)
  const [pendingUser, setPendingUser] = useState(null)
  const DIAS_UMBRAL = 7

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      const payload = decodificarToken(token)
      if (!payload || payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setLoading(false)
        return
      }
      const issuedAt = new Date(payload.iat * 1000)
      const ahora = new Date()
      const diffDias = (ahora - issuedAt) / (1000 * 60 * 60 * 24)

      if (diffDias > DIAS_UMBRAL) {
        setPendingToken(token)
        setPendingUser(JSON.parse(savedUser))
        setLoading(false)
        return
      }

      setUser(JSON.parse(savedUser))
      api.get('/auth/me').then(res => {
        setUser(res.data)
        localStorage.setItem('user', JSON.stringify(res.data))
      }).catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      }).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (cedula, password, rememberMe = false) => {
    const res = await api.post('/auth/login', { cedula, password, rememberMe })
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data
  }

  const register = async (nombre, cedula, password) => {
    const res = await api.post('/auth/register', { nombre, cedula, password })
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data
  }

  const verifyPassword = async (password) => {
    const res = await api.post('/auth/verify-password', { password })
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    setPendingToken(null)
    setPendingUser(null)
    return res.data
  }

  const cancelVerify = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setPendingToken(null)
    setPendingUser(null)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setPendingToken(null)
    setPendingUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, pendingToken, pendingUser, login, register, verifyPassword, cancelVerify, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

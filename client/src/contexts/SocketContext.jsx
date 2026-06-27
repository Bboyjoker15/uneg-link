import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext()

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!user) return

    const token = localStorage.getItem('token')
    const s = io('/', {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))

    setSocket(s)

    return () => {
      s.disconnect()
    }
  }, [user])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)

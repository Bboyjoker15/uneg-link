import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from './AuthContext'

const AGENT_URL = 'wss://uneg-chat-v2.armandodt2004.workers.dev'

const AgentContext = createContext()

export function AgentProvider({ children }) {
  const { user } = useAuth()
  const [ws, setWs] = useState(null)
  const [connected, setConnected] = useState(false)
  const listenersRef = useRef(new Map())
  const reconnectRef = useRef(null)

  const connect = useCallback((channelId) => {
    if (!user || !channelId) return

    const url = `${AGENT_URL}/chat/${channelId}/ws?userId=${user.id}&userName=${encodeURIComponent(user.nombre)}`
    const socket = new WebSocket(url)

    socket.onopen = () => {
      setConnected(true)
      setWs(socket)
      emit('connect', {})
    }

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      const handlers = listenersRef.current.get(data.type) || []
      handlers.forEach(fn => fn(data))
      // Also fire wildcard
      const all = listenersRef.current.get('*') || []
      all.forEach(fn => fn(data))
    }

    socket.onclose = () => {
      setConnected(false)
      setWs(null)
      emit('disconnect', {})
      reconnectRef.current = setTimeout(() => connect(channelId), 3000)
    }

    socket.onerror = () => {
      socket.close()
    }

    return () => {
      clearTimeout(reconnectRef.current)
      socket.close()
    }
  }, [user])

  const sendMessage = useCallback((data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }, [ws])

  const on = useCallback((event, fn) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, [])
    }
    listenersRef.current.get(event).push(fn)
    return () => {
      const handlers = listenersRef.current.get(event) || []
      listenersRef.current.set(event, handlers.filter(h => h !== fn))
    }
  }, [])

  const emit = useCallback((event, data) => {
    const handlers = listenersRef.current.get(event) || []
    handlers.forEach(fn => fn({ ...data, type: event }))
  }, [])

  const sendChat = useCallback((text, sectionSubjectId, channelName) => {
    sendMessage({ type: 'message', text, sectionSubjectId, channelName })
  }, [sendMessage])

  const sendAI = useCallback((text, sectionSubjectId, channelName) => {
    sendMessage({ type: 'ai', mode: 'ai', text, sectionSubjectId, channelName })
  }, [sendMessage])

  const sendTyping = useCallback(() => {
    sendMessage({ type: 'typing' })
  }, [sendMessage])

  const sendStopTyping = useCallback(() => {
    sendMessage({ type: 'stop_typing' })
  }, [sendMessage])

  const disconnect = useCallback(() => {
    if (ws) ws.close()
    clearTimeout(reconnectRef.current)
  }, [ws])

  return (
    <AgentContext.Provider value={{
      ws, connected, connect, disconnect,
      sendChat, sendAI, sendMessage, sendTyping, sendStopTyping,
      on, emit
    }}>
      {children}
    </AgentContext.Provider>
  )
}

export function useAgent() {
  return useContext(AgentContext)
}

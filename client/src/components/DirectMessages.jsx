import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { FiSend, FiMessageSquare, FiArrowLeft, FiUser } from 'react-icons/fi'

export default function DirectMessages({ onViewProfile }) {
  const { user } = useAuth()
  const { socket, connected } = useSocket()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [msgLoading, setMsgLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (!socket) return
    const handleDirectMessage = (msg) => {
      if (activeConv && msg.conversationId === activeConv.id) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      }
      loadConversations()
    }
    socket.on('direct-message', handleDirectMessage)
    return () => socket.off('direct-message', handleDirectMessage)
  }, [socket, activeConv])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = async () => {
    try {
      const res = await api.get('/direct-messages/conversations')
      setConversations(res.data)
    } catch (err) {
      console.error('Error loading conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  const openConversation = async (conv) => {
    setActiveConv(conv)
    setMsgLoading(true)
    try {
      const res = await api.get(`/direct-messages/conversations/${conv.id}/messages`)
      setMessages(res.data)
    } catch (err) {
      console.error('Error loading messages:', err)
    } finally {
      setMsgLoading(false)
    }
  }

  const startConversation = async (userId) => {
    try {
      const res = await api.post(`/direct-messages/conversations/${userId}`)
      openConversation(res.data)
      loadConversations()
    } catch (err) {
      console.error('Error starting conversation:', err)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const text = input.trim()
    setInput('')
    try {
      const res = await api.post(`/direct-messages/conversations/${activeConv.id}/messages`, { contenido: text })
      setMessages(prev => [...prev, res.data])
      loadConversations()
    } catch (err) {
      console.error('Error sending DM:', err)
    }
  }

  if (activeConv) {
    const other = activeConv.otherUser || activeConv.participants?.find(p => p.userId !== user.id)?.user
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--color-border-default)]">
          <button onClick={() => setActiveConv(null)} className="p-1 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
            <FiArrowLeft size={18} />
          </button>
          <button onClick={() => onViewProfile?.(other?.id)} className="flex items-center gap-2 hover:underline">
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium overflow-hidden">
              {other?.avatar ? <img src={other.avatar} alt="" /> : other?.nombre?.[0] || '?'}
            </div>
            <span className="font-semibold text-[var(--color-text-primary)] text-sm">{other?.nombre || 'Usuario'}</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {msgLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-[var(--color-text-secondary)] py-8">No hay mensajes aún</p>
          ) : messages.map(msg => {
            const isOwn = msg.senderId === user.id
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                  isOwn ? 'bg-blue-500 text-white rounded-br-md' : 'bg-gray-100 dark:bg-gray-700 text-[var(--color-text-primary)] rounded-bl-md'
                }`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.contenido}</p>
                  <p className={`text-[10px] mt-0.5 ${isOwn ? 'text-blue-200' : 'text-[var(--color-text-secondary)]'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-[var(--color-border-default)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" disabled={!input.trim()} className="p-2.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
              <FiSend size={18} />
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 py-3 border-b border-[var(--color-border-default)]">
        <h2 className="font-semibold text-[var(--color-text-primary)]">Mensajes Directos</h2>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <FiMessageSquare size={40} className="mx-auto mb-3 text-[var(--color-text-secondary)] opacity-30" />
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">Sin conversaciones</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Haz clic en el perfil de un compañero para iniciar un chat privado</p>
          </div>
        ) : conversations.map(conv => (
          <button
            key={conv.id}
            onClick={() => openConversation(conv)}
            className="w-full flex items-center gap-3 px-6 py-3 hover:bg-[var(--color-bg-secondary)] transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium overflow-hidden flex-shrink-0">
              {conv.otherUser?.avatar ? <img src={conv.otherUser.avatar} alt="" className="w-full h-full object-cover" /> : conv.otherUser?.nombre?.[0] || <FiUser size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{conv.otherUser?.nombre || 'Usuario'}</p>
              {conv.lastMessage && (
                <p className="text-xs text-[var(--color-text-secondary)] truncate">{conv.lastMessage.contenido}</p>
              )}
            </div>
            {conv.lastMessage && (
              <span className="text-[10px] text-[var(--color-text-secondary)] flex-shrink-0">
                {new Date(conv.lastMessage.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

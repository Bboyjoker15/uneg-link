import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { FiSend, FiPaperclip, FiCpu, FiDownload, FiVolume2, FiEdit3, FiCheck, FiChevronDown, FiChevronRight } from 'react-icons/fi'

export default function ChatArea({ channel, sectionSubjectId, onViewProfile }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [consultAI, setConsultAI] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const typingTimeoutRef = useRef({})
  const [announceMode, setAnnounceMode] = useState('off')
  const [customAnnouncement, setCustomAnnouncement] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [announceLoading, setAnnounceLoading] = useState(false)
  const [aiAnnouncementPreview, setAiAnnouncementPreview] = useState(null)
  const [showAIMessages, setShowAIMessages] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const { socket, connected } = useSocket()
  const { user } = useAuth()

  const isAnnounceChannel = channel?.nombre === 'Anuncios'
  const isProfessor = user?.role === 'PROFESOR'

  useEffect(() => {
    if (!channel) return
    loadMessages()
    setMessages([])
    setConsultAI(false)
  }, [channel?.id])

  useEffect(() => {
    if (!socket || !channel) return

    socket.emit('join-channel', channel.id)

    const handleNewMessage = (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    }
    const handleAIResponse = (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setAiLoading(false)
    }
    const handleTyping = (data) => {
      if (data.userId !== user.id) {
        setTypingUsers(prev => prev.map(u =>
          u.userId === data.userId
            ? { ...u, timestamp: Date.now() }
            : u
        ).concat(
          prev.some(u => u.userId === data.userId) ? [] : [{ userId: data.userId, nombre: data.nombre, timestamp: Date.now() }]
        ))
      }
    }
    const handleStopTyping = (data) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId))
    }

    socket.on('new-message', handleNewMessage)
    socket.on('ai-response', handleAIResponse)
    socket.on('typing', handleTyping)
    socket.on('stop-typing', handleStopTyping)

    return () => {
      socket.emit('leave-channel', channel.id)
      socket.off('new-message', handleNewMessage)
      socket.off('ai-response', handleAIResponse)
      socket.off('typing', handleTyping)
      socket.off('stop-typing', handleStopTyping)
    }
  }, [socket, channel?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (typingUsers.length === 0) return
    const interval = setInterval(() => {
      const now = Date.now()
      setTypingUsers(prev => prev.filter(u => now - u.timestamp < 4000))
    }, 1000)
    return () => clearInterval(interval)
  }, [typingUsers.length])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/messages/${channel.id}`)
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newMsgs = res.data.filter(m => !existingIds.has(m.id))
        if (newMsgs.length === 0) return prev
        return [...prev, ...newMsgs]
      })
    } catch (err) {
      console.error('Error loading messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() && !file) return

    const text = input.trim()
    const isAIRequest = consultAI || text.startsWith('/ia ')
    const cleanText = isAIRequest ? text.replace(/^\/ia\s*/i, '') : text

    if (!cleanText && isAIRequest) return

    if (isAIRequest) {
      setConsultAI(false)
      setAiLoading(true)
      setInput('')
      try {
        await api.post('/ai/ask', {
          channelId: channel.id,
          question: cleanText
        })
      } catch (err) {
        console.error('AI error:', err)
        setAiLoading(false)
      }
    } else {
      const formData = new FormData()
      formData.append('contenido', text)
      if (file) formData.append('file', file)

      try {
        await api.post(`/messages/${channel.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        setInput('')
        setFile(null)
        if (socket) {
          socket.emit('stop-typing', { channelId: channel.id })
        }
      } catch (err) {
        console.error('Error sending message:', err)
      }
    }
  }

  const typingEmitRef = useRef(null)
  const handleTypingEmit = () => {
    if (!socket) return
    if (input) {
      if (!typingEmitRef.current) {
        socket.emit('typing', { channelId: channel.id })
      }
      clearTimeout(typingEmitRef.current)
      typingEmitRef.current = setTimeout(() => {
        typingEmitRef.current = null
      }, 3000)
    } else {
      socket.emit('stop-typing', { channelId: channel.id })
      clearTimeout(typingEmitRef.current)
      typingEmitRef.current = null
    }
  }

  const handleCustomAnnouncement = async (e) => {
    e.preventDefault()
    if (!customAnnouncement.trim()) return
    setAnnounceLoading(true)
    try {
      await api.post(`/subjects/${sectionSubjectId}/announcement`, {
        contenido: customAnnouncement
      })
      setCustomAnnouncement('')
      setAnnounceMode('off')
    } catch (err) {
      console.error('Error creating announcement:', err)
    } finally {
      setAnnounceLoading(false)
    }
  }

  const handleAIAnnouncement = async (e) => {
    e.preventDefault()
    if (!aiPrompt.trim()) return
    setAnnounceLoading(true)
    try {
      const res = await api.post('/ai/announcement', {
        sectionSubjectId,
        prompt: aiPrompt
      })
      setAiAnnouncementPreview(res.data.content)
    } catch (err) {
      console.error('Error generating AI announcement:', err)
    } finally {
      setAnnounceLoading(false)
    }
  }

  const handleConfirmAIAnnouncement = async () => {
    if (!aiAnnouncementPreview) return
    setAnnounceLoading(true)
    try {
      await api.post('/ai/announcement/confirm', {
        sectionSubjectId,
        content: aiAnnouncementPreview
      })
      setAiAnnouncementPreview(null)
      setAiPrompt('')
      setAnnounceMode('off')
    } catch (err) {
      console.error('Error publishing AI announcement:', err)
    } finally {
      setAnnounceLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return '🖼️'
    if (type?.includes('pdf')) return '📄'
    if (type?.includes('word')) return '📝'
    if (type?.includes('text')) return '📃'
    return '📎'
  }

  const formatDate = (date) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now - d
    if (diff < 86400000) {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text-secondary)]">
        <div className="text-center">
          <FiPaperclip size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">Selecciona un canal para empezar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-bg)]">
      <div className="px-6 py-3 border-b border-[var(--color-border-default)] bg-[var(--color-bg)]">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-[var(--color-text-primary)]">
            # {channel.nombre}
          </h2>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            channel.tipo === 'ANUNCIOS' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
            channel.tipo === 'ARCHIVOS' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
            {channel.tipo}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading && <p className="text-center text-[var(--color-text-secondary)] py-4">Cargando mensajes...</p>}

        {(() => {
          const regularMessages = messages.filter(m => !m.isAI)
          const aiMessages = messages.filter(m => m.isAI)
          return (
            <>
              {regularMessages.map(msg => {
                const isOwn = msg.user?.id === user.id
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${isOwn ? 'order-1' : 'order-2'}`}>
                      <div className={`px-4 py-2.5 rounded-2xl ${
                        isOwn
                          ? 'bg-blue-500 text-white rounded-br-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-[var(--color-text-primary)] rounded-bl-md'
                      }`}>
                        {!isOwn && (
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                            <button
                              onClick={() => onViewProfile?.(msg.user.id)}
                              className="hover:underline"
                            >
                              {msg.user?.nombre}
                            </button>
                            {msg.user?.role === 'PROFESOR' && <span className="ml-1 text-yellow-500">●</span>}
                          </p>
                        )}
                        {msg.contenido && (
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {msg.contenido}
                          </p>
                        )}
                        {msg.fileUrl && (
                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 mt-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                              isOwn
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-200 dark:bg-gray-600 text-[var(--color-text-primary)] hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}>
                            <span>{getFileIcon(msg.fileType)}</span>
                            <span className="truncate max-w-[150px]">{msg.fileName || 'Archivo'}</span>
                            <FiDownload size={12} />
                          </a>
                        )}
                      </div>
                      <p className={`text-[10px] text-[var(--color-text-secondary)] mt-0.5 ${isOwn ? 'text-right mr-1' : 'text-left ml-1'}`}>
                        {formatDate(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })}

              {aiMessages.length > 0 && (
                <div className="pt-2 border-t border-purple-200 dark:border-purple-800">
                  <button
                    onClick={() => setShowAIMessages(!showAIMessages)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors w-full text-left"
                  >
                    {showAIMessages ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                    <FiCpu size={14} />
                    Mensajes de IA ({aiMessages.length})
                  </button>
                  {showAIMessages && aiMessages.map(msg => (
                    <div key={msg.id} className="flex justify-start mt-2">
                      <div className="max-w-[75%]">
                        <div className="px-4 py-2.5 rounded-2xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-bl-md">
                          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1">
                            <FiCpu size={12} /> UnegAI
                          </p>
                          {msg.contenido && (
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-[var(--color-text-primary)]">
                              {msg.contenido}
                            </p>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5 ml-1">
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        })()}

        {aiLoading && (
          <div className="flex justify-start">
            <div className="max-w-[75%]">
              <div className="px-4 py-2.5 rounded-2xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-bl-md">
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1">
                  <FiCpu size={12} /> UnegAI
                </p>
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <span className="animate-pulse">Pensando</span>
                  <span className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {typingUsers.length > 0 && (
        <div className="px-6 py-1 text-xs text-[var(--color-text-secondary)] italic">
          {typingUsers.slice(0, 2).map(u => u.nombre).join(', ')}
          {typingUsers.length > 2 && ` y ${typingUsers.length - 2} más`}
          {' '}{typingUsers.length === 1 ? 'está' : 'están'} escribiendo...
        </div>
      )}

      <div className="px-4 py-3 border-t border-[var(--color-border-default)] bg-[var(--color-bg)]">
        {!connected ? (
          <div className="text-center text-sm text-[var(--color-text-secondary)] py-3 flex items-center justify-center gap-2">
            <span>🔌</span>
            <span>Sin conexión — los mensajes se muestran en modo lectura</span>
          </div>
        ) : (
          <>
            {isAnnounceChannel && isProfessor && (
              <div className="mb-3 flex items-center gap-1 px-1">
                <button
                  type="button"
                  onClick={() => { setAnnounceMode('off'); setCustomAnnouncement(''); setAiPrompt('') }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    announceMode === 'off'
                      ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => { setAnnounceMode('custom'); setAiPrompt('') }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    announceMode === 'custom'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <FiEdit3 size={12} />
                  Anuncio personalizado
                </button>
                <button
                  type="button"
                  onClick={() => { setAnnounceMode('ai'); setCustomAnnouncement('') }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    announceMode === 'ai'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <FiCpu size={12} />
                  Anuncio con IA
                </button>
              </div>
            )}

            {announceMode === 'custom' ? (
              <form onSubmit={handleCustomAnnouncement}>
                <textarea
                  value={customAnnouncement}
                  onChange={e => setCustomAnnouncement(e.target.value)}
                  placeholder="Escribe tu anuncio aquí..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none mb-2"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!customAnnouncement.trim() || announceLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500 text-white hover:bg-yellow-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiVolume2 size={16} />
                    {announceLoading ? 'Publicando...' : 'Publicar anuncio'}
                  </button>
                </div>
              </form>
            ) : announceMode === 'ai' ? (
              aiAnnouncementPreview ? (
                <div className="space-y-2">
                  <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-2">Vista previa del anuncio generado por IA:</p>
                    <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{aiAnnouncementPreview}</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setAiAnnouncementPreview(null)}
                      disabled={announceLoading}
                      className="px-4 py-2 rounded-xl border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAIAnnouncement}
                      disabled={announceLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiCheck size={16} />
                      {announceLoading ? 'Publicando...' : 'Publicar anuncio'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAIAnnouncement}>
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="Ej: Recuerda a los estudiantes que el examen final es la próxima semana"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-2"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!aiPrompt.trim() || announceLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiCpu size={16} />
                      {announceLoading ? 'Generando...' : 'Generar con IA'}
                    </button>
                  </div>
                </form>
              )
            ) : (
              <>
                {file && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-secondary)] rounded-lg text-sm">
                    <span>📎</span>
                    <span className="text-[var(--color-text-primary)] truncate">{file.name}</span>
                    <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }} className="text-red-500 hover:text-red-700 ml-auto font-bold">✕</button>
                  </div>
                )}
                <form onSubmit={handleSend} className="flex items-end gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={e => setFile(e.target.files[0])}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    <FiPaperclip size={20} />
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onKeyUp={handleTypingEmit}
                      placeholder={
                        consultAI
                          ? 'Pregúntale a UnegAI...'
                          : `Mensaje en #${channel.nombre}`
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setConsultAI(!consultAI)}
                    className={`p-2.5 rounded-xl transition-colors ${
                      consultAI
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]'
                    }`}
                    title={consultAI ? 'IA activa: el mensaje se enviará a UnegAI' : 'Activar IA'}
                  >
                    <FiCpu size={20} />
                  </button>
                  <button
                    type="submit"
                    disabled={(!input.trim() && !file) || aiLoading}
                    className="p-2.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiSend size={20} />
                  </button>
                </form>
                {consultAI && (
                  <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1.5 ml-1 flex items-center gap-1">
                    <FiCpu size={12} /> IA activa — tu mensaje se enviará a UnegAI con contexto de la materia
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

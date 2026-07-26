import { useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { FiMessageSquare, FiPlus, FiLock, FiUnlock, FiArrowLeft, FiSend, FiChevronRight } from 'react-icons/fi'
import { BsPinAngleFill, BsReplyFill } from 'react-icons/bs'

export default function ForumView({ sectionSubjectId, onViewProfile }) {
  const { user } = useAuth()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewThread, setShowNewThread] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeThread, setActiveThread] = useState(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [replyParentId, setReplyParentId] = useState(null)
  const [replyingTo, setReplyingTo] = useState(null)

  useEffect(() => {
    loadThreads()
  }, [sectionSubjectId])

  const loadThreads = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/forum/${sectionSubjectId}/threads`)
      setThreads(res.data)
    } catch (err) {
      console.error('Error loading threads:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateThread = async (e) => {
    e.preventDefault()
    if (!titulo.trim() || !contenido.trim()) return
    setSubmitting(true)
    try {
      const res = await api.post(`/forum/${sectionSubjectId}/threads`, { titulo, contenido })
      setThreads(prev => [res.data, ...prev])
      setTitulo('')
      setContenido('')
      setShowNewThread(false)
    } catch (err) {
      console.error('Error creating thread:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const loadThread = async (threadId) => {
    setThreadLoading(true)
    setActiveThread(null)
    try {
      const res = await api.get(`/forum/threads/${threadId}`)
      setActiveThread(res.data)
    } catch (err) {
      console.error('Error loading thread:', err)
    } finally {
      setThreadLoading(false)
    }
  }

  const handleReply = async (e) => {
    e.preventDefault()
    if (!replyContent.trim()) return
    setSubmitting(true)
    try {
      const res = await api.post(`/forum/threads/${activeThread.id}/replies`, {
        contenido: replyContent,
        parentId: replyParentId
      })
      setActiveThread(prev => ({
        ...prev,
        replies: [...prev.replies, res.data]
      }))
      setReplyContent('')
      setReplyParentId(null)
      setReplyingTo(null)
    } catch (err) {
      console.error('Error creating reply:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleTogglePin = async (threadId) => {
    try {
      await api.put(`/forum/threads/${threadId}/pin`)
      loadThreads()
    } catch (err) {
      console.error('Error toggling pin:', err)
    }
  }

  const handleToggleClose = async (threadId) => {
    try {
      await api.put(`/forum/threads/${threadId}/close`)
      if (activeThread?.id === threadId) {
        setActiveThread(prev => ({ ...prev, closed: !prev.closed }))
      }
      loadThreads()
    } catch (err) {
      console.error('Error toggling close:', err)
    }
  }

  const isProfessor = user?.role === 'PROFESOR'

  const renderReplies = (replies, depth = 0) => {
    return replies.map(reply => (
      <div key={reply.id} className={`${depth > 0 ? 'ml-6 pl-4 border-l-2 border-[var(--color-border-default)]' : ''}`}>
        <div className="p-3 rounded-lg bg-[var(--color-bg)]">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => onViewProfile?.(reply.user.id)} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              {reply.user.nombre}
            </button>
            {reply.user.role === 'PROFESOR' && <span className="text-yellow-500 text-[10px]">●</span>}
            <span className="text-[10px] text-[var(--color-text-secondary)]">{new Date(reply.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p className="text-sm text-[var(--color-text-primary)]">{reply.contenido}</p>
          <button
            onClick={() => { setReplyingTo(reply.user.nombre); setReplyParentId(reply.id) }}
            className="mt-1 text-[10px] text-[var(--color-text-secondary)] hover:text-blue-500 flex items-center gap-1"
          >
            <BsReplyFill size={10} /> Responder
          </button>
        </div>
        {reply.replies?.length > 0 && renderReplies(reply.replies, depth + 1)}
      </div>
    ))
  }

  if (activeThread) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          <button onClick={() => setActiveThread(null)} className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-4">
            <FiArrowLeft size={16} /> Volver al foro
          </button>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              {activeThread.pinned && <BsPinAngleFill size={14} className="text-emerald-500" />}
              {activeThread.closed && <FiLock size={14} className="text-red-500" />}
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{activeThread.titulo}</h2>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => onViewProfile?.(activeThread.user.id)} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                {activeThread.user.nombre}
              </button>
              {activeThread.user.role === 'PROFESOR' && <span className="text-yellow-500 text-xs">●</span>}
              <span className="text-xs text-[var(--color-text-secondary)]">{new Date(activeThread.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)]">
              <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{activeThread.contenido}</p>
            </div>
            {isProfessor && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleTogglePin(activeThread.id)} className={`text-xs px-2 py-1 rounded ${activeThread.pinned ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`}>
                  {activeThread.pinned ? 'Quitar pin' : 'Fijar'}
                </button>
                <button onClick={() => handleToggleClose(activeThread.id)} className={`text-xs px-2 py-1 rounded ${activeThread.closed ? 'bg-red-100 text-red-700' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`}>
                  {activeThread.closed ? 'Reabrir' : 'Cerrar'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Respuestas ({activeThread.replies.length})</h3>
            {activeThread.replies.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">Sin respuestas aún. ¡Sé el primero en responder!</p>
            ) : (
              renderReplies(activeThread.replies)
            )}
          </div>

          {!activeThread.closed && (
            <form onSubmit={handleReply} className="space-y-2">
              {replyingTo && (
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                  <FiReply size={12} />
                  <span>Respondiendo a <strong>{replyingTo}</strong></span>
                  <button type="button" onClick={() => { setReplyingTo(null); setReplyParentId(null) }} className="text-red-500 hover:text-red-700">Cancelar</button>
                </div>
              )}
              <textarea
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="Escribe tu respuesta..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!replyContent.trim() || submitting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiSend size={14} />
                  {submitting ? 'Enviando...' : 'Responder'}
                </button>
              </div>
            </form>
          )}
          {activeThread.closed && (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">Este hilo está cerrado para nuevas respuestas.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Foro de Discusión</h2>
          <button
            onClick={() => setShowNewThread(!showNewThread)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 text-sm font-medium"
          >
            <FiPlus size={16} />
            Nuevo hilo
          </button>
        </div>

        {showNewThread && (
          <form onSubmit={handleCreateThread} className="mb-6 p-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] space-y-3">
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Título del hilo"
              className="w-full px-4 py-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <textarea
              value={contenido}
              onChange={e => setContenido(e.target.value)}
              placeholder="Contenido del hilo..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewThread(false)} className="px-4 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!titulo.trim() || !contenido.trim() || submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSend size={14} />
                {submitting ? 'Creando...' : 'Crear hilo'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-12">
            <FiMessageSquare size={40} className="mx-auto mb-3 text-[var(--color-text-secondary)] opacity-30" />
            <p className="text-[var(--color-text-secondary)]">No hay hilos de discusión aún. ¡Crea el primero!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map(thread => (
              <button
                key={thread.id}
                onClick={() => loadThread(thread.id)}
                className="w-full text-left p-4 rounded-xl border border-[var(--color-border-default)] hover:bg-[var(--color-bg-secondary)] transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0 overflow-hidden ${threadLoading && 'opacity-50'}`}>
                    {thread.user.avatar ? <img src={thread.user.avatar} alt="" className="w-full h-full object-cover" /> : thread.user.nombre?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {thread.pinned && <BsPinAngleFill size={12} className="text-emerald-500 flex-shrink-0" />}
                      {thread.closed && <FiLock size={12} className="text-red-500 flex-shrink-0" />}
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{thread.titulo}</p>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{thread.contenido}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-blue-600 dark:text-blue-400">{thread.user.nombre}</span>
                      <span className="text-[10px] text-[var(--color-text-secondary)]">{thread._count.replies} respuesta{thread._count.replies !== 1 ? 's' : ''}</span>
                      <span className="text-[10px] text-[var(--color-text-secondary)]">{new Date(thread.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                  <FiChevronRight size={16} className="text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

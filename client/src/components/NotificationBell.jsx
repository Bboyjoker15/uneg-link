import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { FiBell, FiMessageSquare, FiFile, FiCalendar, FiCheckSquare, FiCheck } from 'react-icons/fi'

const TYPE_ICONS = {
  MENSAJE: FiMessageSquare,
  ANUNCIO: FiBell,
  QUIZ: FiCheckSquare,
  EVENTO: FiCalendar,
  ARCHIVO: FiFile
}

const TYPE_COLORS = {
  MENSAJE: 'text-blue-500',
  ANUNCIO: 'text-purple-500',
  QUIZ: 'text-emerald-500',
  EVENTO: 'text-yellow-500',
  ARCHIVO: 'text-orange-500'
}

export default function NotificationBell({ socket, onNotificationClick }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef(null)

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    loadNotifications()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!socket) return
    const handler = (notification) => {
      setNotifications(prev => [notification, ...prev])
    }
    socket.on('new-notification', handler)
    return () => socket.off('new-notification', handler)
  }, [socket])

  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications')
      setNotifications(res.data)
    } catch (err) {
      console.error('Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const getTimeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Ahora'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] transition-colors"
      >
        <FiBell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[var(--color-bg)] border border-[var(--color-border-default)] rounded-xl shadow-lg overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-default)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <FiCheckSquare size={12} />
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-center text-[var(--color-text-secondary)] py-8 text-sm">Sin notificaciones</p>
            ) : (
              notifications.map(n => {
                const Icon = TYPE_ICONS[n.type] || FiBell
                const color = TYPE_COLORS[n.type] || 'text-gray-500'
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      handleMarkAsRead(n.id)
                      setOpen(false)
                      onNotificationClick?.(n)
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-[var(--color-bg-secondary)] transition-colors flex items-start gap-3 ${
                      !n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <div className={`mt-0.5 ${color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? 'font-semibold' : ''} text-[var(--color-text-primary)] truncate`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">{n.body}</p>
                      )}
                      <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">{getTimeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <FiCheck size={14} className="text-blue-500 mt-1 flex-shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

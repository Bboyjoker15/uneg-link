import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useSocket } from '../contexts/SocketContext'
import api from '../services/api'
import ChatArea from '../components/ChatArea'
import QuizCreator from '../components/QuizCreator'
import QuizTaker from '../components/QuizTaker'
import QuizResults from '../components/QuizResults'
import OfflineBanner from '../components/OfflineBanner'
import NotificationBell from '../components/NotificationBell'
import PublicProfile from '../components/PublicProfile'
import AssignmentView from '../components/AssignmentView'
import GradeView from '../components/GradeView'
import ForumView from '../components/ForumView'
import DirectMessages from '../components/DirectMessages'
import GroupView from '../components/GroupView'
import ProfessorPanel from '../components/ProfessorPanel'
import Profile from './Profile'
import { FiLogOut, FiSun, FiMoon, FiPlus, FiTrash2, FiHash, FiCalendar, FiFile, FiBookOpen, FiCheckSquare, FiHome, FiAlertCircle, FiClock, FiUser, FiPaperclip, FiArrowLeft, FiStar, FiX, FiTrendingUp, FiMessageCircle, FiUsers, FiBarChart2, FiChevronDown, FiShield } from 'react-icons/fi'

const SUB_TABS = [
  { key: 'chat', label: 'Chat', icon: FiHash },
  { key: 'files', label: 'Archivos', icon: FiFile },
  { key: 'assignments', label: 'Tareas', icon: FiPaperclip },
  { key: 'calendar', label: 'Calendario', icon: FiCalendar },
  { key: 'grades', label: 'Notas', icon: FiTrendingUp },
  { key: 'quizzes', label: 'Quizzes', icon: FiCheckSquare },
  { key: 'forum', label: 'Foro', icon: FiMessageCircle },
  { key: 'groups', label: 'Grupos', icon: FiUsers },
  { key: 'panel', label: 'Panel', icon: FiBarChart2 }
]

const EVENT_STYLES = {
  EXAMEN:    { bg: 'bg-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  ENTREGA:   { bg: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  PROYECTO:  { bg: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  ACTIVIDAD: { bg: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  TRABAJO:   { bg: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  EXPOSICION:{ bg: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
}
const DEFAULT_EVENT_STYLE = { bg: 'bg-slate-500', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400' }

function HomeOverview({ subjects, overview }) {
  const [data, setData] = useState({ announcements: [], upcomingEvents: [], subjects: [] })

  useEffect(() => {
    loadOverview()
  }, [])

  const loadOverview = async () => {
    try {
      const res = await api.get('/subjects/overview')
      setData(res.data)
    } catch (err) {
      console.error('Error loading overview:', err)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">Panel General</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.subjects.length}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">Materias</p>
        </div>
        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.announcements.length}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">Anuncios recientes</p>
        </div>
        <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{data.upcomingEvents.length}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">Próximos eventos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <FiAlertCircle size={18} className="text-purple-500" />
            Últimos anuncios
          </h2>
          <div className="space-y-3">
            {data.announcements.map((a, i) => (
              <div key={i} className="p-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg)]">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">
                    {a.subjectName}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {new Date(a.createdAt).toLocaleDateString('es-ES')}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-primary)] line-clamp-2">{a.contenido}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{a.user?.nombre}</p>
              </div>
            ))}
            {data.announcements.length === 0 && (
              <p className="text-sm text-[var(--color-text-secondary)]">No hay anuncios recientes</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <FiCalendar size={18} className="text-yellow-500" />
            Próximos eventos
          </h2>
          <div className="space-y-3">
            {data.upcomingEvents.map((e, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg)]">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${(EVENT_STYLES[e.tipo] || DEFAULT_EVENT_STYLE).bg}`}>
                  {new Date(e.fecha).getDate()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{e.titulo}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {e.subjectName} · {new Date(e.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full ${(EVENT_STYLES[e.tipo] || DEFAULT_EVENT_STYLE).badge}`}>
                    {e.tipo}
                  </span>
                </div>
              </div>
            ))}
            {data.upcomingEvents.length === 0 && (
              <p className="text-sm text-[var(--color-text-secondary)]">No hay próximos eventos</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, logout, setUser } = useAuth()
  const { theme, toggle } = useTheme()
  const { socket, connected } = useSocket()
  const navigate = useNavigate()

  const [subjects, setSubjects] = useState([])
  const [activeSubject, setActiveSubject] = useState(null)
  const [activeChannel, setActiveChannel] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [error, setError] = useState('')
  const [files, setFiles] = useState([])
  const [events, setEvents] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [newEvent, setNewEvent] = useState({ titulo: '', descripcion: '', fecha: '', tipo: 'OTRO', importante: false })
  const [pendingAnnouncement, setPendingAnnouncement] = useState(null)
  const [quizView, setQuizView] = useState('list')
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [quizAttemptResult, setQuizAttemptResult] = useState(null)
  const [quizAttempts, setQuizAttempts] = useState([])
  const [showProfile, setShowProfile] = useState(false)
  const [sidebarView, setSidebarView] = useState('channels')
  const [members, setMembers] = useState([])
  const [membersProfesor, setMembersProfesor] = useState(null)
  const [publicProfileUserId, setPublicProfileUserId] = useState(null)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [showDMs, setShowDMs] = useState(false)

  useEffect(() => {
    loadSubjects()
  }, [])

  useEffect(() => {
    if (activeSubject) {
      loadFiles()
      loadEvents()
      loadQuizzes()
    }
  }, [activeSubject])

  useEffect(() => {
    if (activeSubject && sidebarView === 'members') {
      loadMembers()
    }
  }, [activeSubject, sidebarView])

  const loadSubjects = async () => {
    try {
      const res = await api.get('/subjects')
      setSubjects(res.data)
      if (res.data.length > 0) {
        setActiveSubject(res.data[0])
        if (res.data[0].channels?.length > 0) {
          setActiveChannel(res.data[0].channels[0])
        }
      }
    } catch (err) {
      console.error('Error loading subjects:', err)
    }
  }

  const loadFiles = async () => {
    if (!activeSubject) return
    try {
      const res = await api.get(`/files/${activeSubject.id}`)
      setFiles(res.data)
    } catch (err) {
      console.error('Error loading files:', err)
    }
  }

  const loadEvents = async () => {
    if (!activeSubject) return
    try {
      const res = await api.get(`/calendar/${activeSubject.id}`)
      setEvents(res.data)
    } catch (err) {
      console.error('Error loading events:', err)
    }
  }

  const loadMembers = async () => {
    if (!activeSubject) return
    setLoadingMembers(true)
    try {
      const res = await api.get(`/enrollments/${activeSubject.id}/members`)
      setMembers(res.data.students)
      setMembersProfesor(res.data.profesor)
    } catch (err) {
      console.error('Error loading members:', err)
    } finally {
      setLoadingMembers(false)
    }
  }

  const loadQuizzes = async () => {
    if (!activeSubject) return
    try {
      const res = await api.get(`/quizzes/${activeSubject.id}`)
      setQuizzes(res.data)
    } catch (err) {
      console.error('Error loading quizzes:', err)
    }
  }

  const loadQuizAttempts = async (quizId) => {
    try {
      const res = await api.get(`/quizzes/${quizId}/attempts`)
      setQuizAttempts(res.data)
    } catch (err) {
      console.error('Error loading attempts:', err)
    }
  }

  const handleResetAttempt = async (quizId, userId) => {
    if (!confirm('¿Resetear el último intento de este estudiante para que pueda volver a tomar el quiz?')) return
    try {
      await api.post(`/quizzes/${quizId}/reset-attempt/${userId}`)
      loadQuizAttempts(quizId)
      loadQuizzes()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al resetear intento')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleCreateChannel = async (e) => {
    e.preventDefault()
    setError('')
    if (!newChannelName.trim()) return
    try {
      await api.post('/channels', {
        sectionSubjectId: activeSubject.id,
        nombre: newChannelName
      })
      const updated = await api.get('/subjects')
      setSubjects(updated.data)
      const updatedSubject = updated.data.find(s => s.id === activeSubject.id)
      setActiveSubject(updatedSubject)
      setNewChannelName('')
      setShowNewChannel(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear canal')
    }
  }

  const handleDeleteChannel = async (channelId) => {
    setError('')
    if (!confirm('¿Eliminar este canal?')) return
    try {
      await api.delete(`/channels/${channelId}`)
      const updated = await api.get('/subjects')
      setSubjects(updated.data)
      const updatedSubject = updated.data.find(s => s.id === activeSubject.id)
      setActiveSubject(updatedSubject)
      if (activeChannel?.id === channelId) {
        setActiveChannel(updatedSubject?.channels?.[0] || null)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar canal')
    }
  }

  const handleUploadFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('sectionSubjectId', activeSubject.id)
    try {
      await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      loadFiles()
    } catch (err) {
      console.error('Error uploading file:', err)
    }
  }

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    setError('')
    if (!newEvent.titulo.trim() || !newEvent.fecha) return
    try {
      const res = await api.post('/calendar', {
        sectionSubjectId: activeSubject.id,
        titulo: newEvent.titulo,
        descripcion: newEvent.descripcion,
        fecha: newEvent.fecha,
        tipo: newEvent.tipo,
        importante: newEvent.importante
      })
      setNewEvent({ titulo: '', descripcion: '', fecha: '', tipo: 'OTRO', importante: false })
      setShowNewEvent(false)
      loadEvents()
      if (res.data.announcementPreview) {
        setPendingAnnouncement({
          sectionSubjectId: activeSubject.id,
          content: res.data.announcementPreview
        })
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear evento')
    }
  }

  const handleConfirmEventAnnouncement = async () => {
    if (!pendingAnnouncement) return
    try {
      await api.post('/ai/announcement/confirm', pendingAnnouncement)
      setPendingAnnouncement(null)
    } catch (err) {
      console.error('Error publishing event announcement:', err)
      setPendingAnnouncement(null)
    }
  }

  const selectSubject = (subject) => {
    setActiveSubject(subject)
    setActiveChannel(subject.channels?.[0] || null)
    setActiveTab('chat')
    setSidebarView('channels')
    setError('')
  }

  const handleNotificationClick = async (n) => {
    if (!n.link) return
    const parts = n.link.split('/')
    if (parts[1] === 'channel' && parts[2]) {
      for (const subject of subjects) {
        const channel = subject.channels?.find(c => c.id === parts[2])
        if (channel) {
          selectSubject(subject)
          setActiveChannel(channel)
          setActiveTab('chat')
          return
        }
      }
    } else if (parts[1] === 'assignments' && parts[2]) {
      try {
        const res = await api.get(`/assignments/${parts[2]}/section`)
        const { sectionSubjectId } = res.data
        const subject = subjects.find(s => s.id === sectionSubjectId)
        if (subject) {
          selectSubject(subject)
          setActiveTab('assignments')
        }
      } catch (err) {
        console.error('Error navigating from notification:', err)
      }
    }
  }

  if (!user) return null

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)]">
      <OfflineBanner />
        <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border-default)] bg-[var(--color-bg)]">
          <button onClick={() => setShowProfile(false)} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">UL</span>
            </div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Uneg-Link</h1>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowProfile(true); setShowDMs(false) }}
              className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] transition-colors"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  user.nombre?.[0]
                )}
              </div>
              <div className="text-sm text-left">
                <p className="font-medium leading-tight">{user.nombre}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{user.role === 'PROFESOR' ? 'Profesor' : 'Estudiante'}</p>
              </div>
            </button>
            <NotificationBell socket={socket} onNotificationClick={handleNotificationClick} />
            <button onClick={() => { setShowDMs(!showDMs); setShowProfile(false) }} className={`p-2 rounded-lg transition-colors ${showDMs ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`} title="Mensajes directos">
              <FiMessageCircle size={18} />
            </button>
            {user?.role === 'ADMIN' && (
              <button onClick={() => navigate('/admin')} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--color-text-secondary)] hover:text-red-600 transition-colors" title="Panel Admin">
                <FiShield size={18} />
              </button>
            )}
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] transition-colors">
              {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
            </button>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--color-text-secondary)] hover:text-red-600 transition-colors">
              <FiLogOut size={18} />
            </button>
          </div>
        </header>

      <div className="flex items-center gap-1 px-6 py-2 border-b border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] overflow-x-auto">
        <button
          onClick={() => { setActiveTab('home'); setError('') }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'home'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]'
          }`}
        >
          <FiHome size={16} />
          Inicio
        </button>
        {subjects.map(subject => (
          <button
            key={subject.id}
            onClick={() => selectSubject(subject)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeSubject?.id === subject.id && activeTab !== 'home'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]'
            }`}
          >
            <FiBookOpen size={16} />
            {subject.nombre}
            <span className="text-xs opacity-60">{subject.sectionCodigo}</span>
          </button>
        ))}
      </div>

      {showProfile ? null : activeTab !== 'home' && activeSubject && (
        <div className="flex items-center gap-1 px-2 sm:px-6 py-1.5 border-b border-[var(--color-border-default)] bg-[var(--color-bg)] overflow-x-auto">
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="sm:hidden p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] mr-1 flex-shrink-0"
          >
            <FiChevronDown size={16} />
          </button>
          {SUB_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.key
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        {showDMs ? (
          <DirectMessages onViewProfile={(id) => setPublicProfileUserId(id)} />
        ) : showProfile ? (
          <Profile onBack={() => setShowProfile(false)} />
        ) : activeTab !== 'home' && activeSubject && (
          <aside className={`${
            showMobileSidebar ? 'fixed inset-0 z-40' : 'hidden'
          } sm:flex sm:relative sm:w-60 border-r border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] flex-col`}>
            {showMobileSidebar && (
              <div className="sm:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-default)]">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Menú</h3>
                <button onClick={() => setShowMobileSidebar(false)} className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]">
                  <FiX size={18} />
                </button>
              </div>
            )}
            <div className="flex border-b border-[var(--color-border-default)]">
              <button
                onClick={() => setSidebarView('channels')}
                className={`flex-1 px-3 py-2 text-xs font-medium text-center transition-colors ${
                  sidebarView === 'channels'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Canales
              </button>
              <button
                onClick={() => setSidebarView('members')}
                className={`flex-1 px-3 py-2 text-xs font-medium text-center transition-colors ${
                  sidebarView === 'members'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Miembros
              </button>
            </div>

            {sidebarView === 'channels' && (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-default)]">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Canales</h3>
                  {user?.role === 'PROFESOR' && connected && (
                    <button
                      onClick={() => { setShowNewChannel(!showNewChannel); setError('') }}
                      className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    >
                      <FiPlus size={16} />
                    </button>
                  )}
                </div>

                {showNewChannel && (
                  <form onSubmit={handleCreateChannel} className="px-4 py-2 border-b border-[var(--color-border-default)]">
                    <input
                      type="text"
                      value={newChannelName}
                      onChange={e => setNewChannelName(e.target.value)}
                      placeholder="Nombre del canal"
                      className="w-full px-3 py-1.5 text-sm rounded border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                      autoFocus
                    />
                    {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
                    <div className="flex gap-1">
                      <button type="submit" className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Crear</button>
                      <button type="button" onClick={() => { setShowNewChannel(false); setError('') }} className="px-2 py-1 text-xs border border-[var(--color-border-default)] rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]">Cancelar</button>
                    </div>
                  </form>
                )}

                <div className="flex-1 overflow-y-auto py-2">
                  {activeSubject?.channels?.map(channel => (
                    <div key={channel.id} className="group flex items-center">
                      <button
                        onClick={() => { setActiveChannel(channel); setActiveTab('chat'); setShowMobileSidebar(false) }}
                        className={`flex-1 flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                          activeChannel?.id === channel.id
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]'
                        }`}
                      >
                        <FiHash size={14} />
                        <span className="truncate">{channel.nombre}</span>
                      </button>
                      {user?.role === 'PROFESOR' && connected && (
                        <button
                          onClick={() => handleDeleteChannel(channel.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 mr-2 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-[var(--color-text-secondary)] hover:text-red-600 transition-all"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {sidebarView === 'members' && (
              <div className="flex-1 overflow-y-auto py-3">
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  </div>
                ) : (
                  <>
                    {membersProfesor && (
                      <div className="px-4 mb-3">
                        <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] font-semibold mb-2">Profesor</p>
                        <button
                          onClick={() => setPublicProfileUserId(membersProfesor.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-bg)] transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white text-sm font-medium overflow-hidden flex-shrink-0">
                            {membersProfesor.avatar ? (
                              <img src={membersProfesor.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FiStar size={14} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{membersProfesor.nombre}</p>
                            <p className="text-[10px] text-[var(--color-text-secondary)]">Profesor</p>
                          </div>
                        </button>
                      </div>
                    )}
                    <div className="px-4 space-y-2 mb-2">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] font-semibold">
                        Estudiantes ({members.length})
                      </p>
                      {user?.role === 'PROFESOR' && (
                        <input
                          type="text"
                          value={memberSearch}
                          onChange={e => setMemberSearch(e.target.value)}
                          placeholder="Buscar por nombre o cédula..."
                          className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      )}
                    </div>
                    {members
                      .filter(m => !memberSearch || m.nombre.toLowerCase().includes(memberSearch.toLowerCase()) || (m.cedula && m.cedula.includes(memberSearch)))
                      .map(member => (
                      <div key={member.id} className="group flex items-center px-4">
                        <button
                          onClick={() => { setPublicProfileUserId(member.id); setShowMobileSidebar(false) }}
                          className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-bg)] transition-colors text-left"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden flex-shrink-0 ${
                            member.subRole === 'DELEGADO' ? 'bg-emerald-500' :
                            member.subRole === 'PREPARADOR' ? 'bg-orange-500' :
                            member.subRole === 'VOCERO' ? 'bg-cyan-500' :
                            'bg-blue-500'
                          }`}>
                            {member.avatar ? (
                              <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              member.nombre?.[0]
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{member.nombre}</p>
                            <p className="text-[10px] text-[var(--color-text-secondary)]">
                              {member.subRole || (user?.role === 'PROFESOR' ? member.cedula : 'Estudiante')}
                            </p>
                          </div>
                        </button>
                        {user?.role === 'PROFESOR' && membersProfesor?.id === user.id && (
                          <select
                            value={member.subRole || ''}
                            onChange={async (e) => {
                              const val = e.target.value || null
                              try {
                                await api.put(`/enrollments/${activeSubject.id}/role/${member.id}`, { subRole: val })
                                loadMembers()
                              } catch (err) {
                                console.error('Error setting role:', err)
                              }
                            }}
                            onClick={e => e.stopPropagation()}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <option value="">Sin rol</option>
                            <option value="DELEGADO">Delegado</option>
                            <option value="PREPARADOR">Preparador</option>
                            <option value="VOCERO">Vocero</option>
                          </select>
                        )}
                        {user?.role === 'PROFESOR' && membersProfesor?.id === user.id && connected && (
                          <button
                            onClick={async () => {
                              if (!confirm(`¿Eliminar a ${member.nombre} de esta materia?`)) return
                              try {
                                await api.delete(`/enrollments/${activeSubject.id}/remove/${member.id}`)
                                loadMembers()
                              } catch (err) {
                                console.error('Error removing member:', err)
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-[var(--color-text-secondary)] hover:text-red-600 transition-all"
                            title="Eliminar de la materia"
                          >
                            <FiX size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </aside>
        )}

        {publicProfileUserId && (
          <PublicProfile userId={publicProfileUserId} onBack={() => setPublicProfileUserId(null)}
            onSendMessage={async (id) => { setPublicProfileUserId(null); try { const res = await api.post(`/direct-messages/conversations/${id}`); setShowDMs(true); } catch (err) { console.error(err) } }}
          />
        )}

        {pendingAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPendingAnnouncement(null)}>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border-default)] rounded-2xl p-6 max-w-lg w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Anuncio generado por IA</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">El evento importante generó este anuncio automáticamente. ¿Publicarlo en el canal de Anuncios?</p>
              <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 mb-4">
                <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{pendingAnnouncement.content}</p>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setPendingAnnouncement(null)} className="px-4 py-2 border border-[var(--color-border-default)] rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]">
                  Cancelar
                </button>
                <button onClick={handleConfirmEventAnnouncement} className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600">
                  Publicar anuncio
                </button>
              </div>
            </div>
          </div>
        )}

        {!showProfile && !publicProfileUserId && (
          <main className="flex-1 flex flex-col min-h-0">
            {activeTab === 'home' && (
            <HomeOverview subjects={subjects} />
          )}

          {activeTab === 'chat' && (
            <ChatArea channel={activeChannel} sectionSubjectId={activeSubject?.id} onViewProfile={(id) => setPublicProfileUserId(id)} />
          )}

          {activeTab === 'files' && (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  <FiFile className="inline mr-2" />
                  Archivos de {activeSubject?.nombre}
                </h2>
                {connected && (
                  <label className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 cursor-pointer transition-colors flex items-center gap-2">
                    <FiPlus size={16} />
                    Subir archivo
                    <input type="file" onChange={handleUploadFile} className="hidden" />
                  </label>
                )}
              </div>
              <div className="grid gap-3">
                {files.map(file => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-border-default)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <FiFile size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[var(--color-text-primary)] truncate">{file.nombre}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {new Date(file.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </a>
                ))}
                {files.length === 0 && (
                  <p className="text-center text-[var(--color-text-secondary)] py-12">No hay archivos aún</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  <FiCalendar className="inline mr-2" />
                  Calendario - {activeSubject?.nombre}
                </h2>
                {user?.role === 'PROFESOR' && connected && (
                  <button
                    onClick={() => { setShowNewEvent(!showNewEvent); setError('') }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 cursor-pointer transition-colors flex items-center gap-2"
                  >
                    <FiPlus size={16} />
                    Nuevo Evento
                  </button>
                )}
              </div>

              {showNewEvent && (
                <form onSubmit={handleCreateEvent} className="mb-6 p-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] space-y-3">
                  <input
                    type="text"
                    value={newEvent.titulo}
                    onChange={e => setNewEvent({ ...newEvent, titulo: e.target.value })}
                    placeholder="Título del evento"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                    required
                  />
                  <textarea
                    value={newEvent.descripcion}
                    onChange={e => setNewEvent({ ...newEvent, descripcion: e.target.value })}
                    placeholder="Descripción (opcional)"
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="datetime-local"
                      value={newEvent.fecha}
                      onChange={e => setNewEvent({ ...newEvent, fecha: e.target.value })}
                      className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                    <select
                      value={newEvent.tipo}
                      onChange={e => setNewEvent({ ...newEvent, tipo: e.target.value })}
                      className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="EXAMEN">Examen</option>
                      <option value="ENTREGA">Entrega</option>
                      <option value="PROYECTO">Proyecto</option>
                      <option value="ACTIVIDAD">Actividad en clase</option>
                      <option value="TRABAJO">Trabajo</option>
                      <option value="EXPOSICION">Exposición</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                    <input
                      type="checkbox"
                      checked={newEvent.importante}
                      onChange={e => setNewEvent({ ...newEvent, importante: e.target.checked })}
                      className="rounded border-[var(--color-border-default)] text-blue-600"
                    />
                    Evento importante — se generará un anuncio automático con IA
                  </label>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <div className="flex gap-2">
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">Crear Evento</button>
                    <button type="button" onClick={() => { setShowNewEvent(false); setNewEvent({ titulo: '', descripcion: '', fecha: '', tipo: 'OTRO', importante: false }); setError('') }} className="px-4 py-2 border border-[var(--color-border-default)] rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors">Cancelar</button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {events.map(event => (
                  <div key={event.id} className={`flex items-start gap-4 p-4 rounded-xl border ${
                    event.importante
                      ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50/50 dark:bg-yellow-900/10'
                      : 'border-[var(--color-border-default)]'
                  }`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold ${(EVENT_STYLES[event.tipo] || DEFAULT_EVENT_STYLE).bg}`}>
                      {new Date(event.fecha).getDate()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[var(--color-text-primary)]">{event.titulo}</p>
                        {event.importante && <span className="text-yellow-500">⭐</span>}
                      </div>
                      {event.descripcion && (
                        <p className="text-sm text-[var(--color-text-secondary)]">{event.descripcion}</p>
                      )}
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        {new Date(event.fecha).toLocaleDateString('es-ES', {
                          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </p>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${(EVENT_STYLES[event.tipo] || DEFAULT_EVENT_STYLE).badge}`}>
                        {event.tipo}
                      </span>
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-center text-[var(--color-text-secondary)] py-12">No hay eventos</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <AssignmentView sectionSubjectId={activeSubject?.id} connected={connected} onViewProfile={(id) => setPublicProfileUserId(id)} />
          )}

          {activeTab === 'grades' && (
            <GradeView sectionSubjectId={activeSubject?.id} onViewProfile={(id) => setPublicProfileUserId(id)} />
          )}

          {activeTab === 'quizzes' && (
            quizView === 'create' ? (
              <div className="flex-1 p-6 overflow-y-auto">
                <QuizCreator
                  sectionSubjectId={activeSubject?.id}
                  onClose={() => setQuizView('list')}
                  onSaved={() => { setQuizView('list'); loadQuizzes() }}
                />
              </div>
            ) : quizView === 'take' && activeQuiz ? (
              <QuizTaker
                quiz={activeQuiz}
                onBack={() => { setQuizView('list'); setActiveQuiz(null); loadQuizzes() }}
              />
            ) : quizView === 'results' && quizAttemptResult ? (
              <QuizResults
                result={quizAttemptResult}
                questions={activeQuiz?.questions || []}
                quizTitle={activeQuiz?.titulo}
                onBack={() => { setQuizView('list'); setActiveQuiz(null); setQuizAttemptResult(null); loadQuizzes() }}
              />
            ) : quizView === 'details' && activeQuiz ? (
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setQuizView('list'); setActiveQuiz(null); loadQuizzes() }} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                      <FiArrowLeft size={18} />
                    </button>
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                      <FiCheckSquare className="inline mr-2" />
                      {activeQuiz.titulo} — Intentos
                    </h2>
                  </div>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {quizAttempts.length} intento{quizAttempts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {quizAttempts.length === 0 ? (
                  <p className="text-center text-[var(--color-text-secondary)] py-12">No hay intentos aún</p>
                ) : (
                  <div className="space-y-2">
                    {quizAttempts.map(a => (
                      <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-border-default)]">
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => setPublicProfileUserId(a.userId)}
                            className="font-medium text-sm text-[var(--color-text-primary)] hover:underline text-left"
                          >
                            {a.userName}
                          </button>
                          {user?.role === 'PROFESOR' && <p className="text-xs text-[var(--color-text-secondary)]">{a.cedula}</p>}
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                            {new Date(a.submittedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-lg font-bold ${
                            a.score >= 80 ? 'text-green-600 dark:text-green-400' :
                            a.score >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>{Math.round(a.score || 0)}%</p>
                        </div>
                        {connected && (
                          <button
                            onClick={() => handleResetAttempt(activeQuiz.id, a.userId)}
                            className="px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors whitespace-nowrap"
                          >
                            Resetear intento
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    <FiCheckSquare className="inline mr-2" />
                    Quizzes - {activeSubject?.nombre}
                  </h2>
                  {user?.role === 'PROFESOR' && connected && (
                    <button
                      onClick={() => { setQuizView('create'); setError('') }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <FiPlus size={16} />
                      Nuevo Quiz
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {quizzes.map(quiz => (
                    <div key={quiz.id} className="p-4 rounded-xl border border-[var(--color-border-default)]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-[var(--color-text-primary)]">{quiz.titulo}</h3>
                          {quiz.descripcion && (
                            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{quiz.descripcion}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-text-secondary)]">
                            <span>Creado {new Date(quiz.createdAt).toLocaleDateString('es-ES')}</span>
                            {quiz.timeLimit && <span>⏱ {quiz.timeLimit} min</span>}
                            <span>Intentos: {quiz.maxAttempts}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          {user?.role === 'ESTUDIANTE' && (
                            <>
                              {quiz.myAttempts < quiz.maxAttempts ? (
                                <button
                                  onClick={() => { setActiveQuiz(quiz); setQuizView('take') }}
                                  disabled={!connected}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={!connected ? 'No disponible sin conexión' : ''}
                                >
                                  {quiz.myAttempts > 0 ? 'Reintentar' : 'Comenzar'}
                                </button>
                              ) : (
                                <span className="text-xs text-red-500">Sin intentos</span>
                              )}
                              {quiz.myAttempts > 0 && (
                                <span className="text-xs text-[var(--color-text-secondary)]">
                                  Mejor: <span className="font-semibold text-green-600">{Math.round(quiz.myBestScore || 0)}%</span>
                                  ({quiz.myAttempts}/{quiz.maxAttempts})
                                </span>
                              )}
                            </>
                          )}
                          {user?.role === 'PROFESOR' && (
                            <button
                              onClick={() => { setActiveQuiz(quiz); setQuizView('details'); loadQuizAttempts(quiz.id) }}
                              className="px-3 py-1.5 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] rounded-lg text-xs hover:bg-[var(--color-bg-tertiary)] transition-colors border border-[var(--color-border-default)] whitespace-nowrap"
                            >
                              {quiz.totalAttempts} intentos
                            </button>
                          )}
                        </div>
                      </div>
                      {quiz.questions && (
                        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                          {[...new Set(quiz.questions.map(q => q.type))].map(type => {
                            const counts = { 'multiple-choice': { label: 'Op. múltiple', color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20' }, 'true-false': { label: 'V/F', color: 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/20' }, 'short-answer': { label: 'Corta', color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20' }, 'essay': { label: 'Ensayo', color: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20' }, 'calculation': { label: 'Cálculo', color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20' } }
                            const c = counts[type] || { label: type, color: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/20' }
                            return <span key={type} className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.color}`}>{c.label}</span>
                          })}
                          <span className="text-[10px] text-[var(--color-text-secondary)]">{quiz.questions.length} preguntas</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {quizzes.length === 0 && (
                    <p className="text-center text-[var(--color-text-secondary)] py-12">
                      {user?.role === 'PROFESOR' ? 'No hay quizzes. ¡Crea el primero!' : 'No hay quizzes disponibles'}
                    </p>
                  )}
                </div>
              </div>
            )
          )}

          {activeTab === 'forum' && (
            <ForumView sectionSubjectId={activeSubject?.id} onViewProfile={(id) => setPublicProfileUserId(id)} />
          )}

          {activeTab === 'groups' && (
            <GroupView sectionSubjectId={activeSubject?.id} members={members} />
          )}

          {activeTab === 'panel' && (
            <ProfessorPanel sectionSubjectId={activeSubject?.id} />
          )}
        </main>
      )}
      </div>
    </div>
  )
}

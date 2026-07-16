import { useState, useEffect } from 'react'
import api from '../services/api'
import { FiArrowLeft, FiUser, FiBook, FiAward, FiStar, FiMail, FiPhone, FiX } from 'react-icons/fi'

export default function PublicProfile({ userId, onBack }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/profile/${userId}`)
      setProfile(res.data)
    } catch (err) {
      setError('Error al cargar perfil')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)]">
        {error || 'Perfil no disponible'}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-md mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
            <FiArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Perfil</h1>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--color-border-default)] mb-4">
            {profile.avatar ? (
              <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold">
                {profile.nombre?.[0] || '?'}
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{profile.nombre}</h2>
          <span className={`inline-flex items-center gap-1 mt-1 px-3 py-0.5 rounded-full text-xs font-medium ${
            profile.role === 'PROFESOR'
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
          }`}>
            {profile.role === 'PROFESOR' ? <FiStar size={12} /> : <FiUser size={12} />}
            {profile.role === 'PROFESOR' ? 'Profesor' : 'Estudiante'}
          </span>
        </div>

        <div className="space-y-4">
          {profile.carrera && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-secondary)]">
              <FiBook className="text-blue-500 flex-shrink-0" size={18} />
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Carrera</p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{profile.carrera}</p>
              </div>
            </div>
          )}
          {profile.semestre && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-secondary)]">
              <FiAward className="text-emerald-500 flex-shrink-0" size={18} />
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Semestre</p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{profile.semestre}</p>
              </div>
            </div>
          )}
          {profile.email && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-secondary)]">
              <FiMail className="text-purple-500 flex-shrink-0" size={18} />
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Correo</p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{profile.email}</p>
              </div>
            </div>
          )}
          {profile.telefono && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-secondary)]">
              <FiPhone className="text-orange-500 flex-shrink-0" size={18} />
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Teléfono</p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{profile.telefono}</p>
              </div>
            </div>
          )}
          {profile.bio && (
            <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)]">
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">Biografía</p>
              <p className="text-sm text-[var(--color-text-primary)]">{profile.bio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { FiUser, FiMail, FiPhone, FiCalendar, FiMapPin, FiBook, FiAward, FiLock, FiCamera, FiSave, FiArrowLeft } from 'react-icons/fi'

export default function Profile({ onBack }) {
  const { user, setUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [changingPassword, setChangingPassword] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await api.get('/profile')
      setProfile(res.data)
    } catch (err) {
      setError('Error al cargar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await api.put('/profile', {
        nombre: profile.nombre,
        email: profile.email,
        telefono: profile.telefono,
        fechaNacimiento: profile.fechaNacimiento,
        direccion: profile.direccion,
        bio: profile.bio,
        carrera: profile.carrera,
        semestre: profile.semestre
      })
      setProfile(res.data)
      setUser(prev => ({ ...prev, nombre: res.data.nombre }))
      setSuccess('Perfil actualizado exitosamente')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('avatar', file)
    try {
      const res = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setProfile(prev => ({ ...prev, avatar: res.data.avatar }))
    } catch (err) {
      setError('Error al subir avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (passwordData.newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setChangingPassword(true)
    setError('')
    setSuccess('')
    try {
      await api.put('/profile/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setSuccess('Contraseña cambiada exitosamente')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar contraseña')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)]">
        Error al cargar perfil
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
            <FiArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Mi Perfil</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={uploading}
                className="w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--color-border-default)] hover:opacity-80 transition-opacity cursor-pointer"
              >
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold">
                    {profile.nombre?.[0] || '?'}
                  </div>
                )}
              </button>
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md">
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <FiCamera size={14} />
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="text-xs text-[var(--color-text-secondary)] mt-2">Haz clic para cambiar foto</p>
          </div>

          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <FiUser size={18} /> Información Personal
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Nombre completo</label>
                  <input
                    type="text"
                    value={profile.nombre || ''}
                    onChange={e => handleChange('nombre', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    <FiMail className="inline mr-1" size={14} /> Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={profile.email || ''}
                    onChange={e => handleChange('email', e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    <FiPhone className="inline mr-1" size={14} /> Teléfono
                  </label>
                  <input
                    type="tel"
                    value={profile.telefono || ''}
                    onChange={e => handleChange('telefono', e.target.value)}
                    placeholder="0412-1234567"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    <FiCalendar className="inline mr-1" size={14} /> Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    value={profile.fechaNacimiento ? profile.fechaNacimiento.split('T')[0] : ''}
                    onChange={e => handleChange('fechaNacimiento', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  <FiMapPin className="inline mr-1" size={14} /> Dirección
                </label>
                <input
                  type="text"
                  value={profile.direccion || ''}
                  onChange={e => handleChange('direccion', e.target.value)}
                  placeholder="Tu dirección"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Biografía</label>
                <textarea
                  value={profile.bio || ''}
                  onChange={e => handleChange('bio', e.target.value)}
                  placeholder="Cuéntanos sobre ti..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <FiBook size={18} /> Información Universitaria
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    <FiAward className="inline mr-1" size={14} /> Carrera
                  </label>
                  <input
                    type="text"
                    value={profile.carrera || ''}
                    onChange={e => handleChange('carrera', e.target.value)}
                    placeholder="Ej. Ingeniería Informática"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Semestre</label>
                  <input
                    type="text"
                    value={profile.semestre || ''}
                    onChange={e => handleChange('semestre', e.target.value)}
                    placeholder="Ej. 5to Semestre"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <FiSave size={16} />
              )}
              Guardar cambios
            </button>
          </div>
        </form>

        <section className="mt-8 pt-8 border-t border-[var(--color-border-default)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <FiLock size={18} /> Cambiar Contraseña
          </h2>
          <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Contraseña actual</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={changingPassword}
              className="px-4 py-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] rounded-lg text-sm hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {changingPassword ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : (
                <FiLock size={14} />
              )}
              Cambiar contraseña
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

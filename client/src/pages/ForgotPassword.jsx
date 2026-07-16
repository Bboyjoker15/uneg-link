import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { FiMail, FiArrowLeft, FiCheckCircle } from 'react-icons/fi'

export default function ForgotPassword() {
  const [cedula, setCedula] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { cedula })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al solicitar recuperación')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
        <div className="max-w-md w-full text-center">
          <FiCheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Revisa tu correo</h1>
          <p className="text-[var(--color-text-secondary)] mb-6">
            Si el usuario existe, recibirás un enlace para restablecer tu contraseña.
            {!import.meta.env.PROD && <span className="block mt-2 text-xs text-yellow-500">(Modo desarrollo: el token se muestra en la consola del servidor)</span>}
          </p>
          <Link to="/login" className="text-blue-600 hover:text-blue-700 text-sm flex items-center justify-center gap-1">
            <FiArrowLeft size={14} /> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-bold">UL</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Recuperar contraseña</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Ingresa tu cédula para recibir un enlace de recuperación</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Cédula</label>
            <input
              type="text"
              value={cedula}
              onChange={e => setCedula(e.target.value)}
              placeholder="V-12345678"
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link to="/login" className="text-blue-600 hover:text-blue-700 text-sm flex items-center justify-center gap-1">
            <FiArrowLeft size={14} /> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}

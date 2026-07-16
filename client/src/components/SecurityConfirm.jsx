import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { FiLock } from 'react-icons/fi'

export default function SecurityConfirm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { verifyPassword, cancelVerify, pendingUser } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyPassword(password)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al verificar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg)] p-8 shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <FiLock size={24} className="text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="mb-1 text-center text-lg font-bold text-[var(--color-text-primary)]">
          Confirmación de seguridad
        </h2>
        <p className="mb-6 text-center text-sm text-[var(--color-text-secondary)]">
          Hola <span className="font-medium">{pendingUser?.nombre}</span>, ha pasado un tiempo desde tu último inicio de sesión. Ingresa tu contraseña para continuar.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            className="mb-6 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
            required
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="mb-3 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Verificando...' : 'Confirmar'}
          </button>
          <button
            type="button"
            onClick={cancelVerify}
            className="w-full rounded-lg border border-[var(--color-border-default)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )
}

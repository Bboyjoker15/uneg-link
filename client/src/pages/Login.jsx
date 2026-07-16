import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { FiLogIn, FiEye, FiEyeOff, FiSun, FiMoon } from 'react-icons/fi'

export default function Login() {
  const [cedula, setCedula] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(cedula, password, rememberMe)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <div className="flex justify-end p-4">
        <button onClick={toggle} className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] transition-colors">
          {theme === 'light' ? <FiMoon size={20} /> : <FiSun size={20} />}
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">UL</span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Uneg-Link</h1>
            <p className="text-[var(--color-text-secondary)] mt-2">Inicia sesión en tu campus virtual</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-[var(--color-bg)] border border-[var(--color-border-default)] rounded-2xl p-8 shadow-sm">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg mb-4 border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Cédula
              </label>
              <input
                type="text"
                value={cedula}
                onFocus={e => { if (!cedula) setCedula('V-') }}
                onChange={e => {
                  const raw = e.target.value
                  if (raw === '' || raw === 'V') { setCedula('') }
                  else if (raw.startsWith('V-')) {
                    const nums = raw.slice(2).replace(/[^0-9]/g, '')
                    setCedula('V-' + nums)
                  } else {
                    const nums = raw.replace(/[^0-9]/g, '')
                    setCedula(nums ? 'V-' + nums : '')
                  }
                }}
                placeholder="V-12345678"
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <div className="mb-6 flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--color-border-default)] text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="rememberMe" className="text-sm text-[var(--color-text-secondary)] cursor-pointer select-none">
                Recordarme por 30 días
              </label>
            </div>

            <div className="text-right mb-4">
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Iniciando sesión...' : (
                <>
                  <FiLogIn size={18} />
                  Iniciar sesión
                </>
              )}
            </button>

            <p className="text-center text-sm text-[var(--color-text-secondary)] mt-4">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                Registrarse
              </Link>
            </p>
          </form>

          <div className="mt-4 p-4 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-default)]">
            <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">CREDENCIALES DE PRUEBA</p>
            <p className="text-sm text-[var(--color-text-primary)]">Profesor: V-12345678 / 123456</p>
            <p className="text-sm text-[var(--color-text-primary)]">Estudiante: V-30123456 / 123456</p>
          </div>
        </div>
      </div>
    </div>
  )
}

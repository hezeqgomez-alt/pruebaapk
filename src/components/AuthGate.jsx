import { useState } from 'react'
import { ReceiptText, Mail, Lock, Eye, EyeOff, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  'Analiza resúmenes de 15+ bancos argentinos',
  'Detecta cuotas, categorías y gastos innecesarios',
  'Exporta a PDF, Excel y CSV',
  '100% local: el PDF nunca sale de tu dispositivo',
]

export default function AuthGate() {
  const { signIn, signUp } = useAuth()
  const [mode,     setMode]     = useState('login') // 'login' | 'register'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [confirm,  setConfirm]  = useState(false) // email confirmation sent

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        const data = await signUp(email, password)
        // Supabase may require email confirmation depending on settings
        if (!data.session) setConfirm(true)
      }
    } catch (err) {
      setError(translateError(err.message))
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    setMode(m => m === 'login' ? 'register' : 'login')
    setError('')
    setConfirm(false)
  }

  if (confirm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/40 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">
            ¡Revisá tu correo!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Te enviamos un link de confirmación a <strong>{email}</strong>. Hacé clic en el link para activar tu cuenta.
          </p>
          <button
            onClick={() => { setConfirm(false); setMode('login') }}
            className="mt-6 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/40">

      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-indigo-600 to-violet-700 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <ReceiptText size={20} className="text-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">EasyResumen</span>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold leading-tight mb-4">
            Entendé tus finanzas.<br />Sin complicaciones.
          </h1>
          <ul className="space-y-3">
            {FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-indigo-100">
                <CheckCircle2 size={16} className="text-indigo-300 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-indigo-300">
          {mode === 'register' ? '30 días de prueba gratis · Sin tarjeta de crédito' : '© 2025 EasyResumen'}
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
              <ReceiptText size={18} className="text-white" />
            </div>
            <span className="text-lg font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              EasyResumen
            </span>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-1">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-7">
            {mode === 'login'
              ? 'Accedé a tus análisis financieros'
              : '30 días de prueba gratis, sin tarjeta'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="vos@ejemplo.com"
                  required
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-sm shadow-indigo-200 dark:shadow-indigo-900"
            >
              {loading
                ? (mode === 'login' ? 'Ingresando...' : 'Creando cuenta...')
                : (mode === 'login' ? 'Ingresar' : 'Crear cuenta gratis')}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            {mode === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
            <button onClick={toggle} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              {mode === 'login' ? 'Registrate gratis' : 'Iniciá sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function translateError(msg) {
  if (!msg) return 'Error desconocido. Intentá de nuevo.'
  const m = msg.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Email o contraseña incorrectos.'
  if (m.includes('email not confirmed'))  return 'Confirmá tu email antes de ingresar.'
  if (m.includes('user already registered') || m.includes('already registered')) return 'Este email ya está registrado. Iniciá sesión.'
  if (m.includes('password') && m.includes('6'))  return 'La contraseña debe tener al menos 6 caracteres.'
  if (m.includes('rate limit')) return 'Demasiados intentos. Esperá unos minutos.'
  if (m.includes('network') || m.includes('fetch')) return 'Error de conexión. Revisá tu internet.'
  return msg
}

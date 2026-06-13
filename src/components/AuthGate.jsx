import { useState } from 'react'
import { ReceiptText, Mail, Lock, Eye, EyeOff, AlertTriangle, CheckCircle2, ArrowRight, Sparkles, KeyRound } from 'lucide-react'

function InstagramIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
  )
}
import { useAuth } from '../context/AuthContext'

// ─── Password recovery screen (shown after clicking email link) ───────────────

function PasswordRecoveryScreen() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [done,     setDone]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true)
    setError('')
    try {
      await updatePassword(password)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Error al actualizar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a] p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px]" />
      </div>
      <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 w-full max-w-sm text-center shadow-2xl shadow-black/40">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
          <KeyRound size={26} className="text-indigo-400" />
        </div>
        <h2 className="text-xl font-extrabold text-white mb-1">Nueva contraseña</h2>
        <p className="text-sm text-slate-400 mb-6">Elegí una contraseña nueva para tu cuenta.</p>

        {done ? (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400">
            <CheckCircle2 size={16} className="shrink-0" />
            ¡Contraseña actualizada! Ya podés usar la app.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Nueva contraseña</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"><Lock size={15} /></span>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                  className="w-full pl-9 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />{error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/25"
            >
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const FEATURES = [
  { icon: '🏦', text: '15+ bancos argentinos soportados' },
  { icon: '📊', text: 'Cuotas, categorías y proyecciones automáticas' },
  { icon: '📤', text: 'Exportá a PDF, Excel y CSV' },
  { icon: '🔒', text: 'Tu PDF nunca sale de tu dispositivo' },
]

export default function AuthGate() {
  const { signIn, signUp, resetPassword, passwordRecovery } = useAuth()

  // All hooks must run unconditionally before any early return (Rules of Hooks)
  const [mode,     setMode]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [confirm,  setConfirm]  = useState(false)
  const [resetSent, setResetSent] = useState(false)

  if (passwordRecovery) return <PasswordRecoveryScreen />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else if (mode === 'register') {
        const data = await signUp(email, password)
        if (!data.session) setConfirm(true)
      } else if (mode === 'forgot') {
        await resetPassword(email)
        setResetSent(true)
      }
    } catch (err) {
      setError(translateError(err.message))
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); setConfirm(false) }
  const goForgot = () => { setMode('forgot'); setError(''); setResetSent(false) }
  const goLogin  = () => { setMode('login');  setError(''); setResetSent(false) }

  if (confirm) return <ConfirmScreen email={email} onBack={() => { setConfirm(false); setMode('login') }} />
  if (mode === 'forgot') return (
    <ForgotScreen
      email={email} setEmail={setEmail}
      loading={loading} error={error} sent={resetSent}
      onSubmit={handleSubmit} onBack={goLogin}
    />
  )

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0f0f1a]">

      {/* ── Animated background ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-900/10 rounded-full blur-[80px]" />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '48px 48px' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 flex flex-col lg:flex-row items-center gap-12 lg:gap-20 py-12">

        {/* ── Left: branding ── */}
        <div className="flex-1 text-white text-left">

          {/* Logo */}
          <div className="flex items-center justify-start gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ReceiptText size={22} className="text-white" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">EasyResumen</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-4">
            Entendé tus<br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              finanzas
            </span>{' '}al instante
          </h1>
          <p className="text-slate-400 text-lg mb-10 max-w-sm">
            Analizá resúmenes de tarjeta sin subir datos a ningún servidor.
          </p>

          <ul className="space-y-3 max-w-xs mb-10">
            {FEATURES.map(f => (
              <li key={f.text} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-base w-5 text-center shrink-0">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </ul>

          {mode === 'register' && (
            <div className="mb-8 inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2.5 text-sm text-indigo-300">
              <Sparkles size={14} />
              30 días de prueba gratis · Sin tarjeta de crédito
            </div>
          )}

          {/* Instagram + legal links */}
          <div className="flex flex-col gap-3">
            <a
              href="https://www.instagram.com/easyresumen.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-pink-400 transition-colors w-fit"
            >
              <InstagramIcon size={15} />
              @easyresumen.app
            </a>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <a href="/terminos.html" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors">Términos y condiciones</a>
              <span>·</span>
              <a href="/privacidad.html" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors">Privacidad</a>
            </div>
          </div>
        </div>

        {/* ── Right: form card ── */}
        <div className="w-full max-w-sm shrink-0">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/40">

            {/* Tabs */}
            <div className="flex bg-white/5 rounded-2xl p-1 mb-8">
              {['login', 'register'].map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError('') }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
                    mode === m
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={v => { setEmail(v); setError('') }}
                placeholder="vos@ejemplo.com"
                icon={<Mail size={15} />}
                autoComplete="email"
              />
              <Field
                label="Contraseña"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={v => { setPassword(v); setError('') }}
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                icon={<Lock size={15} />}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                suffix={
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="text-slate-500 hover:text-slate-300 transition-colors">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
                minLength={6}
              />

              {mode === 'login' && (
                <div className="text-right -mt-1">
                  <button type="button" onClick={goForgot} className="text-xs text-slate-500 hover:text-indigo-400 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 mt-2"
              >
                {loading
                  ? (mode === 'login' ? 'Ingresando...' : 'Creando cuenta...')
                  : (
                    <>
                      {mode === 'login' ? 'Ingresar' : 'Comenzar prueba gratis'}
                      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-slate-500">
              {mode === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
              <button onClick={toggle} className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
                {mode === 'login' ? 'Registrate gratis' : 'Iniciá sesión'}
              </button>
            </p>

            {mode === 'register' && (
              <p className="mt-4 text-center text-[11px] text-slate-600 leading-relaxed">
                Al registrarte aceptás nuestros{' '}
                <a href="/terminos.html" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-400 underline underline-offset-2 transition-colors">
                  Términos y condiciones
                </a>{' '}
                y la{' '}
                <a href="/privacidad.html" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-400 underline underline-offset-2 transition-colors">
                  Política de privacidad
                </a>.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, icon, suffix, autoComplete, minLength }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required
          autoComplete={autoComplete}
          minLength={minLength}
          className="w-full pl-9 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
        />
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{suffix}</span>
        )}
      </div>
    </div>
  )
}

function ForgotScreen({ email, setEmail, loading, error, sent, onSubmit, onBack }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a] p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px]" />
      </div>
      <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 w-full max-w-sm text-center shadow-2xl shadow-black/40">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
          <KeyRound size={26} className="text-indigo-400" />
        </div>
        <h2 className="text-xl font-extrabold text-white mb-1">Recuperar contraseña</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Ingresá tu email y te enviamos un link para restablecer tu contraseña.
        </p>

        {sent ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400">
              <CheckCircle2 size={16} className="shrink-0" />
              Revisá tu correo — te enviamos el link de recuperación.
            </div>
            <button onClick={onBack} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              ← Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 text-left">
            <Field
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={v => setEmail(v)}
              placeholder="vos@ejemplo.com"
              icon={<Mail size={15} />}
              autoComplete="email"
            />
            {error && (
              <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/25"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperación'}
            </button>
            <button type="button" onClick={onBack} className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors pt-1">
              ← Volver al inicio de sesión
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function ConfirmScreen({ email, onBack }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a] p-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 w-full max-w-sm text-center shadow-2xl shadow-black/40">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>
        <h2 className="text-xl font-extrabold text-white mb-2">¡Revisá tu correo!</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Te enviamos un link de confirmación a<br />
          <strong className="text-white">{email}</strong>
        </p>
        <button onClick={onBack} className="mt-6 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          ← Volver al inicio de sesión
        </button>
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

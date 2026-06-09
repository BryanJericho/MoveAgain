import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { Mail, Lock, Eye, EyeOff, Activity, BarChart2, Bot } from 'lucide-react'

type Mode = 'login' | 'register'

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/invalid-credential':     'Email atau kata sandi tidak valid',
  'auth/user-not-found':         'Email tidak terdaftar',
  'auth/wrong-password':         'Kata sandi salah',
  'auth/email-already-in-use':   'Email sudah terdaftar — silakan masuk',
  'auth/weak-password':          'Kata sandi minimal 6 karakter',
  'auth/invalid-email':          'Format email tidak valid',
  'auth/too-many-requests':      'Terlalu banyak percobaan. Coba lagi nanti.',
  'auth/network-request-failed': 'Periksa koneksi internet Anda',
}

const FEATURES = [
  {
    icon: Activity,
    color: 'bg-blue-100 text-blue-600',
    title: 'Deteksi pose AI real-time',
    sub: 'Tanpa alat tambahan',
  },
  {
    icon: BarChart2,
    color: 'bg-emerald-100 text-emerald-600',
    title: 'Pantau progres ROM',
    sub: 'Grafik harian tersimpan di cloud',
  },
  {
    icon: Bot,
    color: 'bg-violet-100 text-violet-600',
    title: 'Konsultasi AI',
    sub: 'Tanya jawab berbasis data Anda',
  },
]

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Tangkap error jika redirect Google gagal (sukses ditangani otomatis oleh onAuthStateChanged)
  useEffect(() => {
    getRedirectResult(auth).catch(err => {
      const code = (err as { code?: string }).code ?? ''
      if (code) setError(FIREBASE_ERRORS[code] ?? 'Login Google gagal. Coba lagi.')
    })
  }, [])

  function handleGoogle() {
    setError(null)
    setGoogleLoading(true)
    // signInWithRedirect lebih reliable di PWA/mobile daripada popup
    signInWithRedirect(auth, new GoogleAuthProvider()).catch(err => {
      const code = (err as { code?: string }).code ?? ''
      setError(FIREBASE_ERRORS[code] ?? 'Login Google gagal. Coba lagi.')
      setGoogleLoading(false)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password)
      }
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      setError(FIREBASE_ERRORS[code] ?? 'Terjadi kesalahan. Coba lagi.')
    }
    setLoading(false)
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
  }

  return (
    <div className="flex flex-col min-h-screen overflow-y-auto">
      {/* ── Hero gradient ───────────────────────── */}
      <div className="gradient-blue flex flex-col items-center pt-14 pb-16 px-6 relative">
        <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center shadow-lg mb-4 ring-4 ring-white/20">
          <img src="/icons/icon.svg" alt="Move Again" className="w-14 h-14 rounded-2xl" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Move Again</h1>
        <p className="text-white/65 text-sm mt-1 font-medium">
          Setiap Gerakan, Selangkah Pemulihan
        </p>
      </div>

      {/* ── Form card (overlaps hero) ────────────── */}
      <div className="flex-1 -mt-6 bg-white rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-6 pt-7 pb-10">

        {/* Tab switcher */}
        <div className="flex bg-slate-100 rounded-2xl p-1 mb-7">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                mode === m
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              onClick={() => switchMode(m)}
            >
              {m === 'login' ? 'Masuk' : 'Daftar Akun'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                className="input-field pl-9"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="label">Kata Sandi</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                className="input-field pl-9 pr-10"
                type={showPw ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Minimal 6 karakter' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                required
                minLength={mode === 'register' ? 6 : undefined}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 mt-1"
            disabled={loading || !email || !password}
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : mode === 'login' ? 'Masuk' : 'Buat Akun'}
          </button>
        </form>

        {/* Divider OR */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-xs text-slate-400 font-medium">atau</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        {/* Google sign-in */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {googleLoading
            ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            : (
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
            )
          }
          <span className="text-sm font-semibold text-slate-700">
            {googleLoading ? 'Mengalihkan ke Google…' : 'Lanjutkan dengan Google'}
          </span>
        </button>

        {/* Switch mode link */}
        <p className="text-center text-sm text-slate-500 mt-5">
          {mode === 'login' ? (
            <>Belum punya akun?{' '}
              <button className="text-primary-600 font-semibold" onClick={() => switchMode('register')}>
                Daftar sekarang
              </button>
            </>
          ) : (
            <>Sudah punya akun?{' '}
              <button className="text-primary-600 font-semibold" onClick={() => switchMode('login')}>
                Masuk
              </button>
            </>
          )}
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 my-7">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-xs text-slate-400 font-medium">Fitur Unggulan</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        {/* Feature highlights */}
        <div className="space-y-3">
          {FEATURES.map(({ icon: Icon, color, title, sub }) => (
            <div key={title} className="flex items-center gap-4 p-3 rounded-2xl border border-slate-100 bg-slate-50/60">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

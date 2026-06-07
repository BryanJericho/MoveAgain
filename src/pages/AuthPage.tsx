import { useState } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../lib/firebase'

type Mode = 'login' | 'register'

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/invalid-credential':       'Email atau kata sandi tidak valid',
  'auth/user-not-found':           'Email tidak terdaftar',
  'auth/wrong-password':           'Kata sandi salah',
  'auth/email-already-in-use':     'Email sudah terdaftar — silakan masuk',
  'auth/weak-password':            'Kata sandi terlalu lemah (minimal 6 karakter)',
  'auth/invalid-email':            'Format email tidak valid',
  'auth/too-many-requests':        'Terlalu banyak percobaan. Coba lagi nanti.',
  'auth/network-request-failed':   'Periksa koneksi internet Anda',
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
      // onAuthStateChanged in App.tsx handles the page transition
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
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header / logo */}
      <div className="gradient-blue flex flex-col items-center pt-16 pb-10 px-6">
        <img
          src="/icons/icon.svg"
          alt="Move Again"
          className="w-24 h-24 rounded-3xl shadow-xl mb-5"
        />
        <h1 className="text-3xl font-black text-white">Move Again</h1>
        <p className="text-white/70 text-sm mt-1 font-medium">
          Setiap Gerakan, Selangkah Pemulihan
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 px-6 pt-8 pb-10">
        {/* Login / Register tab */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-7">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === m
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-slate-500'
              }`}
              onClick={() => switchMode(m)}
            >
              {m === 'login' ? 'Masuk' : 'Daftar Akun'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input-field"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="label">Kata Sandi</label>
            <input
              className="input-field"
              type="password"
              placeholder={mode === 'register' ? 'Minimal 6 karakter' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              minLength={mode === 'register' ? 6 : undefined}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
              <span className="flex-shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 mt-1"
            disabled={loading || !email || !password}
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : mode === 'login' ? '🔑 Masuk' : '📝 Buat Akun'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
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

        {/* Feature highlights */}
        <div className="mt-8 space-y-2.5">
          {[
            ['📷', 'Deteksi pose AI real-time', 'Tanpa alat tambahan'],
            ['📊', 'Pantau progres ROM', 'Grafik harian tersimpan di cloud'],
            ['🤖', 'Konsultasi AI', 'Tanya jawab berbasis data Anda'],
          ].map(([icon, title, sub]) => (
            <div key={title} className="flex items-center gap-3 bg-primary-50 rounded-xl p-3">
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-primary-800">{title}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

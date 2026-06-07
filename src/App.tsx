import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { auth, firebaseReady } from './lib/firebase'
import { getPatientProfile } from './lib/db'
import { useAppStore } from './store/useAppStore'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import SessionPage from './pages/SessionPage'
import HistoryPage from './pages/HistoryPage'
import ChatPage from './pages/ChatPage'
import SettingsPage from './pages/SettingsPage'

// Shown when .env.local is missing / Firebase not configured
function FirebaseSetupPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-16 pb-10">
      <div className="flex flex-col items-center gap-4 text-center mb-8">
        <img src="/icons/icon.svg" alt="Move Again" className="w-20 h-20 rounded-3xl" />
        <h1 className="text-2xl font-black text-slate-800">Setup Firebase</h1>
        <p className="text-slate-500 text-sm">
          Aplikasi belum terhubung ke Firebase. Ikuti langkah berikut:
        </p>
      </div>

      <div className="space-y-4 max-w-sm mx-auto w-full">
        {[
          {
            num: '1',
            title: 'Buat Firebase Project',
            body: 'Buka console.firebase.google.com → Add project → beri nama',
          },
          {
            num: '2',
            title: 'Aktifkan Authentication',
            body: 'Build → Authentication → Sign-in method → aktifkan Email/Password',
          },
          {
            num: '3',
            title: 'Buat Firestore Database',
            body: 'Build → Firestore Database → Create database → Production mode',
          },
          {
            num: '4',
            title: 'Buat file .env.local',
            body: 'Salin dari .env.example dan isi dengan config Firebase Anda (lihat Project Settings → Your Apps)',
          },
          {
            num: '5',
            title: 'Restart dev server',
            body: 'Ctrl+C lalu npm run dev',
          },
        ].map(({ num, title, body }) => (
          <div key={num} className="flex gap-4 items-start">
            <div className="w-8 h-8 gradient-blue rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
              {num}
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{title}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-4 max-w-sm mx-auto w-full">
        <p className="text-xs font-semibold text-amber-700 mb-1">📄 Contoh isi .env.local:</p>
        <pre className="text-[11px] text-amber-800 leading-relaxed overflow-x-auto">{`VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nama-project
VITE_FIREBASE_STORAGE_BUCKET=app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=12345
VITE_FIREBASE_APP_ID=1:12345:web:abc`}</pre>
      </div>
    </div>
  )
}

export default function App() {
  // Show setup guide if Firebase env vars are not configured
  if (!firebaseReady) return <FirebaseSetupPage />

  return <AuthenticatedApp />
}

function AuthenticatedApp() {
  // undefined = still checking auth, null = not logged in, User = logged in
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined)
  const { currentPatient, setCurrentPatient } = useAppStore()

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getPatientProfile(user.uid)
          setCurrentPatient(profile)   // null → show Onboarding
        } catch {
          setCurrentPatient(null)
        }
      } else {
        setCurrentPatient(null)
      }
      setAuthUser(user)
    })
  }, [setCurrentPatient])

  // ── Auth loading ────────────────────────────────────────
  if (authUser === undefined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <img src="/icons/icon.svg" alt="Move Again" className="w-16 h-16 rounded-2xl opacity-80" />
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  // ── Not logged in → Auth screen ─────────────────────────
  if (!authUser) return <AuthPage />

  // ── Logged in, no profile yet → Onboarding ─────────────
  if (!currentPatient) return <OnboardingPage />

  // ── Fully authenticated ─────────────────────────────────
  return (
    <BrowserRouter>
      <div className="flex flex-col flex-1 min-h-0">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}

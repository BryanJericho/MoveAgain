import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Award, Flame, ChevronRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { getRecentSessions, type Session } from '../lib/db'
import { getExerciseById } from '../lib/exercises'
import { preloadModels } from '../lib/mediapipe'

interface Stats {
  totalSessions: number
  lastMaxRom: number
  lastExercise: string
  streakDays: number
  recentSessions: Session[]
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function calcStreak(sessions: Session[]): number {
  if (!sessions.length) return 0
  const dates = [...new Set(sessions.map(s => new Date(s.startTime).toDateString()))]
  const today = new Date()
  let streak = 0
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (dates.includes(d.toDateString())) streak++
    else break
  }
  return streak
}

export default function HomePage() {
  const navigate = useNavigate()
  const { currentPatient } = useAppStore()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => { preloadModels() }, [])

  useEffect(() => {
    if (!currentPatient?.id) return
    getRecentSessions(currentPatient.id, 50).then(sessions => {
      const last = sessions[0]
      setStats({
        totalSessions: sessions.length,
        lastMaxRom: last?.maxRom ?? 0,
        lastExercise: last ? (getExerciseById(last.exerciseType)?.nameShort ?? last.exerciseType) : '-',
        streakDays: calcStreak(sessions),
        recentSessions: sessions.slice(0, 5)
      })
    })
  }, [currentPatient])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Selamat Pagi'
    if (h < 17) return 'Selamat Siang'
    return 'Selamat Malam'
  }

  return (
    <div className="page-container">
      {/* Header — logo + greeting */}
      <div className="gradient-blue px-5 pt-12 pb-8 text-white">
        <div className="flex items-center gap-3 mb-5">
          <img
            src="/icons/icon.svg"
            alt="Move Again"
            className="w-12 h-12 rounded-xl shadow-md bg-white/10"
          />
          <div>
            <p className="font-black text-base tracking-wide">Move Again</p>
            <p className="text-white/60 text-xs">Setiap Gerakan, Selangkah Pemulihan</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold">
          {greeting()},<br />
          <span>{currentPatient?.name ?? 'Pasien'} 👋</span>
        </h1>
        <p className="text-white/70 text-sm mt-1">
          {stats?.totalSessions
            ? `Sudah ${stats.totalSessions} sesi latihan. Terus semangat!`
            : 'Yuk mulai sesi latihan pertama Anda hari ini!'}
        </p>
      </div>

      <div className="px-4 py-5 flex flex-col gap-5">
        {/* Stat cards */}
        {stats && stats.totalSessions > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="card flex flex-col items-center text-center gap-1">
              <Award size={20} className="text-primary-600" />
              <p className="text-2xl font-bold text-primary-800">{stats.totalSessions}</p>
              <p className="text-xs text-slate-500">Total Sesi</p>
            </div>
            <div className="card flex flex-col items-center text-center gap-1">
              <TrendingUp size={20} className="text-green-500" />
              <p className="text-2xl font-bold text-green-700">{Math.round(stats.lastMaxRom)}°</p>
              <p className="text-xs text-slate-500">Gerak Terakhir</p>
            </div>
            <div className="card flex flex-col items-center text-center gap-1">
              <Flame size={20} className="text-orange-500" />
              <p className="text-2xl font-bold text-orange-600">{stats.streakDays}</p>
              <p className="text-xs text-slate-500">Hari Beruntun</p>
            </div>
          </div>
        )}

        {/* Quick start */}
        <div>
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            🏃 Mulai Latihan
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              className="card flex flex-col gap-2 items-start active:scale-[0.98] transition-transform text-left"
              onClick={() => navigate('/session?mode=body')}
            >
              <span className="text-2xl">🦾</span>
              <div>
                <p className="font-semibold text-sm text-slate-800">Tubuh</p>
                <p className="text-xs text-slate-500">Siku, Bahu, Lutut, Ankle</p>
              </div>
            </button>
            <button
              className="card flex flex-col gap-2 items-start active:scale-[0.98] transition-transform text-left"
              onClick={() => navigate('/session?mode=hand')}
            >
              <span className="text-2xl">✋</span>
              <div>
                <p className="font-semibold text-sm text-slate-800">Tangan</p>
                <p className="text-xs text-slate-500">Jari & Pergelangan</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent sessions */}
        {stats && stats.recentSessions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-700">Sesi Terakhir</h2>
              <button
                className="text-primary-600 text-xs font-semibold flex items-center gap-1"
                onClick={() => navigate('/history')}
              >
                Lihat Semua <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {stats.recentSessions.map(s => {
                const ex = getExerciseById(s.exerciseType)
                return (
                  <div key={s.id} className="card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center">
                        <span className="text-sm">{s.mode === 'hand' ? '✋' : '🦾'}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{ex?.nameShort ?? s.exerciseType}</p>
                        <p className="text-xs text-slate-500">{formatDate(s.startTime)} · {s.repCount} gerakan</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-primary-700">{Math.round(s.maxRom)}°</p>
                      <p className="text-xs text-slate-400">gerak maks</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {(!stats || stats.totalSessions === 0) && (
          <div className="card flex flex-col items-center text-center gap-4 py-8">
            <span className="text-5xl">🏃</span>
            <div>
              <p className="font-bold text-slate-700">Belum Ada Latihan</p>
              <p className="text-sm text-slate-500 mt-1">
                Mulai latihan pertama Anda hari ini — setiap gerakan adalah kemajuan!
              </p>
            </div>
            <button className="btn-primary" onClick={() => navigate('/session')}>
              Mulai Latihan Sekarang
            </button>
          </div>
        )}

        {/* Daily tip */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
          <span className="text-xl">💡</span>
          <div>
            <p className="text-sm font-semibold text-blue-800">Tips Pemulihan</p>
            <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
              Rutin lebih penting dari keras. Latihan 15 menit tiap hari jauh lebih baik
              dibanding latihan lama tapi hanya sekali seminggu.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

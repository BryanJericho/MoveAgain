import { useEffect, useState } from 'react'
import { BarChart2, Filter, Trash2, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'
import { getRecentSessions, deleteSession, type Session } from '../lib/db'
import { useAppStore } from '../store/useAppStore'
import { getExerciseById, ALL_EXERCISES } from '../lib/exercises'
import ROMChart from '../components/ROMChart'
import RepsChart from '../components/RepsChart'
import SessionSamplesChart from '../components/SessionSamplesChart'

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}d`
  return `${Math.floor(sec / 60)}m ${sec % 60}d`
}

type ChartTab = 'rom' | 'reps'

export default function HistoryPage() {
  const { currentPatient } = useAppStore()
  const [sessions, setSessions] = useState<Session[]>([])
  const [filterExercise, setFilterExercise] = useState<string>('all')
  const [showFilter, setShowFilter] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartTab, setChartTab] = useState<ChartTab>('rom')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!currentPatient?.id) return
    setLoading(true)
    getRecentSessions(currentPatient.id, 100)
      .then(setSessions)
      .finally(() => setLoading(false))
  }, [currentPatient])

  const filtered = filterExercise === 'all'
    ? sessions
    : sessions.filter(s => s.exerciseType === filterExercise)

  const usedExerciseIds = [...new Set(sessions.map(s => s.exerciseType))]

  const summary = {
    total: filtered.length,
    bestRom: filtered.length ? Math.max(...filtered.map(s => s.maxRom)) : 0,
    avgRom: filtered.length
      ? filtered.reduce((a, s) => a + s.avgRom, 0) / filtered.length
      : 0,
    totalReps: filtered.reduce((a, s) => a + s.repCount, 0)
  }

  async function handleDeleteSession(sessionId: string) {
    if (!currentPatient?.id) return
    setDeletingId(sessionId)
    await deleteSession(currentPatient.id, sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    setDeletingId(null)
    if (expandedId === sessionId) setExpandedId(null)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <BarChart2 size={22} className="text-primary-700" />
        <h1 className="font-bold text-lg text-slate-800 flex-1">Progres Saya</h1>
        <button
          className="p-2 rounded-xl bg-primary-50 text-primary-700"
          onClick={() => setShowFilter(!showFilter)}
        >
          <Filter size={18} />
        </button>
      </div>

      {showFilter && (
        <div className="px-4 pt-3 pb-0">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filterExercise === 'all' ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600'}`}
              onClick={() => setFilterExercise('all')}
            >
              Semua
            </button>
            {usedExerciseIds.map(id => {
              const ex = getExerciseById(id)
              return (
                <button
                  key={id}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filterExercise === id ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600'}`}
                  onClick={() => setFilterExercise(id)}
                >
                  {ex?.nameShort ?? id}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="px-4 py-4 flex flex-col gap-5">
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Sesi', value: summary.total },
                { label: 'ROM Terbaik', value: `${Math.round(summary.bestRom)}°` },
                { label: 'ROM Rata²', value: `${Math.round(summary.avgRom)}°` },
                { label: 'Total Rep', value: summary.totalReps }
              ].map(({ label, value }) => (
                <div key={label} className="card flex flex-col items-center text-center p-3">
                  <p className="text-lg font-black text-primary-700">{value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{label}</p>
                </div>
              ))}
            </div>

            {/* Charts section */}
            {filtered.length >= 2 && (
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-primary-600" />
                    <p className="text-sm font-semibold text-slate-700">Grafik Progres</p>
                  </div>
                  {/* Tab switcher */}
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    <button
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${chartTab === 'rom' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500'}`}
                      onClick={() => setChartTab('rom')}
                    >
                      ROM
                    </button>
                    <button
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${chartTab === 'reps' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500'}`}
                      onClick={() => setChartTab('reps')}
                    >
                      Reps
                    </button>
                  </div>
                </div>

                {chartTab === 'rom' && (
                  <>
                    <p className="text-xs text-slate-400 mb-2">
                      Tren ROM maksimum & rata-rata per sesi
                      {filterExercise !== 'all' && ` · ${getExerciseById(filterExercise)?.nameShort}`}
                    </p>
                    <ROMChart
                      sessions={filtered}
                      exerciseType={filterExercise === 'all' ? undefined : filterExercise}
                    />
                  </>
                )}

                {chartTab === 'reps' && (
                  <>
                    <p className="text-xs text-slate-400 mb-2">
                      Jumlah repetisi per sesi — biru = terbanyak
                    </p>
                    <RepsChart
                      sessions={filtered}
                      exerciseType={filterExercise === 'all' ? undefined : filterExercise}
                    />
                  </>
                )}
              </div>
            )}

            {/* Session list */}
            <div>
              <h2 className="text-sm font-bold text-slate-600 mb-3">Riwayat Sesi</h2>
              <div className="space-y-2">
                {filtered.map(s => {
                  const ex = getExerciseById(s.exerciseType)
                  const isExpanded = expandedId === s.id
                  const hasSamples = (s.romSamples?.length ?? 0) >= 2

                  return (
                    <div key={s.id} className="card overflow-hidden">
                      {/* Main row */}
                      <button
                        className="w-full flex items-center gap-3 text-left"
                        onClick={() => setExpandedId(isExpanded ? null : (s.id ?? null))}
                      >
                        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span>{s.mode === 'hand' ? '✋' : '🦾'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {ex?.nameShort ?? s.exerciseType}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(s.startTime)} · {formatDuration(s.durationSec)} · {s.repCount} rep
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-base font-black text-primary-700">{Math.round(s.maxRom)}°</p>
                            <p className="text-[10px] text-slate-400">maks</p>
                          </div>
                          {hasSamples
                            ? isExpanded
                              ? <ChevronUp size={14} className="text-slate-400" />
                              : <ChevronDown size={14} className="text-slate-400" />
                            : null
                          }
                          <button
                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                            onClick={e => { e.stopPropagation(); s.id && handleDeleteSession(s.id) }}
                            disabled={deletingId === s.id}
                          >
                            {deletingId === s.id
                              ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                              : <Trash2 size={14} />}
                          </button>
                        </div>
                      </button>

                      {/* Expanded: ROM samples chart */}
                      {isExpanded && hasSamples && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-xs text-slate-400 mb-2">ROM selama sesi</p>
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {[
                              { label: 'Maks', value: `${Math.round(s.maxRom)}°` },
                              { label: 'Rata-rata', value: `${Math.round(s.avgRom)}°` },
                              { label: 'Min', value: `${Math.round(s.minRom)}°` },
                            ].map(({ label, value }) => (
                              <div key={label} className="bg-slate-50 rounded-lg p-2 text-center">
                                <p className="text-sm font-bold text-primary-700">{value}</p>
                                <p className="text-[10px] text-slate-400">{label}</p>
                              </div>
                            ))}
                          </div>
                          <SessionSamplesChart
                            samples={s.romSamples!}
                            normalMax={ex?.normalRange[1]}
                            height={130}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="text-5xl">📊</span>
            <div>
              <p className="font-bold text-slate-700">Belum Ada Data</p>
              <p className="text-sm text-slate-500 mt-1">
                Mulai latihan untuk melihat progres ROM Anda di sini
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Brain, Clock, ChevronDown, AlertCircle, RefreshCw, CalendarClock } from 'lucide-react'
import type { Session, Patient } from '../lib/db'
import { predictRecovery, JOINT_NAME_MAP, type PredictionResult } from '../lib/prediction'

interface Props {
  sessions: Session[]
  patient: Patient
}

function groupByJoint(sessions: Session[]): Map<string, Session[]> {
  const map = new Map<string, Session[]>()
  for (const s of sessions) {
    if (!map.has(s.jointTarget)) map.set(s.jointTarget, [])
    map.get(s.jointTarget)!.push(s)
  }
  return map
}

function sisaHariInfo(sisaHari: number): { label: string; sub: string; color: string } {
  if (sisaHari <= 0) return {
    label: `${Math.abs(sisaHari)} hari`,
    sub: 'melewati estimasi — terus latihan!',
    color: 'text-green-600'
  }
  if (sisaHari <= 14) return { label: `${sisaHari} hari`, sub: 'lagi dari sekarang', color: 'text-green-600' }
  if (sisaHari <= 30) return { label: `${sisaHari} hari`, sub: 'lagi dari sekarang', color: 'text-amber-500' }
  return { label: `${sisaHari} hari`, sub: 'lagi dari sekarang', color: 'text-primary-700' }
}

export default function RecoveryPredictionCard({ sessions, patient }: Props) {
  const jointGroups = groupByJoint(sessions)
  const joints = [...jointGroups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([joint]) => joint)

  const [selectedJoint, setSelectedJoint] = useState(joints[0] ?? '')
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [hariOnsetSaatIni, setHariOnsetSaatIni] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const missingProfile = !patient.strokeType || !patient.strokeOnsetDate
  const jointSessions = selectedJoint ? (jointGroups.get(selectedJoint) ?? []) : []

  async function runPrediction() {
    if (!patient.strokeType || !patient.strokeOnsetDate || !selectedJoint) return

    const sorted = [...jointSessions].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    const romHistory = sorted.map(s => s.maxRom)
    const hariOnset = Math.max(1, Math.floor(
      (Date.now() - new Date(patient.strokeOnsetDate).getTime()) / (1000 * 60 * 60 * 24)
    ))

    setLoading(true)
    setError(null)
    try {
      const res = await predictRecovery({
        usia: patient.age,
        jenis_stroke: patient.strokeType,
        hari_onset: hariOnset,
        skor_konsentrasi: 0.78, // gunakan nilai mean training agar tidak bias
        jenis_sendi: JOINT_NAME_MAP[selectedJoint] ?? selectedJoint,
        rom_history: romHistory,
      })
      setResult(res)
      setHariOnsetSaatIni(hariOnset)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal terhubung ke server prediksi')
    }
    setLoading(false)
  }

  if (joints.length === 0) return null

  const jointLabel = JOINT_NAME_MAP[selectedJoint] ?? selectedJoint
  const sessionCount = jointGroups.get(selectedJoint)?.length ?? 0

  const sisaHari = result ? result.prediksi.median_hari - hariOnsetSaatIni : 0
  const sisaCI = result
    ? { low: result.prediksi.ci_95_lower - hariOnsetSaatIni, high: result.prediksi.ci_95_upper - hariOnsetSaatIni }
    : null
  const sisaInfo = result ? sisaHariInfo(sisaHari) : null

  return (
    <div className="card border-primary-100 bg-gradient-to-br from-primary-50/50 to-blue-50/30">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 gradient-blue rounded-lg flex items-center justify-center flex-shrink-0">
          <Brain size={14} color="white" />
        </div>
        <h3 className="font-bold text-slate-800 text-sm">Prediksi Pemulihan</h3>
        <span className="ml-auto text-[10px] bg-primary-100 text-primary-700 font-semibold px-2 py-0.5 rounded-full">
          Model Bayesian
        </span>
      </div>

      {missingProfile ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            Lengkapi <strong>jenis stroke</strong> dan <strong>tanggal onset stroke</strong> di
            halaman <strong>Pengaturan → Profil Pasien</strong> untuk mengaktifkan prediksi ini.
          </p>
        </div>
      ) : (
        <>
          {joints.length > 1 && (
            <div className="mb-3">
              <label className="label text-xs">Sendi yang diprediksi</label>
              <div className="relative">
                <select
                  className="input-field text-sm appearance-none pr-8"
                  value={selectedJoint}
                  onChange={e => { setSelectedJoint(e.target.value); setResult(null) }}
                >
                  {joints.map(j => (
                    <option key={j} value={j}>
                      {JOINT_NAME_MAP[j] ?? j} ({jointGroups.get(j)?.length ?? 0} sesi)
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {result && sisaCI && sisaInfo && (
            <div className="bg-white rounded-xl p-4 mb-3 border border-primary-100 space-y-3">
              {/* Sisa hari — metrik utama */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <CalendarClock size={13} className="text-primary-600" />
                  <p className="text-xs font-semibold text-slate-500">Estimasi Waktu Pulih · {jointLabel}</p>
                </div>
                <p className={`text-4xl font-black leading-none ${sisaInfo.color}`}>
                  {sisaInfo.label}
                </p>
                <p className="text-sm text-slate-500 mt-1">{sisaInfo.sub}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rentang: {sisaCI.low} – {sisaCI.high} hari (CI 95%)
                </p>
              </div>

              {/* Dari onset stroke */}
              <div className="border-t border-slate-50 pt-3 grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Clock size={11} className="text-slate-400" />
                    <p className="text-[10px] text-slate-400">Target hari ke-</p>
                  </div>
                  <p className="text-lg font-black text-primary-700">{result.prediksi.median_hari}</p>
                  <p className="text-[10px] text-slate-400">dari onset stroke</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Clock size={11} className="text-slate-400" />
                    <p className="text-[10px] text-slate-400">Sudah berjalan</p>
                  </div>
                  <p className="text-lg font-black text-slate-600">{hariOnsetSaatIni}</p>
                  <p className="text-[10px] text-slate-400">hari sejak stroke</p>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                Berdasarkan {result.input_sesi} sesi · {sessionCount} total sesi {jointLabel}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
              <p className="text-xs text-red-600 font-medium">Gagal menghitung prediksi</p>
              <p className="text-xs text-red-500 mt-0.5">{error}</p>
              <p className="text-xs text-red-400 mt-1">
                Pastikan server R berjalan:{' '}
                <code className="bg-red-100 px-1 rounded">npm run rapi</code>
              </p>
            </div>
          )}

          <button
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5"
            onClick={runPrediction}
            disabled={loading}
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <RefreshCw size={14} />}
            {loading ? 'Menghitung...' : result ? 'Hitung Ulang' : `Hitung Prediksi (${sessionCount} sesi)`}
          </button>
        </>
      )}

      <p className="text-[10px] text-slate-400 mt-2 text-center leading-relaxed">
        Prediksi bersifat informatif. Selalu konsultasikan hasil dengan dokter atau terapis Anda.
      </p>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Camera, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ExerciseConfig } from '../lib/exercises'

interface Props {
  exercise: ExerciseConfig
  onStart: () => void
  loading?: boolean
}

interface Geometry {
  ax: number; ay: number
  bx: number; by: number
  segLen: number
  startDeg: number
  maxFlexDeg: number
  flexDir: number
  labelA: string
  labelB: string
  labelC: string
  bodyHint?: string
}

const GEOMETRIES: Record<string, Geometry> = {
  elbow_flex_right: {
    ax: 110, ay: 25, bx: 110, by: 100, segLen: 68,
    startDeg: 90, maxFlexDeg: 125, flexDir: -1,
    labelA: 'Bahu', labelB: 'Siku', labelC: 'Pergelangan'
  },
  elbow_flex_left: {
    ax: 90, ay: 25, bx: 90, by: 100, segLen: 68,
    startDeg: 90, maxFlexDeg: 125, flexDir: 1,
    labelA: 'Bahu', labelB: 'Siku', labelC: 'Pergelangan'
  },
  shoulder_abd_right: {
    ax: 110, ay: 110, bx: 110, by: 40, segLen: 72,
    startDeg: 90, maxFlexDeg: 150, flexDir: -1,
    labelA: 'Pinggul', labelB: 'Bahu', labelC: 'Siku',
    bodyHint: 'torso'
  },
  shoulder_abd_left: {
    ax: 90, ay: 110, bx: 90, by: 40, segLen: 72,
    startDeg: 90, maxFlexDeg: 150, flexDir: 1,
    labelA: 'Pinggul', labelB: 'Bahu', labelC: 'Siku',
    bodyHint: 'torso'
  },
  knee_flex_right: {
    ax: 100, ay: 20, bx: 100, by: 100, segLen: 72,
    startDeg: 90, maxFlexDeg: 115, flexDir: -1,
    labelA: 'Pinggul', labelB: 'Lutut', labelC: 'Ankle'
  },
  knee_flex_left: {
    ax: 100, ay: 20, bx: 100, by: 100, segLen: 72,
    startDeg: 90, maxFlexDeg: 115, flexDir: 1,
    labelA: 'Pinggul', labelB: 'Lutut', labelC: 'Ankle'
  },
  ankle_dorsi_right: {
    ax: 100, ay: 20, bx: 100, by: 110, segLen: 60,
    startDeg: 90, maxFlexDeg: 30, flexDir: -1,
    labelA: 'Lutut', labelB: 'Ankle', labelC: 'Ujung Kaki'
  },
  index_pip: {
    ax: 100, ay: 40, bx: 100, by: 105, segLen: 50,
    startDeg: 90, maxFlexDeg: 90, flexDir: -1,
    labelA: 'MCP', labelB: 'PIP', labelC: 'DIP',
    bodyHint: 'finger_base'
  },
  middle_pip: {
    ax: 100, ay: 40, bx: 100, by: 105, segLen: 50,
    startDeg: 90, maxFlexDeg: 90, flexDir: -1,
    labelA: 'MCP', labelB: 'PIP', labelC: 'DIP',
    bodyHint: 'finger_base'
  },
  ring_pip: {
    ax: 100, ay: 40, bx: 100, by: 105, segLen: 50,
    startDeg: 90, maxFlexDeg: 90, flexDir: -1,
    labelA: 'MCP', labelB: 'PIP', labelC: 'DIP',
    bodyHint: 'finger_base'
  },
  pinky_pip: {
    ax: 100, ay: 40, bx: 100, by: 105, segLen: 50,
    startDeg: 90, maxFlexDeg: 80, flexDir: -1,
    labelA: 'MCP', labelB: 'PIP', labelC: 'DIP',
    bodyHint: 'finger_base'
  },
  thumb_ip: {
    ax: 100, ay: 40, bx: 100, by: 105, segLen: 50,
    startDeg: 90, maxFlexDeg: 70, flexDir: -1,
    labelA: 'CMC/MCP', labelB: 'IP', labelC: 'Ujung',
    bodyHint: 'finger_base'
  },
  index_mcp: {
    ax: 100, ay: 40, bx: 100, by: 105, segLen: 55,
    startDeg: 90, maxFlexDeg: 80, flexDir: -1,
    labelA: 'Pergelangan', labelB: 'MCP', labelC: 'PIP',
    bodyHint: 'finger_base'
  },
}

function deg2rad(d: number) { return d * Math.PI / 180 }

function computeC(geo: Geometry, progress: number) {
  const angle = deg2rad(geo.startDeg + geo.flexDir * geo.maxFlexDeg * progress)
  return { cx: geo.bx + geo.segLen * Math.cos(angle), cy: geo.by + geo.segLen * Math.sin(angle) }
}

function arcPath(geo: Geometry, progress: number): string {
  const r = 32
  const s = deg2rad(geo.startDeg)
  const e = deg2rad(geo.startDeg + geo.flexDir * geo.maxFlexDeg * progress)
  const x1 = geo.bx + r * Math.cos(s), y1 = geo.by + r * Math.sin(s)
  const x2 = geo.bx + r * Math.cos(e), y2 = geo.by + r * Math.sin(e)
  const large = geo.maxFlexDeg * progress > 180 ? 1 : 0
  const sweep = geo.flexDir > 0 ? 1 : 0
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} ${sweep} ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

function BodyHint({ hint }: { hint?: string }) {
  if (hint === 'torso') return (
    <g opacity="0.15">
      <rect x="82" y="38" width="36" height="80" rx="8" fill="#1e3a8a" />
    </g>
  )
  if (hint === 'finger_base') return (
    <g opacity="0.18">
      <rect x="62" y="148" width="76" height="55" rx="10" fill="#1e3a8a" />
    </g>
  )
  return null
}

// ── Animated joint diagram ──────────────────────────────────────────
function JointDiagram({ exercise }: { exercise: ExerciseConfig }) {
  const rafRef = useRef<number>(0)
  const tRef = useRef(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const animate = () => {
      tRef.current += 0.018
      setProgress((Math.sin(tRef.current - Math.PI / 2) + 1) / 2)
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const geo = GEOMETRIES[exercise.id] ?? GEOMETRIES['elbow_flex_right']
  const { cx: cx0, cy: cy0 } = computeC(geo, 0)
  const { cx, cy } = computeC(geo, progress)
  const currentDeg = Math.round(geo.maxFlexDeg * progress)

  const midRad = deg2rad(geo.startDeg + geo.flexDir * geo.maxFlexDeg * progress * 0.5)
  const lx = geo.bx + 50 * Math.cos(midRad)
  const ly = geo.by + 50 * Math.sin(midRad)

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 220" className="w-full max-w-[200px]">
        <BodyHint hint={geo.bodyHint} />

        {/* Ghost extended */}
        <line x1={geo.ax} y1={geo.ay} x2={geo.bx} y2={geo.by} stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />
        <line x1={geo.bx} y1={geo.by} x2={cx0} y2={cy0} stroke="#dbeafe" strokeWidth="6" strokeLinecap="round" strokeDasharray="6 4" />

        {/* Animated */}
        <line x1={geo.ax} y1={geo.ay} x2={geo.bx} y2={geo.by} stroke="#1d4ed8" strokeWidth="8" strokeLinecap="round" />
        <line x1={geo.bx} y1={geo.by} x2={cx} y2={cy} stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" />

        {/* Angle arc */}
        {progress > 0.05 && <>
          <path d={arcPath(geo, progress)} stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <text x={lx} y={ly} fill="#f59e0b" fontSize="13" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
            {currentDeg}°
          </text>
        </>}

        {/* Joint A */}
        <circle cx={geo.ax} cy={geo.ay} r={9} fill="#3b82f6" />
        <text x={geo.ax} y={geo.ay - 14} fill="#1e40af" fontSize="10" textAnchor="middle" fontWeight="600">{geo.labelA}</text>

        {/* Joint B — measured */}
        <circle cx={geo.bx} cy={geo.by} r={12} fill="#f59e0b" />
        <circle cx={geo.bx} cy={geo.by} r={16} fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.35" />
        <text x={geo.bx + 20} y={geo.by + 4} fill="#b45309" fontSize="10" fontWeight="700">{geo.labelB}</text>

        {/* Joint C */}
        <circle cx={cx} cy={cy} r={9} fill="#3b82f6" />
        <text x={cx} y={cy + 16} fill="#1e40af" fontSize="10" textAnchor="middle" fontWeight="600">{geo.labelC}</text>
      </svg>

      <div className="flex gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-xs text-slate-500">Titik ukur</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
          <span className="text-xs text-slate-500">Sendi bantu</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-blue-200 rounded" />
          <span className="text-xs text-slate-500">Posisi awal</span>
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────
export default function ExerciseGuide({ exercise, onStart, loading }: Props) {
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white">
      {/* Header */}
      <div className="gradient-blue px-5 pt-10 pb-5 text-white">
        <p className="text-xs text-white/60 font-medium mb-1">Tutorial Latihan</p>
        <h2 className="text-xl font-black">{exercise.name}</h2>
        <p className="text-sm text-white/70 mt-1">ROM Normal: {exercise.normalRange[0]}° – {exercise.normalRange[1]}°</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* Posisi + animasi — side by side di layar cukup lebar, stacked di sempit */}
        <div className="card">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-base">🧍</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Posisi Tubuh</p>
              <p className="text-xs text-slate-500 mt-0.5">{exercise.positionHint}</p>
            </div>
          </div>
          <JointDiagram exercise={exercise} />
          <p className="text-center text-xs text-slate-400 mt-2">
            Animasi gerakan — titik <span className="text-amber-500 font-semibold">{GEOMETRIES[exercise.id]?.labelB ?? 'B'}</span> adalah sudut yang diukur
          </p>
        </div>

        {/* Langkah-langkah */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={17} className="text-primary-600" />
            <p className="text-sm font-bold text-slate-700">Langkah-langkah</p>
          </div>
          <div className="space-y-2.5">
            {exercise.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-blue-50 rounded-xl p-3 flex items-start gap-2">
            <span className="text-base flex-shrink-0">💡</span>
            <p className="text-xs text-blue-700 leading-relaxed">
              Lakukan <strong>perlahan dan terkontrol</strong>. Tahan di posisi maksimal 1–2 detik.
              <strong> Hentikan jika terasa nyeri tajam.</strong>
            </p>
          </div>
        </div>

        {/* Tips kamera */}
        <div className="card border-amber-100 bg-amber-50/40">
          <div className="flex items-center gap-2 mb-3">
            <Camera size={17} className="text-amber-600" />
            <p className="text-sm font-bold text-amber-700">Posisi Kamera</p>
          </div>
          <div className="space-y-2">
            {exercise.cameraTips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5 flex-shrink-0">•</span>
                <p className="text-xs text-amber-800 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Kesalahan umum */}
        <div className="card border-red-100 bg-red-50/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={17} className="text-red-500" />
            <p className="text-sm font-bold text-red-700">Yang Perlu Dihindari</p>
          </div>
          <div className="space-y-2">
            {exercise.commonMistakes.map((mistake, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-red-400 font-bold flex-shrink-0 text-sm mt-0.5">✕</span>
                <p className="text-xs text-red-700 leading-relaxed">{mistake}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Start button */}
      <div className="px-4 pb-20 pt-3 bg-white border-t border-slate-100 flex-shrink-0">
        <button
          className="btn-primary w-full flex items-center justify-center gap-2 text-base"
          onClick={onStart}
          disabled={loading}
        >
          {loading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Memuat model…</>
            : '📷 Saya Siap — Mulai Latihan'}
        </button>
      </div>
    </div>
  )
}

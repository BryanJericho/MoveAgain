import { useEffect, useRef, useState } from 'react'
import type { ExerciseConfig } from '../lib/exercises'

interface Props {
  exercise: ExerciseConfig
  onStart: () => void
  loading?: boolean
}

interface Geometry {
  // Fixed joint positions in 200x220 SVG space
  ax: number; ay: number  // proximal (A)
  bx: number; by: number  // vertex / measured joint (B)
  segLen: number           // length of BC segment (pixels)
  startDeg: number         // direction of BC when fully extended (0=right, 90=down)
  maxFlexDeg: number       // how many degrees BC rotates toward flexed position
  flexDir: number          // +1 = clockwise, -1 = counter-clockwise
  labelA: string
  labelB: string
  labelC: string
  bodyHint?: string        // extra SVG element for context (e.g. "torso")
}

const GEOMETRIES: Record<string, Geometry> = {
  elbow_flex_right: {
    ax: 110, ay: 25,   bx: 110, by: 100, segLen: 68,
    startDeg: 90, maxFlexDeg: 125, flexDir: -1,
    labelA: 'Bahu', labelB: 'Siku', labelC: 'Pergelangan'
  },
  elbow_flex_left: {
    ax: 90, ay: 25,    bx: 90, by: 100, segLen: 68,
    startDeg: 90, maxFlexDeg: 125, flexDir: 1,
    labelA: 'Bahu', labelB: 'Siku', labelC: 'Pergelangan'
  },
  shoulder_abd_right: {
    ax: 110, ay: 110,  bx: 110, by: 40, segLen: 72,
    startDeg: 90, maxFlexDeg: 150, flexDir: -1,
    labelA: 'Pinggul', labelB: 'Bahu', labelC: 'Siku',
    bodyHint: 'torso'
  },
  shoulder_abd_left: {
    ax: 90, ay: 110,   bx: 90, by: 40, segLen: 72,
    startDeg: 90, maxFlexDeg: 150, flexDir: 1,
    labelA: 'Pinggul', labelB: 'Bahu', labelC: 'Siku',
    bodyHint: 'torso'
  },
  knee_flex_right: {
    ax: 100, ay: 20,   bx: 100, by: 100, segLen: 72,
    startDeg: 90, maxFlexDeg: 115, flexDir: -1,
    labelA: 'Pinggul', labelB: 'Lutut', labelC: 'Ankle'
  },
  knee_flex_left: {
    ax: 100, ay: 20,   bx: 100, by: 100, segLen: 72,
    startDeg: 90, maxFlexDeg: 115, flexDir: 1,
    labelA: 'Pinggul', labelB: 'Lutut', labelC: 'Ankle'
  },
  ankle_dorsi_right: {
    ax: 100, ay: 20,   bx: 100, by: 110, segLen: 60,
    startDeg: 90, maxFlexDeg: 30, flexDir: -1,
    labelA: 'Lutut', labelB: 'Ankle', labelC: 'Ujung Kaki'
  },
  index_pip: {
    ax: 100, ay: 40,   bx: 100, by: 105, segLen: 50,
    startDeg: 90, maxFlexDeg: 90, flexDir: -1,
    labelA: 'MCP', labelB: 'PIP', labelC: 'DIP',
    bodyHint: 'finger_base'
  },
  middle_pip: {
    ax: 100, ay: 40,   bx: 100, by: 105, segLen: 50,
    startDeg: 90, maxFlexDeg: 90, flexDir: -1,
    labelA: 'MCP', labelB: 'PIP', labelC: 'DIP',
    bodyHint: 'finger_base'
  },
  ring_pip: {
    ax: 100, ay: 40,   bx: 100, by: 105, segLen: 50,
    startDeg: 90, maxFlexDeg: 90, flexDir: -1,
    labelA: 'MCP', labelB: 'PIP', labelC: 'DIP',
    bodyHint: 'finger_base'
  },
  pinky_pip: {
    ax: 100, ay: 40,   bx: 100, by: 105, segLen: 50,
    startDeg: 90, maxFlexDeg: 80, flexDir: -1,
    labelA: 'MCP', labelB: 'PIP', labelC: 'DIP',
    bodyHint: 'finger_base'
  },
  thumb_ip: {
    ax: 100, ay: 40,   bx: 100, by: 105, segLen: 50,
    startDeg: 90, maxFlexDeg: 70, flexDir: -1,
    labelA: 'CMC/MCP', labelB: 'IP', labelC: 'Ujung',
    bodyHint: 'finger_base'
  },
  index_mcp: {
    ax: 100, ay: 40,   bx: 100, by: 105, segLen: 55,
    startDeg: 90, maxFlexDeg: 80, flexDir: -1,
    labelA: 'Pergelangan', labelB: 'MCP', labelC: 'PIP',
    bodyHint: 'finger_base'
  }
}

function deg2rad(d: number) { return d * Math.PI / 180 }

function computeC(geo: Geometry, progress: number) {
  const flexed = geo.startDeg + geo.flexDir * geo.maxFlexDeg * progress
  const rad = deg2rad(flexed)
  return {
    cx: geo.bx + geo.segLen * Math.cos(rad),
    cy: geo.by + geo.segLen * Math.sin(rad)
  }
}

function arcPath(bx: number, by: number, seg: Geometry, progress: number): string {
  const r = 32
  const startRad = deg2rad(seg.startDeg)
  const endRad = deg2rad(seg.startDeg + seg.flexDir * seg.maxFlexDeg * progress)

  const x1 = bx + r * Math.cos(startRad)
  const y1 = by + r * Math.sin(startRad)
  const x2 = bx + r * Math.cos(endRad)
  const y2 = by + r * Math.sin(endRad)

  const angle = seg.maxFlexDeg * progress
  const largeArc = angle > 180 ? 1 : 0
  const sweep = seg.flexDir > 0 ? 1 : 0

  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

function BodyHint({ hint, bx, by }: { hint?: string; bx: number; by: number }) {
  if (hint === 'torso') {
    return (
      <g opacity="0.15">
        <rect x="82" y="38" width="36" height="80" rx="8" fill="#1e3a8a" />
      </g>
    )
  }
  if (hint === 'finger_base') {
    return (
      <g opacity="0.18">
        <rect x="bx" y="5" width="16" height="40" rx="6" fill="#1e3a8a"
          transform={`translate(${bx - 108}, 0)`} />
        {/* palm */}
        <rect x="62" y="148" width="76" height="55" rx="10" fill="#1e3a8a" />
      </g>
    )
  }
  return null
}

function AngleArc({ geo, progress }: { geo: Geometry; progress: number }) {
  if (progress < 0.05) return null
  const d = arcPath(geo.bx, geo.by, geo, progress)
  const currentDeg = Math.round(geo.maxFlexDeg * progress)
  const midRad = deg2rad(geo.startDeg + geo.flexDir * geo.maxFlexDeg * progress * 0.5)
  const labelR = 50
  const lx = geo.bx + labelR * Math.cos(midRad)
  const ly = geo.by + labelR * Math.sin(midRad)
  return (
    <g>
      <path d={d} stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <text x={lx} y={ly} fill="#f59e0b" fontSize="13" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
        {currentDeg}°
      </text>
    </g>
  )
}

export default function ExerciseGuide({ exercise, onStart, loading }: Props) {
  const rafRef = useRef<number>(0)
  const tRef = useRef(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const animate = () => {
      tRef.current += 0.018
      // Oscillate 0→1→0 with easing
      const raw = (Math.sin(tRef.current - Math.PI / 2) + 1) / 2
      setProgress(raw)
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const geo = GEOMETRIES[exercise.id] ?? GEOMETRIES['elbow_flex_right']
  const { cx: cx0, cy: cy0 } = computeC(geo, 0)    // extended (ghost)
  const { cx, cy } = computeC(geo, progress)         // animated

  const jointStyle = {
    A: { r: 9, fill: '#3b82f6', label: geo.labelA },
    B: { r: 12, fill: '#f59e0b', label: geo.labelB },
    C: { r: 9, fill: '#3b82f6', label: geo.labelC }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white">
      {/* Header */}
      <div className="gradient-blue px-5 pt-10 pb-5 text-white">
        <p className="text-xs text-white/60 font-medium mb-1">Tutorial Latihan</p>
        <h2 className="text-xl font-black">{exercise.name}</h2>
        <p className="text-sm text-white/70 mt-1">
          ROM Normal: {exercise.normalRange[0]}° – {exercise.normalRange[1]}°
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Animated SVG diagram */}
        <div className="card flex flex-col items-center py-2">
          <p className="text-xs font-semibold text-slate-500 mb-2">Animasi Gerakan</p>
          <svg viewBox="0 0 200 220" className="w-full max-w-[220px]">
            <BodyHint hint={geo.bodyHint} bx={geo.bx} by={geo.by} />

            {/* Ghost: extended position */}
            <line x1={geo.ax} y1={geo.ay} x2={geo.bx} y2={geo.by}
              stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />
            <line x1={geo.bx} y1={geo.by} x2={cx0} y2={cy0}
              stroke="#dbeafe" strokeWidth="6" strokeLinecap="round" strokeDasharray="6 4" />

            {/* Animated: current angle position */}
            <line x1={geo.ax} y1={geo.ay} x2={geo.bx} y2={geo.by}
              stroke="#1d4ed8" strokeWidth="8" strokeLinecap="round" />
            <line x1={geo.bx} y1={geo.by} x2={cx} y2={cy}
              stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" />

            {/* Angle arc */}
            <AngleArc geo={geo} progress={progress} />

            {/* Joint A */}
            <circle cx={geo.ax} cy={geo.ay} r={jointStyle.A.r} fill={jointStyle.A.fill} />
            <text x={geo.ax} y={geo.ay - 15} fill="#1e40af" fontSize="10" textAnchor="middle" fontWeight="600">
              A · {jointStyle.A.label}
            </text>

            {/* Joint B (vertex — orange) */}
            <circle cx={geo.bx} cy={geo.by} r={jointStyle.B.r} fill={jointStyle.B.fill} />
            <circle cx={geo.bx} cy={geo.by} r={jointStyle.B.r + 4} fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.4" />
            <text x={geo.bx + 18} y={geo.by + 4} fill="#b45309" fontSize="10" fontWeight="700">
              B · {jointStyle.B.label}
            </text>

            {/* Joint C (animated) */}
            <circle cx={cx} cy={cy} r={jointStyle.C.r} fill={jointStyle.C.fill} />
            <text x={cx} y={cy + 17} fill="#1e40af" fontSize="10" textAnchor="middle" fontWeight="600">
              C · {jointStyle.C.label}
            </text>
          </svg>

          {/* Legend */}
          <div className="flex gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-primary-600" />
              <span className="text-xs text-slate-500">Sendi aktif</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-xs text-slate-500">Titik ukur (B)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1 bg-blue-200 rounded" />
              <span className="text-xs text-slate-500">Posisi awal</span>
            </div>
          </div>
        </div>

        {/* Cara mengukur */}
        <div className="card">
          <p className="text-sm font-bold text-slate-700 mb-2">📐 Cara Pengukuran</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sudut diukur di titik <span className="font-bold text-amber-600">B ({geo.labelB})</span> antara
            segmen <span className="font-semibold text-primary-700">A→B</span> dan
            segmen <span className="font-semibold text-primary-700">B→C</span>
            menggunakan rumus <em>dot product vector</em>.
          </p>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            θ = arccos( BA·BC ÷ |BA|×|BC| )
          </p>
        </div>

        {/* Instruksi gerakan */}
        <div className="card">
          <p className="text-sm font-bold text-slate-700 mb-2">🏃 Instruksi Latihan</p>
          <p className="text-xs text-slate-600 leading-relaxed">{exercise.instruction}</p>
          <div className="mt-3 bg-blue-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-blue-700 mb-1">💡 Tips Gerakan</p>
            <p className="text-xs text-blue-600 leading-relaxed">
              Lakukan gerakan secara <strong>perlahan dan terkontrol</strong>.
              Tahan di posisi maksimal 1–2 detik sebelum kembali.
              Hentikan jika terasa nyeri tajam.
            </p>
          </div>
        </div>

        {/* Posisi kamera */}
        <div className="card border-amber-100 bg-amber-50/30">
          <p className="text-sm font-bold text-amber-700 mb-2">📷 Posisi Kamera</p>
          <div className="space-y-1.5">
            <p className="text-xs text-amber-700 leading-relaxed">{exercise.description}</p>
            <div className="flex items-start gap-2 mt-2">
              <span className="text-amber-500 text-base">•</span>
              <p className="text-xs text-amber-700">
                Pastikan titik <strong>A ({geo.labelA})</strong>,{' '}
                <strong>B ({geo.labelB})</strong>, dan{' '}
                <strong>C ({geo.labelC})</strong> terlihat jelas dalam frame
              </p>
            </div>
            {exercise.mode === 'body' && (
              <div className="flex items-start gap-2">
                <span className="text-amber-500 text-base">•</span>
                <p className="text-xs text-amber-700">
                  {exercise.id.includes('knee') || exercise.id.includes('ankle')
                    ? 'Gunakan kamera dari arah samping tubuh'
                    : 'Gunakan kamera dari arah depan atau sedikit menyamping'}
                </p>
              </div>
            )}
            {exercise.mode === 'hand' && (
              <div className="flex items-start gap-2">
                <span className="text-amber-500 text-base">•</span>
                <p className="text-xs text-amber-700">
                  Gunakan kamera belakang (environment), letakkan tangan ~30cm dari kamera
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action button — pb-20 clears the fixed BottomNav (~64px) */}
      <div className="px-4 pb-20 pt-3 bg-white border-t border-slate-100 flex-shrink-0">
        <button
          className="btn-primary w-full flex items-center justify-center gap-2 text-base"
          onClick={onStart}
          disabled={loading}
        >
          {loading
            ? <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Memuat model…
              </>
            : '📷 Mulai Latihan'}
        </button>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'

const STAGES = [
  { at: 0,  icon: '⚙️', text: 'Menyiapkan aplikasi…',                sub: null },
  { at: 3,  icon: '⬇️', text: 'Mengunduh program pendeteksi gerak…', sub: 'Sekitar 15 MB · hanya pertama kali saja' },
  { at: 14, icon: '📷', text: 'Menyiapkan kamera…',                  sub: 'Hampir siap' },
  { at: 22, icon: '⏳', text: 'Sebentar lagi ya…',                   sub: 'Koneksi lambat? Tetap tunggu ya' },
]

export default function ModelLoadingScreen() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const stage = [...STAGES].reverse().find(s => elapsed >= s.at) ?? STAGES[0]

  // Progress bar: cap at 95% so it never looks "done" before it actually is
  const pct = Math.min(95, (elapsed / 25) * 100)

  return (
    <div className="flex flex-col flex-1 min-h-0 items-center justify-center gap-6 bg-white p-8">
      {/* Spinner + icon */}
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#dbeafe" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="34" fill="none"
            stroke="#1d4ed8" strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl">
          {stage.icon}
        </span>
      </div>

      {/* Text */}
      <div className="text-center space-y-1">
        <p className="font-bold text-slate-700 text-base">{stage.text}</p>
        {stage.sub && (
          <p className="text-sm text-slate-400">{stage.sub}</p>
        )}
        <p className="text-xs text-slate-300 mt-2">{elapsed}s</p>
      </div>

      {/* Info box: muncul setelah 4 detik */}
      {elapsed >= 4 && (
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 max-w-xs text-center">
          <p className="text-xs text-primary-700 leading-relaxed">
            <strong>Pertama kali buka</strong>, aplikasi perlu mengunduh program pendeteksi gerak (~15 MB).
            Setelah itu, aplikasi akan <strong>langsung siap</strong> tanpa perlu unduh lagi.
          </p>
        </div>
      )}
    </div>
  )
}

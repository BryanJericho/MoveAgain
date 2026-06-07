import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'
import type { Session } from '../lib/db'
import { getExerciseById } from '../lib/exercises'

interface Props {
  sessions: Session[]
  exerciseType?: string
}

export default function ROMChart({ sessions, exerciseType }: Props) {
  const filtered = exerciseType
    ? sessions.filter(s => s.exerciseType === exerciseType)
    : sessions

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        Belum ada data
      </div>
    )
  }

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  const exercise = exerciseType ? getExerciseById(exerciseType) : null
  const normalMax = exercise?.normalRange[1]

  const data = sorted.map(s => ({
    date: `${new Date(s.startTime).getDate()}/${new Date(s.startTime).getMonth() + 1}`,
    maks: Math.round(s.maxRom),
    avg: Math.round(s.avgRom),
  }))

  return (
    <ResponsiveContainer width="100%" height={190}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="romAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          domain={[0, normalMax ? normalMax + 10 : 'auto']}
        />
        <Tooltip
          contentStyle={{ background: '#1e3a8a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }}
          formatter={(v: number, name: string) => [
            `${v}°`,
            name === 'maks' ? 'ROM Maks' : 'ROM Rata-rata'
          ]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11 }}
          formatter={(v) => v === 'maks' ? 'ROM Maks' : 'ROM Rata-rata'}
        />
        {normalMax && (
          <ReferenceLine
            y={normalMax}
            stroke="#22c55e"
            strokeDasharray="4 4"
            label={{ value: 'Normal', position: 'right', fontSize: 9, fill: '#22c55e' }}
          />
        )}
        <Area
          type="monotone"
          dataKey="maks"
          stroke="#3b82f6"
          strokeWidth={2.5}
          fill="url(#romAreaGrad)"
          dot={{ r: 3, fill: '#3b82f6' }}
          activeDot={{ r: 5 }}
          name="maks"
        />
        <Line
          type="monotone"
          dataKey="avg"
          stroke="#93c5fd"
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="3 3"
          name="avg"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

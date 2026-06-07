import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import type { Session } from '../lib/db'

interface Props {
  sessions: Session[]
  exerciseType?: string
}

export default function RepsChart({ sessions, exerciseType }: Props) {
  const filtered = [...(exerciseType
    ? sessions.filter(s => s.exerciseType === exerciseType)
    : sessions
  )].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        Belum ada data
      </div>
    )
  }

  const data = filtered.map(s => ({
    date: `${new Date(s.startTime).getDate()}/${new Date(s.startTime).getMonth() + 1}`,
    reps: s.repCount,
  }))

  const maxReps = Math.max(...data.map(d => d.reps), 1)

  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
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
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ background: '#1e3a8a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }}
          formatter={(v: number) => [`${v} rep`, 'Repetisi']}
        />
        <Bar dataKey="reps" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.reps === maxReps ? '#3b82f6' : '#bfdbfe'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

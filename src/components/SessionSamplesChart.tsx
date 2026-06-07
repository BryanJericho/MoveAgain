import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'

interface Props {
  samples: number[]
  normalMax?: number
  height?: number
}

export default function SessionSamplesChart({ samples, normalMax, height = 140 }: Props) {
  if (samples.length < 2) return null

  const tickInterval = Math.max(1, Math.floor(samples.length / 8))
  const data = samples.map((rom, i) => ({
    t: `${Math.round(i * 0.5)}s`,
    rom: Math.round(rom)
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="t"
          tick={{ fontSize: 9, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          interval={tickInterval}
        />
        <YAxis
          tick={{ fontSize: 9, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          domain={[0, normalMax ? normalMax + 15 : 'auto']}
        />
        <Tooltip
          contentStyle={{ background: '#1e3a8a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11 }}
          formatter={(v: number) => [`${v}°`, 'ROM']}
        />
        {normalMax && (
          <ReferenceLine
            y={normalMax}
            stroke="#22c55e"
            strokeDasharray="4 4"
            label={{ value: `Normal ${normalMax}°`, position: 'insideTopRight', fontSize: 9, fill: '#22c55e' }}
          />
        )}
        <Line
          type="monotone"
          dataKey="rom"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

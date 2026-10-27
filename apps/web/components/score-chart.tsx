/** Small SVG line chart for score history; oldest point on the left. */
export function ScoreChart({
  points,
  max = 10,
  height = 120
}: {
  points: { date: string; value: number }[]
  max?: number
  height?: number
}) {
  if (points.length < 2)
    return (
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-white/40" style={{ height }}>
        Your trend appears after your second scan.
      </div>
    )
  const width = 320,
    pad = 10
  const values = points.map((p) => p.value)
  const lo = Math.max(0, Math.floor(Math.min(...values) - 1)),
    hi = Math.min(max, Math.ceil(Math.max(...values) + 1))
  const x = (i: number) => pad + (i * (width - pad * 2)) / (points.length - 1)
  const y = (v: number) => height - pad - ((v - lo) / Math.max(1, hi - lo)) * (height - pad * 2)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1)},${height} L${x(0)},${height} Z`
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Score history">
      <defs>
        <linearGradient id="score-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d946ef" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="score-line" x1="0" x2="1">
          <stop offset="0%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#score-area)" />
      <path d={line} fill="none" stroke="url(#score-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={p.date + i} cx={x(i)} cy={y(p.value)} r="4" fill="#0d0b14" stroke="#e879f9" strokeWidth="2">
          <title>{`${new Date(p.date).toLocaleDateString('en-US')}: ${p.value.toFixed(1)}`}</title>
        </circle>
      ))}
    </svg>
  )
}

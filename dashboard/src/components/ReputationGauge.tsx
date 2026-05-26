interface ReputationGaugeProps {
  score: number
  size?: number
}

export default function ReputationGauge({
  score,
  size = 56,
}: ReputationGaugeProps) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(100, score))
  const strokeDashoffset = circumference * (1 - progress / 100)

  const color =
    progress >= 80
      ? '#00B37E'
      : progress >= 60
        ? '#2563EB'
        : progress >= 40
          ? '#F59E0B'
          : '#EF4444'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E4E4E7"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span
        className="absolute text-xs font-mono font-bold"
        style={{ color, fontSize: size < 50 ? '10px' : '12px' }}
      >
        {Math.round(progress)}
      </span>
    </div>
  )
}

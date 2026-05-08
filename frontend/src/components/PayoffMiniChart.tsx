interface Props {
  points: Array<[number, number]>
  width?: number
  height?: number
}

export default function PayoffMiniChart({ points, width = 120, height = 50 }: Props) {
  if (points.length < 2) return null

  const zeroLine = 35 // y-coordinate representing zero profit

  // Create segments for coloring (green above zero, red below)
  const segments: Array<{ points: string; color: string }> = []
  
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[i + 1]
    
    // Determine color based on position relative to zero line
    const avgY = (y1 + y2) / 2
    const color = avgY < zeroLine ? '#00d4aa' : '#ff4d6a'
    
    segments.push({
      points: `${x1},${y1} ${x2},${y2}`,
      color,
    })
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        background: '#181d24',
        borderRadius: 4,
      }}
    >
      {/* Draw all segments with appropriate colors */}
      {segments.map((segment, i) => (
        <polyline
          key={i}
          points={segment.points}
          fill="none"
          stroke={segment.color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

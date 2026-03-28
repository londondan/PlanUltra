'use client'

import { useState } from 'react'

interface Day {
  date: string   // YYYY-MM-DD
  count: number
}

interface Props {
  days: Day[]
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function RaceActivityChart({ days }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const maxCount = Math.max(...days.map((d) => d.count), 1)
  const chartH = 100  // px — usable bar area
  const labelH = 20   // px — day labels below bars
  const svgH = chartH + labelH
  const svgW = 280
  const barCount = days.length
  const barW = Math.floor((svgW - 16) / barCount) - 4
  const gap = Math.floor((svgW - 16) / barCount)

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ width: '100%', maxWidth: svgW, display: 'block', overflow: 'visible' }}
      aria-label="Race creation activity — last 7 days"
    >
      {days.map((day, i) => {
        const barH = Math.max(day.count === 0 ? 2 : Math.round((day.count / maxCount) * chartH), 2)
        const x = 8 + i * gap
        const y = chartH - barH
        const dayOfWeek = DAY_ABBR[new Date(day.date + 'T12:00:00Z').getUTCDay()]
        const isHovered = hoveredIndex === i

        return (
          <g key={day.date}>
            {/* Hover tooltip */}
            {isHovered && day.count > 0 && (
              <text
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize={10}
                fontFamily="var(--font-geist-sans, system-ui)"
                fill="#114574"
                fontWeight={600}
              >
                {day.count} {day.count === 1 ? 'race' : 'races'}
              </text>
            )}

            {/* Bar */}
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={2}
              fill={day.count === 0 ? '#DBF1FA' : isHovered ? '#114574' : '#1D7CBE'}
              style={{ cursor: day.count > 0 ? 'default' : 'default', transition: 'fill 0.1s' }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />

            {/* Day label */}
            <text
              x={x + barW / 2}
              y={chartH + 14}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-geist-mono, monospace)"
              fill={isHovered ? '#114574' : 'rgba(17,69,116,0.5)'}
            >
              {dayOfWeek}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

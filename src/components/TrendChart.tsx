import { useId, useState } from 'react'

export type ChartSeries = {
  label: string
  color: string
  values: number[]
  dashed?: boolean
  area?: boolean
  unit?: string
}

type TrendChartProps = {
  series: ChartSeries[]
  min: number
  max: number
  unit?: string
  xLabels?: string[]
  threshold?: {
    value: number
    label: string
    color?: string
  }
  defaultIndex?: number
  showTooltip?: boolean
  showYAxis?: boolean
}

const WIDTH = 600
const HEIGHT = 184
const PAD = { left: 42, right: 14, top: 14, bottom: 28 }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** 纯 SVG 趋势图，避免额外引入图表库，适合大屏轻量展示。 */
export default function TrendChart({
  series,
  min,
  max,
  unit = '',
  xLabels = [],
  threshold,
  defaultIndex,
  showTooltip = true,
  showYAxis = true,
}: TrendChartProps) {
  const gradientId = useId().replace(/:/g, '')
  const pointCount = Math.max(...series.map((item) => item.values.length), 2)
  const initialIndex = defaultIndex ?? pointCount - 1
  const [hoverIndex, setHoverIndex] = useState(initialIndex)
  const plotWidth = WIDTH - PAD.left - PAD.right
  const plotHeight = HEIGHT - PAD.top - PAD.bottom

  const xAt = (index: number) => PAD.left + (index / (pointCount - 1)) * plotWidth
  const yAt = (value: number) => PAD.top + (1 - (clamp(value, min, max) - min) / (max - min)) * plotHeight

  const linePath = (values: number[]) =>
    values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${xAt(index).toFixed(2)} ${yAt(value).toFixed(2)}`).join(' ')

  const areaPath = (values: number[]) => {
    if (!values.length) return ''
    const bottom = PAD.top + plotHeight
    return `${linePath(values)} L ${xAt(values.length - 1).toFixed(2)} ${bottom} L ${xAt(0).toFixed(2)} ${bottom} Z`
  }

  const ticks = Array.from({ length: 5 }, (_, index) => min + ((max - min) * index) / 4)
  const activeX = xAt(hoverIndex)
  const tooltipWidth = 126
  const tooltipHeight = 22 + series.length * 17
  const tooltipX = clamp(activeX + 10, PAD.left, WIDTH - PAD.right - tooltipWidth)
  const tooltipY = PAD.top + 5

  return (
    <svg
      className="trend-chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="模拟监测趋势图"
    >
      <defs>
        <linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={series[0]?.color ?? '#49ddff'} stopOpacity="0.26" />
          <stop offset="100%" stopColor={series[0]?.color ?? '#49ddff'} stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((tick) => {
        const y = yAt(tick)
        return (
          <g key={tick}>
            <line className="chart-grid-line" x1={PAD.left} y1={y} x2={WIDTH - PAD.right} y2={y} />
            {showYAxis && (
              <text className="chart-axis-label" x={PAD.left - 8} y={y + 3} textAnchor="end">
                {tick.toFixed(tick % 1 === 0 ? 0 : 1)}
              </text>
            )}
          </g>
        )
      })}

      {threshold && (
        <g>
          <line
            className="chart-threshold-line"
            x1={PAD.left}
            y1={yAt(threshold.value)}
            x2={WIDTH - PAD.right}
            y2={yAt(threshold.value)}
            stroke={threshold.color ?? '#ff727f'}
          />
          <text
            className="chart-threshold-label"
            x={WIDTH - PAD.right - 3}
            y={yAt(threshold.value) - 5}
            textAnchor="end"
            fill={threshold.color ?? '#ff8b96'}
          >
            {threshold.label}
          </text>
        </g>
      )}

      {series.map((item) =>
        item.area ? (
          <path key={`${item.label}-area`} d={areaPath(item.values)} fill={`url(#${gradientId}-area)`} />
        ) : null,
      )}

      {series.map((item) => (
        <path
          key={item.label}
          className="chart-series-line"
          d={linePath(item.values)}
          stroke={item.color}
          strokeDasharray={item.dashed ? '6 5' : undefined}
        />
      ))}

      {xLabels.map((label, index) => {
        if (xLabels.length === 1) return null
        const x = PAD.left + (index / (xLabels.length - 1)) * plotWidth
        return (
          <text
            key={`${label}-${index}`}
            className="chart-x-label"
            x={x}
            y={HEIGHT - 7}
            textAnchor={index === 0 ? 'start' : index === xLabels.length - 1 ? 'end' : 'middle'}
          >
            {label}
          </text>
        )
      })}

      <line className="chart-cursor-line" x1={activeX} y1={PAD.top} x2={activeX} y2={PAD.top + plotHeight} />

      {series.map((item) => {
        const value = item.values[hoverIndex]
        if (value === undefined) return null
        return (
          <g key={`${item.label}-point`}>
            <circle cx={activeX} cy={yAt(value)} r="4.5" fill="#081727" stroke={item.color} strokeWidth="2" />
            <circle cx={activeX} cy={yAt(value)} r="1.8" fill={item.color} />
          </g>
        )
      })}

      {showTooltip && series[0]?.values[hoverIndex] !== undefined && (
        <g className="chart-tooltip">
          <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="3" />
          <text x={tooltipX + 8} y={tooltipY + 14} className="chart-tooltip-title">
            {xLabels[Math.round((hoverIndex / Math.max(pointCount - 1, 1)) * Math.max(xLabels.length - 1, 0))] ?? '实时采样'}
          </text>
          {series.map((item, index) => (
            <text key={`${item.label}-tip`} x={tooltipX + 8} y={tooltipY + 30 + index * 17} className="chart-tooltip-value">
              <tspan fill={item.color}>●</tspan> {item.label} {item.values[hoverIndex]?.toFixed(1)}{item.unit ?? unit}
            </text>
          ))}
        </g>
      )}

      <rect
        className="chart-hit-area"
        x={PAD.left}
        y={PAD.top}
        width={plotWidth}
        height={plotHeight}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1)
          setHoverIndex(Math.round(ratio * (pointCount - 1)))
        }}
      />
    </svg>
  )
}



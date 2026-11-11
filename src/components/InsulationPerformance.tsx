import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'

/** 后端 InsulationPerformanceUnit2（Go 结构体无 json tag，键名为 PascalCase） */
interface InsulationPerformanceUnit {
  Year: number
  Loss: number | null
  PredictedLifespan: number | null
}

/** 仅保留热损与预测寿命都有值的点，便于绘图计算 */
type ValidPoint = InsulationPerformanceUnit & { Loss: number; PredictedLifespan: number }

/** 后端统一响应包装 */
interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

interface TooltipState {
  x: number
  y: number
  label: string
  value: number
  loss: number
}

const PADDING = 50

function isValidPoint(point: InsulationPerformanceUnit): point is ValidPoint {
  return point.Loss != null && point.PredictedLifespan != null
}

function scaleFuncs2(
  minValx: number,
  maxValx: number,
  minValy: number,
  maxValy: number,
  width: number,
  height: number,
) {
  return {
    scaleX: (val: number) =>
      PADDING + ((val - minValx) / (maxValx - minValx)) * (width - PADDING * 2),
    scaleY: (val: number) =>
      height - PADDING - ((val - minValy) / (maxValy - minValy)) * (height - PADDING * 2),
    padding: PADDING,
  }
}

function renderLoading() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#6ce0ff',
        fontSize: '12px',
      }}
    >
      加载绝热性能数据...
    </div>
  )
}

function renderTooltip(tooltip: TooltipState | null, width: number) {
  if (!tooltip) return null

  const tooltipWidth = 130
  const tooltipHeight = 44
  let boxX = tooltip.x - tooltipWidth / 2
  let boxY = tooltip.y - tooltipHeight - 8

  if (boxX < 0) boxX = 0
  if (boxX + tooltipWidth > width) boxX = width - tooltipWidth
  if (boxY < 0) boxY = tooltip.y + 10

  return (
    <g style={{ animation: 'fadeIn 0.3s ease' }}>
      <rect
        x={boxX}
        y={boxY}
        width={tooltipWidth}
        height={tooltipHeight}
        fill="rgba(0,50,100,0.95)"
        stroke="#00eaff"
        strokeWidth="1.5"
        rx="6"
        style={{
          filter: 'drop-shadow(0 0 6px #00eaff)',
          animation: 'tooltipPop 0.2s ease',
        }}
      />
      <text
        x={boxX + tooltipWidth / 2}
        y={boxY + 15}
        textAnchor="middle"
        fill="#fff"
        fontSize="10"
        fontWeight="bold"
      >
        {tooltip.label}
      </text>
      <text
        x={boxX + tooltipWidth / 2}
        y={boxY + 28}
        textAnchor="middle"
        fill="#ffd966"
        fontSize="10"
        fontWeight="bold"
      >
        剩余寿命: {tooltip.value.toFixed(2)}
      </text>
      <text
        x={boxX + tooltipWidth / 2}
        y={boxY + 40}
        textAnchor="middle"
        fill="#6ce0ff"
        fontSize="10"
        fontWeight="bold"
      >
        平均热损: {tooltip.loss.toFixed(2)}
      </text>
    </g>
  )
}

export default function InsulationPerformance() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [performanceDatas, setPerformanceDatas] = useState<InsulationPerformanceUnit[]>([])
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [loading, setLoading] = useState(true)

  const loadPerformanceData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get<ApiResponse<InsulationPerformanceUnit[]>>(
        '/api/v1/insulation-performance-data',
      )
      if (res.data && res.data.code === 200 && Array.isArray(res.data.data)) {
        setPerformanceDatas(res.data.data)
      } else {
        console.error('insulation_performance_data error:', res.data?.msg)
      }
    } catch (err) {
      console.error('获取绝热性能数据失败', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /** 容器尺寸跟随：用 contentRect（内容盒，不含 padding）作为 svg 的可用区域 */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      setWidth(rect.width)
      setHeight(rect.height)
    })
    ro.observe(el)

    return () => ro.unobserve(el)
  }, [])

  useEffect(() => {
    loadPerformanceData()

    // 每 1 分钟检查一次，整点后第 2 分钟刷新
    const refreshInterval = setInterval(() => {
      if (new Date().getMinutes() === 2) {
        loadPerformanceData()
      }
    }, 60000)

    return () => clearInterval(refreshInterval)
  }, [loadPerformanceData])

  const renderChart = () => {
    const points = performanceDatas.filter(isValidPoint)
    const hasData = points.length > 0
    const minValx = hasData ? Math.min(...points.map((item) => item.Loss)) * 0.9 : 0
    const maxValx = hasData ? Math.max(...points.map((item) => item.Loss)) * 1.1 : 30
    const minValy = hasData ? Math.min(...points.map((item) => item.PredictedLifespan)) * 0.9 : 0
    const maxValy = hasData ? Math.max(...points.map((item) => item.PredictedLifespan)) * 1.1 : 30
    const { scaleX, scaleY, padding } = scaleFuncs2(
      minValx,
      maxValx,
      minValy,
      maxValy,
      width,
      height,
    )

    // 除最后一个点（热损到标准值的截距点）外，其余点连成实线
    const actualPath = hasData
      ? points
          .slice(0, points.length - 1)
          .map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(v.Loss)},${scaleY(v.PredictedLifespan)}`)
          .join(' ')
      : ''
    // 最后一段用虚线表示预测
    const predictPath = hasData
      ? points
          .slice(points.length - 2, points.length)
          .map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(v.Loss)},${scaleY(v.PredictedLifespan)}`)
          .join(' ')
      : ''

    const predictedLifespan =
      points.length >= 2 ? points[points.length - 2].PredictedLifespan : undefined

    return (
      <svg width={width} height={height} style={{ animation: 'chartFadeIn 0.8s ease', marginTop: '14px'}}>
        {/* 标题 */}
        {/* <text x={width / 2} y={25} textAnchor="middle" fill="#00eaff" fontSize="18" fontWeight="bold">
          绝热系统寿命监控及预测
        </text> */}
        <text x={width - padding} y={35} textAnchor="end" fill="#ffd966" fontSize="11">
          {hasData
            ? `预测寿命: ${predictedLifespan && predictedLifespan > 0 ? predictedLifespan.toFixed(1) : '∞'}年`
            : '暂无预测数据'}
        </text>

        {/* 坐标轴 */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#6ce0ff" />
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding - 5}
          y2={height - padding}
          stroke="#6ce0ff"
        />
        <text x={padding} y={39} textAnchor="middle" fill="#fff" fontSize="10">
          剩余年限/年
        </text>
        <text x={width - padding - 4} y={height - padding} fill="#fff" fontSize="10">
          年平均热
          <tspan x={width - padding - 4} y={height - padding + 10}>
            损失W/m²
          </tspan>
        </text>

        {/* 网格线 */}
        {Array.from({ length: 6 }).map((_, idx) => {
          const val = minValy + ((maxValy - minValy) / 5) * idx
          return (
            <line
              key={idx}
              x1={padding}
              y1={scaleY(val)}
              x2={width - padding - 5}
              y2={scaleY(val)}
              stroke="rgba(108,224,255,0.15)"
            />
          )
        })}
        <line
          key={6}
          x1={padding}
          y1={scaleY(30)}
          x2={width - padding - 5}
          y2={scaleY(30)}
          stroke="rgba(108,224,255,0.15)"
        />

        {/* 标签 */}
        {points.map((lbl, i) => (
          <text
            key={i}
            x={scaleX(lbl.Loss)}
            y={height - padding + 12}
            fill="#fff"
            fontSize="9"
            textAnchor="middle"
          >
            {lbl.Loss.toFixed(2)}
          </text>
        ))}
        {Array.from({ length: 5 }).map((_, idx) => {
          const val = minValy + ((maxValy - minValy) / 5) * idx
          return (
            <text key={idx} x={padding - 8} y={scaleY(val) + 3} fill="#fff" fontSize="9" textAnchor="end">
              {val.toFixed(1)}
            </text>
          )
        })}
        {/* 最上面的 y 坐标标签单独标 */}
        <text key={5} x={padding - 8} y={scaleY(30) + 3} fill="#fff" fontSize="9" textAnchor="end">
          30
        </text>

        {/* 动画线条 */}
        {hasData && (
          <>
            <path
              d={predictPath}
              fill="none"
              stroke="#ffd966"
              strokeWidth="2"
              style={{
                strokeDasharray: '10,5',
                strokeDashoffset: 100,
                animation: 'drawLine 1.5s ease forwards',
                animationDelay: '0.3s',
              }}
            />
            <path
              d={actualPath}
              fill="none"
              stroke="#ffd966"
              strokeWidth="2"
              style={{
                strokeDasharray: 1000,
                strokeDashoffset: 1000,
                animation: 'drawLine 1.5s ease forwards',
                animationDelay: '0.3s',
              }}
            />
          </>
        )}

        {/* 数据点淡入 */}
        {hasData &&
          points.map((v, i) => (
            <circle
              key={i}
              cx={scaleX(v.Loss)}
              cy={scaleY(v.PredictedLifespan)}
              r={3}
              fill="#ffd966"
              style={{
                filter: 'drop-shadow(0 0 5px #ffd966)',
                opacity: 0,
                animation: 'fadeInPoint 0.6s ease forwards',
                animationDelay: `${i * 0.05}s`,
              }}
              onMouseEnter={() =>
                setTooltip({
                  x: scaleX(v.Loss),
                  y: scaleY(v.PredictedLifespan),
                  label: `${v.Year}年`,
                  value: v.PredictedLifespan,
                  loss: v.Loss,
                })
              }
              onMouseLeave={() => setTooltip(null)}
            />
          ))}

        {hasData && renderTooltip(tooltip, width)}
      </svg>
    )
  }

  const animCSS = `
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes tooltipPop { from { transform:scale(0.8); opacity:0; } to { transform:scale(1); opacity:1; } }
    @keyframes borderGlow {
      0% { box-shadow: 0 0 10px rgba(0,198,255,0.4), inset 0 0 10px rgba(0,198,255,0.2); }
      50% { box-shadow: 0 0 20px rgba(0,198,255,0.8), inset 0 0 20px rgba(0,198,255,0.4); }
      100% { box-shadow: 0 0 10px rgba(0,198,255,0.4), inset 0 0 10px rgba(0,198,255,0.2); }
    }
    @keyframes chartFadeIn { from { opacity: 0; transform: translateY(8px);} to { opacity: 1; transform: translateY(0);} }
    @keyframes drawLine { to { stroke-dashoffset: 0; } }
    @keyframes fadeInPoint { to { opacity: 1; } }
  `

  return (
    <>
      <style>{animCSS}</style>
      {/* 卡片撑满父容器：用内联样式覆盖 .panel 的绝对定位与固定宽度，
          这样 ResizeObserver 量到的就是分配好的实际尺寸 */}
      <aside
        className="panel panel--right panel--steam"
        style={{
          position: 'relative',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          maxHeight: '100%',
          overflow: 'hidden',
        }}
      >
        <div className="panel-head">
          <span className="panel-accent" />
          <h2>绝热系统寿命监控及预测</h2>
        </div>
        {/* 绘图区独占剩余高度，ref 只挂在这层，量到的尺寸就是 svg 的精确可用区域 */}
        <div ref={containerRef} style={{ flex: 1, minHeight: 0 }}>
          {loading ? renderLoading() : renderChart()}
        </div>
      </aside>
    </>
  )
}

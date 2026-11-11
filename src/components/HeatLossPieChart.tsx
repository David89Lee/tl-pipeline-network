import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'

/** 后端 HeatLossData 结构（Go 结构体无 json tag，键名为 PascalCase） */
interface HeatLossData {
  PipeSection: string
  HeatLoss: number | null
  Standard: number
  TotalHeat: number
}

/** 后端统一响应包装 */
interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

type SliceKey = 'drain' | 'steam' | 'pipe'

/** 三类损失占总热损的比例（原组件写死） */
const PIPE_RATIO = 0.768
const DRAIN_RATIO = 0.108
const STEAM_RATIO = 0.124

const PIPE_PERCENT = (PIPE_RATIO * 100).toFixed(1)
const DRAIN_PERCENT = (DRAIN_RATIO * 100).toFixed(1)
const STEAM_PERCENT = (STEAM_RATIO * 100).toFixed(1)

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  if (Math.abs(endAngle - startAngle) < 0.1) return ''
  const start = polarToCartesian(x, y, radius, endAngle)
  const end = polarToCartesian(x, y, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y, 'L', x, y, 'Z'].join(
    ' ',
  )
}

export default function HeatLossPieChart() {
  const [pipeHeatLossTotal, setPipeHeatLossTotal] = useState(0)
  const [drainHeatLossTotal, setDrainHeatLossTotal] = useState(0)
  const [steamHeatLossTotal, setSteamHeatLossTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [currentPipeAngle, setCurrentPipeAngle] = useState(0)
  const [currentDrainAngle, setCurrentDrainAngle] = useState(0)
  const [currentSteamAngle, setCurrentSteamAngle] = useState(0)
  const [hoverSlice, setHoverSlice] = useState<SliceKey | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)

  /** 三段扇形依次展开：疏水 → 蒸汽 → 管道 */
  const animatePie = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
    }

    const drainAngle = 360 * DRAIN_RATIO
    const steamAngle = 360 * STEAM_RATIO
    const pipeAngle = 360 * PIPE_RATIO

    const drainDuration = 500
    const steamDuration = 600
    const pipeDuration = 1900

    setCurrentDrainAngle(0)
    setCurrentSteamAngle(0)
    setCurrentPipeAngle(0)

    let startDrain: number | null = null
    const stepDrain = (timestamp: number) => {
      if (startDrain === null) startDrain = timestamp
      const progress = Math.min((timestamp - startDrain) / drainDuration, 1)
      setCurrentDrainAngle(drainAngle * easeOutCubic(progress))

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(stepDrain)
        return
      }

      let startSteam: number | null = null
      const stepSteam = (ts: number) => {
        if (startSteam === null) startSteam = ts
        const prog = Math.min((ts - startSteam) / steamDuration, 1)
        setCurrentSteamAngle(steamAngle * easeOutCubic(prog))

        if (prog < 1) {
          animationRef.current = requestAnimationFrame(stepSteam)
          return
        }

        let startPipe: number | null = null
        const stepPipe = (t: number) => {
          if (startPipe === null) startPipe = t
          const pr = Math.min((t - startPipe) / pipeDuration, 1)
          setCurrentPipeAngle(pipeAngle * easeOutCubic(pr))

          if (pr < 1) {
            animationRef.current = requestAnimationFrame(stepPipe)
          }
        }
        animationRef.current = requestAnimationFrame(stepPipe)
      }
      animationRef.current = requestAnimationFrame(stepSteam)
    }
    animationRef.current = requestAnimationFrame(stepDrain)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get<ApiResponse<HeatLossData[]>>('/api/v1/heat-loss-data')
      if (res.data && res.data.code === 200 && Array.isArray(res.data.data) && res.data.data.length > 0) {
        // 管道热损按天折算：TotalHeat 为 W，乘 3600*24/1000 得到 KJ/天
        const pipeTotal = (res.data.data[0].TotalHeat * 3600 * 24) / 1000
        const total = pipeTotal / PIPE_RATIO

        setPipeHeatLossTotal(pipeTotal)
        setDrainHeatLossTotal(DRAIN_RATIO * total)
        setSteamHeatLossTotal(STEAM_RATIO * total)
        setLoading(false)
        animatePie()
      } else {
        setPipeHeatLossTotal(0)
        setDrainHeatLossTotal(0)
        setSteamHeatLossTotal(0)
        setLoading(false)
      }
    } catch (err) {
      console.error('获取管网热量损失数据失败', err)
      setPipeHeatLossTotal(0)
      setDrainHeatLossTotal(0)
      setSteamHeatLossTotal(0)
      setLoading(false)
    }
  }, [animatePie])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // contentRect 是内容盒尺寸（不含 padding），与 svg 实际可用区域一致
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      setWidth(rect.width)
      setHeight(rect.height)
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const renderPieChart = () => {
    const radius = Math.min(width, height) / 3.4
    const cx = width / 2 + 20
    const cy = height / 2 + 20
    const hoverScale = 1.05

    return (
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* 疏水部分 */}
        {currentDrainAngle > 0 && (
          <path
            d={describeArc(
              cx,
              cy,
              hoverSlice === 'drain' ? radius * hoverScale : radius,
              0,
              currentDrainAngle,
            )}
            fill="#006400"
            stroke="#fff"
            strokeWidth="1"
            style={{ filter: 'drop-shadow(0 0 4px #006400)', transition: 'all 0.3s ease' }}
            onMouseEnter={() => setHoverSlice('drain')}
            onMouseLeave={() => setHoverSlice(null)}
          />
        )}
        {/* 蒸汽部分 */}
        {currentSteamAngle > 0 && (
          <path
            d={describeArc(
              cx,
              cy,
              hoverSlice === 'steam' ? radius * hoverScale : radius,
              currentDrainAngle,
              currentDrainAngle + currentSteamAngle,
            )}
            fill="#8b0000"
            stroke="#fff"
            strokeWidth="1"
            style={{ filter: 'drop-shadow(0 0 4px #8b0000)', transition: 'all 0.3s ease' }}
            onMouseEnter={() => setHoverSlice('steam')}
            onMouseLeave={() => setHoverSlice(null)}
          />
        )}
        {/* 管道部分 */}
        {currentPipeAngle > 0 && (
          <path
            d={describeArc(
              cx,
              cy,
              hoverSlice === 'pipe' ? radius * hoverScale : radius,
              currentDrainAngle + currentSteamAngle,
              360,
            )}
            fill="#483d8b"
            stroke="#fff"
            strokeWidth="1"
            style={{ filter: 'drop-shadow(0 0 4px #483d8b)', transition: 'all 0.3s ease' }}
            onMouseEnter={() => setHoverSlice('pipe')}
            onMouseLeave={() => setHoverSlice(null)}
          />
        )}

        {/* 图例 */}
        <rect x={0} y={20} width={12} height={12} fill="#483d8b" />
        <text x={20} y={30} fill="#fff" fontSize="10">
          管道散热损失(KJ/天)
        </text>
        <rect x={0} y={40} width={12} height={12} fill="#006400" />
        <text x={20} y={50} fill="#fff" fontSize="10">
          疏水质量损失热量(KJ/天)
        </text>
        <rect x={0} y={60} width={12} height={12} fill="#8b0000" />
        <text x={20} y={70} fill="#fff" fontSize="10">
          蒸汽质量损失热量(KJ/天)
        </text>

        <text x="62%" y="34%" fill="#fff" fontSize="0.7rem" fontWeight="bold" textAnchor="middle">
          {drainHeatLossTotal.toFixed(1)}
        </text>
        <text x="62%" y="39%" fill="#fff" fontSize="0.7rem" fontWeight="bold" textAnchor="middle">
          {DRAIN_PERCENT}%
        </text>
        <text x="70%" y="44%" fill="#fff" fontSize="0.7rem" fontWeight="bold" textAnchor="middle">
          {steamHeatLossTotal.toFixed(1)}
        </text>
        <text x="70%" y="49%" fill="#fff" fontSize="0.7rem" fontWeight="bold" textAnchor="middle">
          {STEAM_PERCENT}%
        </text>
        <text x="56%" y="67%" fill="#fff" fontSize="0.7rem" fontWeight="bold" textAnchor="middle">
          {pipeHeatLossTotal.toFixed(1)}
        </text>
        <text x="56%" y="72%" fill="#fff" fontSize="0.7rem" fontWeight="bold" textAnchor="middle">
          {PIPE_PERCENT}%
        </text>
      </svg>
    )
  }

  return (
    <aside
      className="panel panel--right panel--steam"
      style={{
        position: 'relative',
        left: 0,
        top: 0,
        right: 'auto',
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        overflow: 'hidden',
      }}
    >
      <div className="panel-head">
        <span className="panel-accent" />
        <h2>管网热量损失饼状图</h2>
      </div>
        {/* <div
            style={{
                width: '100%',
                height: '100%',
                background: '#001127',
                borderRadius: '8px',
                border: '2px solid rgba(0,198,255,0.6)',
                boxShadow: '0 0 10px rgba(0,198,255,0.4), inset 0 0 10px rgba(0,198,255,0.2)',
                animation: 'borderGlow 3s infinite',
                overflow: 'hidden',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
            }}
        > */}
        {/* <div
            style={{
            color: '#00eaff',
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '10px',
            textAlign: 'center',
            flexShrink: 0,
            }}
        >
            管网热量损失饼状图
        </div> */}
        {/* 绘图区独占剩余高度，ref 只挂在这层，量到的尺寸就是 svg 的精确可用区域 */}
        <div ref={containerRef} style={{ flex: 1, minHeight: 0 }}>
            {loading ? (
            <div style={{ color: '#6ce0ff', textAlign: 'center', marginTop: '40px' }}>
                加载饼状图数据...
            </div>
                ) : (
                renderPieChart()
                )}
        </div>
        {/* </div> */}
    </aside>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { DatePicker, Modal, Col, Row, Button, message } from 'antd'
const { RangePicker } = DatePicker

/** 后端统一响应包装 */
interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

/** 后端 InsulationMonitorData（Go 结构体无 json tag，键名为 PascalCase；指针切片可能为 null） */
interface InsulationMonitorData {
  MonitorPoints1?: string[] | null
  MonitorPoints2?: string[] | null
  MonitorPoints3?: string[] | null
  Temperatures1?: (number | null)[] | null
  Temperatures2?: (number | null)[] | null
  Temperatures3?: (number | null)[] | null
  Anomalies1?: boolean[] | null
  Anomalies2?: boolean[] | null
  Anomalies3?: boolean[] | null
  HeatLosses1?: (number | null)[] | null
  HeatLosses2?: (number | null)[] | null
  HeatLosses3?: (number | null)[] | null
  DeviceExceptions1?: boolean[] | null
  DeviceExceptions2?: boolean[] | null
  DeviceExceptions3?: boolean[] | null
  AbnormalTemperature?: number | null
  EnvTemperature?: number | null
  WindSpeed?: number | null
}

/** 后端 ThreePointsDataList */
interface ThreePointsDataList {
  Times?: string[] | null
  WindSpeed?: (number | null)[] | null
  EnvTemperature?: (number | null)[] | null
  AbnormalTemperature?: (number | null)[] | null
  C1?: (number | null)[] | null
  C2?: (number | null)[] | null
  C3?: (number | null)[] | null
}

/** 导出接口返回的 Excel 内容（后端 response.ExcelFile） */
interface ExcelPayload {
  filename: string
  content_type: string
  body: string
}

interface TooltipState {
  x: number
  y: number
  point: string
  temp: number
  loss: string
}

interface Tooltip2State {
  x: number
  y: number
  date: string
  temp: number
  envTemperature: number
  windSpeed: number
}

interface Padding {
  top: number
  right: number
  bottom: number
  left: number
}

type RangeDates = [Dayjs | null, Dayjs | null]

/** Go 的 []*float32 / []*float64 可能含 null，统一映射为 0，避免参与运算或 toFixed 时崩溃 */
function toNumberArray(arr?: (number | null)[] | null): number[] {
  return (arr ?? []).map((v) => (v == null ? 0 : v))
}

function scaleFuncs(
  minVal: number,
  maxVal: number,
  datas: unknown[],
  width: number,
  height: number,
  padding: Padding,
) {
  const p = 56 // padding
  const xStep = datas.length > 1 ? (width - (padding.left + padding.right)) / (datas.length - 1) : 0
  return {
    scaleXTag: (i: number) => padding.left + i * xStep * 0.95,
    scaleYTag: (val: number) =>
      height -
      padding.bottom -
      6 -
      ((val - minVal) / (maxVal - minVal)) * (height - (padding.bottom + padding.top)),
    p, // 暂时没发现有用
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
      加载绝热异常数据...
    </div>
  )
}

export default function InsulationAnomaly() {
  const containerRef = useRef<HTMLDivElement>(null)
  const disposedRef = useRef(false)

  const [monitorPoints1, setMonitorPoints1] = useState<string[]>([])
  const [monitorPoints2, setMonitorPoints2] = useState<string[]>([])
  const [monitorPoints3, setMonitorPoints3] = useState<string[]>([])
  const [temperatures1, setTemperatures1] = useState<number[]>([])
  const [temperatures2, setTemperatures2] = useState<number[]>([])
  const [temperatures3, setTemperatures3] = useState<number[]>([])
  const [heatLosses1, setHeatLosses1] = useState<number[]>([])
  const [heatLosses2, setHeatLosses2] = useState<number[]>([])
  const [heatLosses3, setHeatLosses3] = useState<number[]>([])
  const [anomalies1, setAnomalies1] = useState<boolean[]>([])
  const [anomalies2, setAnomalies2] = useState<boolean[]>([])
  const [anomalies3, setAnomalies3] = useState<boolean[]>([])
  const [deviceExceptions1, setDeviceExceptions1] = useState<boolean[]>([])
  const [deviceExceptions2, setDeviceExceptions2] = useState<boolean[]>([])
  const [deviceExceptions3, setDeviceExceptions3] = useState<boolean[]>([])
  const [abnormalTemperature, setAbnormalTemperature] = useState(0)
  const [envTemperature, setEnvTemperature] = useState(0)
  const [windSpeed, setWindSpeed] = useState(0)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [width2] = useState(900)
  const [height2] = useState(300)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [tooltip2, setTooltip2] = useState<Tooltip2State | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null)
  const [pointsHistoryModalVisible, setPointsHistoryModalVisible] = useState(false)
  const [pointsDates, setPointsDates] = useState<RangeDates | null>(null)
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null)
  const [pointsDatesStr, setPointsDatesStr] = useState<string[]>([])
  const [pointsDatesXAxis, setPointsDatesXAxis] = useState<(string | null)[]>([
    '2026.8.4 3时',
    '2026.8.4 4时',
    '2026.8.4 5时',
  ])
  const [windSpeeds, setWindSpeeds] = useState<number[]>([])
  const [envTemperatures, setEnvTemperatures] = useState<number[]>([])
  const [abTemperatures, setAbTemperatures] = useState<number[]>([])
  const [t1, setT1] = useState<number[]>([31, 32, 33])
  const [t2, setT2] = useState<number[]>([30, 31, 32])
  const [t3, setT3] = useState<number[]>([29, 30, 30])
  const [datePickerDates, setDatePickerDates] = useState<RangeDates>([
    dayjs().startOf('day'),
    dayjs(),
  ])

  /** 组件卸载后不再回调 setState */
  useEffect(() => {
    disposedRef.current = false
    return () => {
      disposedRef.current = true
    }
  }, [])

  /** 容器尺寸跟随：用 contentRect（内容盒）作为 svg 的可用区域 */
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

  const applyInsulationMonitorData = useCallback((data: InsulationMonitorData) => {
    setMonitorPoints1(data.MonitorPoints1 ?? [])
    setMonitorPoints2(data.MonitorPoints2 ?? [])
    setMonitorPoints3(data.MonitorPoints3 ?? [])
    setTemperatures1(toNumberArray(data.Temperatures1))
    setTemperatures2(toNumberArray(data.Temperatures2))
    setTemperatures3(toNumberArray(data.Temperatures3))
    setAnomalies1(data.Anomalies1 ?? [])
    setAnomalies2(data.Anomalies2 ?? [])
    setAnomalies3(data.Anomalies3 ?? [])
    setHeatLosses1(toNumberArray(data.HeatLosses1))
    setHeatLosses2(toNumberArray(data.HeatLosses2))
    setHeatLosses3(toNumberArray(data.HeatLosses3))
    setDeviceExceptions1(data.DeviceExceptions1 ?? [])
    setDeviceExceptions2(data.DeviceExceptions2 ?? [])
    setDeviceExceptions3(data.DeviceExceptions3 ?? [])
    setAbnormalTemperature(data.AbnormalTemperature ?? 0)
    setEnvTemperature(data.EnvTemperature ?? 0)
    setWindSpeed(data.WindSpeed ?? 0)
    setHasData(true)
  }, [])

  const loadAnomalyData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get<ApiResponse<InsulationMonitorData>>(
        '/api/v1/insulation-monitor-data',
      )
      if (disposedRef.current) return
      const payload = res.data
      if (payload && payload.code === 200 && payload.data) {
        applyInsulationMonitorData(payload.data)
      }
    } catch (err) {
      console.error('获取绝热异常及定位数据失败', err)
    } finally {
      if (!disposedRef.current) setLoading(false)
    }
  }, [applyInsulationMonitorData])

  useEffect(() => {
    loadAnomalyData()

    // 1分钟检查一次，分钟数 % 30 === 2 时重新拉数据
    const refreshInterval = setInterval(() => {
      if (new Date().getMinutes() % 30 === 2) {
        loadAnomalyData()
      }
    }, 60000)

    return () => clearInterval(refreshInterval)
  }, [loadAnomalyData])

  const onChange = (date: Dayjs | null, dateString: string | string[]) => {
    console.log('Selected Time: ', date)
    console.log('Formatted Selected Time: ', dateString)
    setSelectedDate(date)
    if (date && date.isSame(dayjs(), 'second')) {
      console.log('用户点击了“此刻”按钮！')
      // 在这里执行你需要的自定义动作
      loadAnomalyData()
    }
  }

  const onOk = async (selectedTime: Dayjs) => {
    setLoading(true)
    const year = selectedTime.year()
    const month = selectedTime.month() + 1
    const day = selectedTime.date()
    const hour = selectedTime.hour()
    try {
      const res = await axios.get<ApiResponse<InsulationMonitorData>>(
        `/api/v1/insulation-monitor-data/${year}/${month}/${day}/${hour}`,
        { params: { year, month, day, hour } },
      )
      if (disposedRef.current) return
      const payload = res.data
      if (payload && payload.code === 200 && payload.data) {
        console.log('insulation_monitor_data:', payload.data)
        applyInsulationMonitorData(payload.data)
      }
    } catch (err) {
      console.error('获取绝热异常及定位历史数据失败', err)
    } finally {
      if (!disposedRef.current) setLoading(false)
    }
  }

  const setThreePointsData = (threePointsData: ThreePointsDataList) => {
    const times = threePointsData.Times ?? []
    const pdx: (string | null)[] = times.slice()
    if (times.length > 12) {
      // 对 Times 抽稀
      const step = Math.ceil(times.length / 12)
      for (let i = 0; i < times.length; i++) {
        if (i % step !== 0) {
          pdx[i] = null
        }
      }
    }
    setPointsDatesStr(times)
    setPointsDatesXAxis(pdx)
    setWindSpeeds(toNumberArray(threePointsData.WindSpeed))
    setEnvTemperatures(toNumberArray(threePointsData.EnvTemperature))
    setAbTemperatures(toNumberArray(threePointsData.AbnormalTemperature))
    setT1(toNumberArray(threePointsData.C1))
    setT2(toNumberArray(threePointsData.C2))
    setT3(toNumberArray(threePointsData.C3))
  }

  const handlePointsHistoryModalCancel = () => {
    setPointsHistoryModalVisible(false)
  }

  const disabledDate = (current: Dayjs | undefined) => {
    if (!pointsDates) {
      return false
    }
    if (!current) {
      return false
    }
    const tooLate = pointsDates[0] ? current.diff(pointsDates[0], 'days') > 62 : false
    const tooEarly = pointsDates[1] ? pointsDates[1].diff(current, 'days') > 62 : false
    return !!tooEarly || !!tooLate
  }

  const handlePointClick = (i: number) => {
    setPointsHistoryModalVisible(true)
    setSelectedPointIndex(i)
    pointsOnOk([dayjs().startOf('day'), dayjs()], i)
  }

  const pointsOnOk = async (dates: RangeDates, i: number) => {
    setLoading(true)
    setDatePickerDates(dates)
    const start = dates[0]
    const end = dates[1]
    if (!start || !end) {
      setLoading(false)
      return
    }
    try {
      const res = await axios.get<ApiResponse<ThreePointsDataList>>(
        '/api/v1/three-points-data',
        {
          params: {
            i,
            year1: start.year(),
            month1: start.month() + 1,
            day1: start.date(),
            hour1: start.hour(),
            year2: end.year(),
            month2: end.month() + 1,
            day2: end.date(),
            hour2: end.hour(),
          },
        },
      )
      if (disposedRef.current) return
      const payload = res.data
      if (payload && payload.code === 200 && payload.data) {
        console.log('three_points_data:', payload.data)
        setThreePointsData(payload.data)
      }
    } catch (err) {
      console.error('获取界面上三个点历史曲线数据失败', err)
    } finally {
      if (!disposedRef.current) setLoading(false)
    }
  }

  const onOpenChange = (open: boolean) => {
    if (open) {
      setPointsDates([null, null])
    } else {
      setPointsDates(null)
    }
  }

  const downloadExcel = async () => {
    const start = datePickerDates[0]
    const end = datePickerDates[1]
    if (!start || !end) return
    const i = selectedPointIndex ?? 0
    console.log(
      'year1: ',
      start.year(),
      ' month1:',
      start.month() + 1,
      ' day1:',
      start.date(),
      ' hour1:',
      start.hour(),
    )
    console.log(
      'year2: ',
      end.year(),
      ' month2:',
      end.month() + 1,
      ' day2:',
      end.date(),
      ' hour2:',
      end.hour(),
    )
    setLoading(true)
    try {
      const res = await axios.get<ApiResponse<ExcelPayload>>(
        '/api/v1/three-points-data/export',
        {
          params: {
            i,
            year1: start.year(),
            month1: start.month() + 1,
            day1: start.date(),
            hour1: start.hour(),
            year2: end.year(),
            month2: end.month() + 1,
            day2: end.date(),
            hour2: end.hour(),
            format: 'base64',
          },
        },
      )
      if (disposedRef.current) return
      const payload = res.data?.data
      const b64 = payload?.body
      const filename = payload?.filename || '截面三点历史数据.xlsx'
      if (!b64) {
        message.error('未获取到文件数据')
        return
      }

      // base64 -> Uint8Array -> Blob
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k)
      const blob = new Blob([bytes], {
        type:
          payload.content_type ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      // 触发下载
      const navigatorWithMsSave = window.navigator as Navigator & {
        msSaveOrOpenBlob?: (blob: Blob, filename: string) => void
      }
      if (navigatorWithMsSave.msSaveOrOpenBlob) {
        navigatorWithMsSave.msSaveOrOpenBlob(blob, filename)
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(function () {
          URL.revokeObjectURL(url)
        }, 1000)
      }
      console.log('导出成功')
    } catch (err) {
      console.error('导出界面上三个点历史曲线数据失败', err)
      message.error('导出失败')
    } finally {
      if (!disposedRef.current) setLoading(false)
    }
  }

  // 改成和之前优化版一样的 Tooltip 样式
  const renderTooltip = () => {
    if (!tooltip) return null

    const tooltipWidth = 132
    const tooltipHeight = 72
    let boxX = tooltip.x - tooltipWidth / 2
    let boxY = tooltip.y - tooltipHeight - 8

    // 边界防溢出
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
          fill="#ffd966"
          fontSize="10"
          fontWeight="bold"
        >
          {tooltip.point}
        </text>
        <text
          x={boxX + tooltipWidth / 2}
          y={boxY + 28}
          textAnchor="middle"
          fill="#fff"
          fontSize="10"
        >
          温度: {tooltip.temp} °C
        </text>
        <text
          x={boxX + tooltipWidth / 2}
          y={boxY + 40}
          textAnchor="middle"
          fill="#fff"
          fontSize="10"
        >
          环境温度: {envTemperature} °C
        </text>
        <text
          x={boxX + tooltipWidth / 2}
          y={boxY + 52}
          textAnchor="middle"
          fill="#fff"
          fontSize="10"
        >
          风速: {windSpeed} m/s
        </text>
        <text
          x={boxX + tooltipWidth / 2}
          y={boxY + 64}
          textAnchor="middle"
          fill="#fff"
          fontSize="10"
        >
          热损失: {tooltip.loss}
        </text>
      </g>
    )
  }

  const renderTooltip2 = () => {
    if (!tooltip2) return null

    const tooltipWidth = 120
    const tooltipHeight = 60
    let boxX = tooltip2.x - tooltipWidth / 2
    let boxY = tooltip2.y - tooltipHeight - 8

    // 边界防溢出
    if (boxX < 0) boxX = 0
    if (boxX + tooltipWidth > width2) boxX = width2 - tooltipWidth
    if (boxY < 0) boxY = tooltip2.y + 10

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
          fill="#ffd966"
          fontSize="10"
          fontWeight="bold"
        >
          {tooltip2.date}
        </text>
        <text
          x={boxX + tooltipWidth / 2}
          y={boxY + 28}
          textAnchor="middle"
          fill="#fff"
          fontSize="10"
        >
          温度: {tooltip2.temp} °C
        </text>
        <text
          x={boxX + tooltipWidth / 2}
          y={boxY + 40}
          textAnchor="middle"
          fill="#fff"
          fontSize="10"
        >
          环境温度: {tooltip2.envTemperature} °C
        </text>
        <text
          x={boxX + tooltipWidth / 2}
          y={boxY + 52}
          textAnchor="middle"
          fill="#fff"
          fontSize="10"
        >
          风速: {tooltip2.windSpeed} m/s
        </text>
      </g>
    )
  }

  const renderChart = () => {
    const padding: Padding = { top: 60, right: 30, bottom: 50, left: width * 0.3 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    const minVal = hasData
      ? Math.min(
          ...temperatures1,
          ...temperatures2,
          ...temperatures3,
          abnormalTemperature,
        ) * 0.9
      : 0
    const maxVal = hasData
      ? Math.max(
          ...temperatures1,
          ...temperatures2,
          ...temperatures3,
          abnormalTemperature,
        ) * 1.1
      : 20
    console.log('minVal:', minVal, ' maxVal:', maxVal)
    const pipeHolderNums = [
      'G4-243',
      null,
      null,
      'G4-242',
      null,
      'G4-241',
      'G4-240',
      null,
      'G4-239',
      'G4-238',
      null,
      null,
      'G4-237',
      null,
      'G4-236',
      null,
      'G4-235',
    ]
    const { scaleXTag, scaleYTag } = scaleFuncs(
      minVal,
      maxVal,
      pipeHolderNums,
      width,
      height,
      padding,
    )

    // const maxTemp = Math.max(...temperatures1,...temperatures2,...temperatures3) * 1.1; // 留白
    const xStep = chartWidth / Math.max(monitorPoints1.length - 1, 1)
    const scaleX = (i: number) => padding.left + i * xStep

    // const xTagStep = chartWidth / Math.max(pipeHolderNums.length - 1, 1);
    // const scaleXTag = (i) => padding.left + i * xTagStep;

    const scaleY = (temp: number) =>
      padding.top + chartHeight - ((temp - minVal) / (maxVal - minVal)) * chartHeight
    const sY = (temp: number) => padding.top + chartHeight - (temp / maxVal) * chartHeight

    const radius = Math.min(width, height)

    return (
      <>
        <div
          style={{
            margin: '20px 150px -50px 14px',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <DatePicker
            size={'small'}
            showTime={{ format: 'HH' }}
            placeholder="选择时间"
            value={selectedDate}
            onChange={(date, dateString) => onChange(date, dateString)}
            onOk={onOk}
            format="YYYY-MM-DD HH"
          />
        </div>
        <svg width={width} height={height}>
          {/*<text*/}
          {/*  x={width / 2}*/}
          {/*  y={25}*/}
          {/*  textAnchor="middle"*/}
          {/*  fill="#00eaff"*/}
          {/*  fontSize="18"*/}
          {/*  fontWeight="bold"*/}
          {/*>*/}
          {/*  绝热异常及定位*/}
          {/*</text>*/}

          {/* 图例 */}
          {/* <line x1={padding.left} y1={40} x2={padding.left + 20} y2={40} stroke="#ffd966" strokeWidth="2" /> */}
          <line
            x1={padding.left - 10}
            y1={40}
            x2={padding.left + 10}
            y2={40}
            stroke="#ff3eff"
            strokeWidth="2"
          />
          <text x={padding.left + 15} y={44} fill="#fff" fontSize="0.7rem">
            光纤-0°
          </text>
          <line
            x1={padding.left + 65}
            y1={40}
            x2={padding.left + 85}
            y2={40}
            stroke="#33ff33"
            strokeWidth="2"
          />
          <text x={padding.left + 90} y={44} fill="#fff" fontSize="0.7rem">
            光纤-45°
          </text>
          <line
            x1={padding.left + 140}
            y1={40}
            x2={padding.left + 160}
            y2={40}
            stroke="#33ffff"
            strokeWidth="2"
          />
          <text x={padding.left + 165} y={44} fill="#fff" fontSize="0.7rem">
            光纤-225°
          </text>
          <line
            x1={padding.left + 220}
            y1={40}
            x2={padding.left + 240}
            y2={40}
            stroke="#ff6666"
            strokeWidth="2"
            strokeDasharray="10 5"
          />
          <text x={padding.left + 245} y={44} fill="#fff" fontSize="0.7rem">
            异常温度线
          </text>

          {/* <circle cx={width - padding.right - 170} cy={40} r="4" fill="#6ce0ff" />
        <text x={width - padding.right - 162} y={44} fill="#fff" fontSize="10">表面温度</text> */}
          <circle cx={width - padding.right - 108} cy={40} r="4" fill="#ff6666" />
          <text x={width - padding.right - 100} y={44} fill="#fff" fontSize="10">
            数据异常点
          </text>
          <circle cx={width - padding.right - 38} cy={40} r="4" fill="#ffff00" />
          <text x={width - padding.right - 30} y={44} fill="#fff" fontSize="10">
            设备异常点
          </text>

          {/* 网格线 */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => {
            const y = sY(ratio * maxVal)
            return (
              <line
                key={ratio}
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="rgba(108,224,255,0.15)"
              />
            )
          })}

          {/* 坐标轴 */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="#6ce0ff"
          />
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#6ce0ff"
          />

          {/* 标签 */}
          {pipeHolderNums.map((lbl, i) => (
            <text
              key={i}
              x={scaleXTag(i) + 12}
              y={height - padding.bottom + 15}
              fill="#fff"
              fontSize="9"
              textAnchor="middle"
            >
              {lbl}
            </text>
          ))}
          {Array.from({ length: 6 }).map((_, idx) => {
            const val = minVal + ((maxVal - minVal) / 5) * idx
            return (
              <text
                key={idx}
                x={padding.left - 6}
                y={scaleYTag(val) + 9}
                fill="#fff"
                fontSize="9"
                textAnchor="end"
              >
                {val.toFixed(1) + '℃'}
              </text>
            )
          })}

          {/* 温度曲线 */}
          {hasData && (
            <>
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffd966" />
                  <stop offset="100%" stopColor="#ff6666" />
                </linearGradient>
              </defs>
              <line
                x1={padding.left}
                y1={scaleY(abnormalTemperature)}
                x2={width - padding.right}
                y2={scaleY(abnormalTemperature)}
                stroke="#ff6666"
                strokeWidth="1"
                strokeDasharray="10 5"
              />
              <path
                d={monitorPoints1
                  .map(
                    (_, i) =>
                      `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(temperatures1[i])}`,
                  )
                  .join(' ')}
                fill="none"
                stroke="#ff3eff"
                strokeWidth="1"
                style={{ animation: 'drawLine 2s ease forwards' }}
              />
              <path
                d={monitorPoints2
                  .map(
                    (_, i) =>
                      `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(temperatures2[i])}`,
                  )
                  .join(' ')}
                fill="none"
                stroke="#33ffff"
                strokeWidth="1"
                style={{ animation: 'drawLine 2s ease forwards' }}
              />
              <path
                d={monitorPoints3
                  .map(
                    (_, i) =>
                      `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(temperatures3[i])}`,
                  )
                  .join(' ')}
                fill="none"
                stroke="#33ff33"
                strokeWidth="1"
                style={{ animation: 'drawLine 2s ease forwards' }}
              />
            </>
          )}

          {/* 画管道截面 */}
          <circle
            cx={padding.left / 2}
            cy={height / 2}
            r={radius / 4}
            fill="#ADFF2F"
            stroke="#000000"
          />
          <circle
            cx={padding.left / 2}
            cy={height / 2}
            r={radius / 5}
            fill="#808080"
            stroke="#000000"
          />
          <circle
            cx={padding.left / 2}
            cy={height / 2}
            r={(radius * 3) / 20}
            fill="#808080"
            stroke="#000000"
          />
          <circle
            cx={padding.left / 2}
            cy={height / 2}
            r={radius / 10}
            fill="#808080"
            stroke="#000000"
          />
          <circle
            cx={padding.left / 2}
            cy={height / 2}
            r={(radius * 3) / 40}
            fill="#00AAAA"
            stroke="#000000"
          />

          <circle cx={padding.left / 2} cy={height / 4} r="0.2rem" fill="#ff3eff" />
          <circle
            cx={padding.left / 2 - (height / 4) * Math.sin(Math.PI / 4)}
            cy={height / 2 - (height / 4) * Math.cos(Math.PI / 4)}
            r="0.2rem"
            fill="#33ff33"
          />
          <circle
            cx={padding.left / 2 + (height / 4) * Math.sin(Math.PI / 4)}
            cy={height / 2 + (height / 4) * Math.cos(Math.PI / 4)}
            r="0.2rem"
            fill="#33ffff"
          />
          <text
            x={padding.left / 2}
            y={height / 2}
            dominantBaseline="middle"
            textAnchor="middle"
            fill="#000"
            fontSize="16"
          >
            管道
          </text>

          {/* 画引导线 */}
          <defs>
            <marker
              id="arrow"
              markerWidth="5"
              markerHeight="5"
              refX="2.5"
              refY="2.5"
              orient="auto"
            >
              <path d="M 0 0 L 5 2.5 L 0 5 z" fill="blue" />
            </marker>
          </defs>
          <text
            x={padding.left / 2}
            y={height / 4 - 6}
            fill="#fff"
            fontSize="12"
            textAnchor="middle"
          >
            光纤-0°
          </text>
          {/* <line x1={padding.left/2} y1={height/4} x2={scaleX(0)-2} y2={scaleY(temperatures1[0])} stroke="#66009D" stroke-width="2"/> */}

          <text
            x={padding.left / 2 - (height / 4) * Math.sin(Math.PI / 4) - 9}
            y={height / 2 - (height / 4) * Math.cos(Math.PI / 4) - 12}
            fill="#fff"
            fontSize="12"
            textAnchor="middle"
          >
            光纤-45°
          </text>
          {/* <line x1={padding.left/2-(height/4)*Math.sin(Math.PI/4)} y1={height/2-(height/4)*Math.cos(Math.PI/4)} x2={scaleX(0)-2} y2={scaleY(temperatures2[0])} stroke="#2200AA" stroke-width="2"/> */}

          <text
            x={padding.left / 2 + (height / 4) * Math.sin(Math.PI / 4) + 15}
            y={height / 2 + (height / 4) * Math.cos(Math.PI / 4) + 18}
            fill="#fff"
            fontSize="12"
            textAnchor="middle"
          >
            光纤-225°
          </text>
          {/* <line x1={padding.left/2+(height/4)*Math.sin(Math.PI/4)} y1={height/2+(height/4)*Math.cos(Math.PI/4)} x2={scaleX(0)-2} y2={scaleY(temperatures3[0])} stroke="#003C9D" stroke-width="2"/> */}

          {/* 点 */}
          {monitorPoints1.map((point, i) => {
            const yVal = scaleY(temperatures1[i])
            const tooltipData: TooltipState = {
              x: scaleX(i),
              y: yVal,
              point,
              temp: temperatures1[i],
              loss: heatLosses1[i].toFixed(2),
            }
            if (deviceExceptions1[i]) {
              tooltipData.loss = '设备异常'
              return (
                <circle
                  key={i}
                  cx={scaleX(i)}
                  cy={yVal}
                  r="3"
                  fill="#ffff00"
                  style={{ filter: 'drop-shadow(0 0 5px #ffff44)', cursor: 'pointer' }}
                  onMouseEnter={() => setTooltip(tooltipData)}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => handlePointClick(i)}
                />
              )
            }
            // if (anomalies.includes(i)) {
            if (anomalies1[i]) {
              return (
                <circle
                  key={i}
                  cx={scaleX(i)}
                  cy={yVal}
                  r="4"
                  fill="#ff6666"
                  stroke="#fff"
                  strokeWidth="1"
                  style={{ filter: 'drop-shadow(0 0 5px #ff4444)', cursor: 'pointer' }}
                  onMouseEnter={() => setTooltip(tooltipData)}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => handlePointClick(i)}
                />
              )
            }
            return (
              <circle
                key={i}
                cx={scaleX(i)}
                cy={yVal}
                r="2"
                fill="#ff3eff"
                style={{
                  filter: 'drop-shadow(0 0 5px #ff3eff)',
                  cursor: 'pointer',
                  opacity: '0.5',
                }}
                onMouseEnter={() => setTooltip(tooltipData)}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => handlePointClick(i)}
              />
            )
          })}

          {monitorPoints2.map((point, i) => {
            const yVal = scaleY(temperatures2[i])
            const tooltipData: TooltipState = {
              x: scaleX(i),
              y: yVal,
              point,
              temp: temperatures2[i],
              loss: heatLosses2[i].toFixed(2),
            }
            if (deviceExceptions2[i]) {
              tooltipData.loss = '设备异常'
              return (
                <circle
                  key={i}
                  cx={scaleX(i)}
                  cy={yVal}
                  r="3"
                  fill="#ffff00"
                  style={{ filter: 'drop-shadow(0 0 5px #ffff44)', cursor: 'pointer' }}
                  onMouseEnter={() => setTooltip(tooltipData)}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => handlePointClick(i)}
                />
              )
            }
            // if (anomalies.includes(i)) {
            if (anomalies2[i]) {
              return (
                <circle
                  key={i}
                  cx={scaleX(i)}
                  cy={yVal}
                  r="4"
                  fill="#ff6666"
                  stroke="#fff"
                  strokeWidth="1"
                  style={{ filter: 'drop-shadow(0 0 5px #ff4444)', cursor: 'pointer' }}
                  onMouseEnter={() => setTooltip(tooltipData)}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => handlePointClick(i)}
                />
              )
            }
            return (
              <circle
                key={i}
                cx={scaleX(i)}
                cy={yVal}
                r="2"
                fill="#33ffff"
                style={{
                  filter: 'drop-shadow(0 0 5px #33ffff)',
                  cursor: 'pointer',
                  opacity: '0.5',
                }}
                onMouseEnter={() => setTooltip(tooltipData)}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => handlePointClick(i)}
              />
            )
          })}

          {monitorPoints3.map((point, i) => {
            const yVal = scaleY(temperatures3[i])
            const tooltipData: TooltipState = {
              x: scaleX(i),
              y: yVal,
              point,
              temp: temperatures3[i],
              loss: heatLosses3[i].toFixed(2),
            }
            if (deviceExceptions3[i]) {
              tooltipData.loss = '设备异常'
              return (
                <circle
                  key={i}
                  cx={scaleX(i)}
                  cy={yVal}
                  r="3"
                  fill="#ffff00"
                  style={{ filter: 'drop-shadow(0 0 5px #ffff44)', cursor: 'pointer' }}
                  onMouseEnter={() => setTooltip(tooltipData)}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => handlePointClick(i)}
                />
              )
            }
            // if (anomalies.includes(i)) {
            if (anomalies3[i]) {
              return (
                <circle
                  key={i}
                  cx={scaleX(i)}
                  cy={yVal}
                  r="4"
                  fill="#ff6666"
                  stroke="#fff"
                  strokeWidth="1"
                  style={{ filter: 'drop-shadow(0 0 5px #ff4444)', cursor: 'pointer' }}
                  onMouseEnter={() => setTooltip(tooltipData)}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => handlePointClick(i)}
                />
              )
            }
            return (
              <circle
                key={i}
                cx={scaleX(i)}
                cy={yVal}
                r="2"
                fill="#33ff33"
                style={{
                  filter: 'drop-shadow(0 0 5px #33ff33)',
                  cursor: 'pointer',
                  opacity: '0.5',
                }}
                onMouseEnter={() => setTooltip(tooltipData)}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => handlePointClick(i)}
              />
            )
          })}

          {renderTooltip()}
        </svg>
      </>
    )
  }

  const animCSS = `
      @keyframes drawLine { from { stroke-dasharray:0,1000; } to { stroke-dasharray:1000,0; } }
      @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      @keyframes tooltipPop { from { transform:scale(0.8); opacity:0; } to { transform:scale(1); opacity:1; } }
    `

  const padding: Padding = { top: 30, right: 0, bottom: 30, left: 60 }
  const chartWidth = width2 - padding.left - padding.right
  const chartHeight = height2 - padding.top - padding.bottom

  const minVal = hasData ? Math.min(...t1, ...t2, ...t3, abnormalTemperature) * 0.9 : 0
  const maxVal = hasData ? Math.max(...t1, ...t2, ...t3, abnormalTemperature) * 1.1 : 20

  const xStep = chartWidth / Math.max(pointsDatesXAxis.length - 1, 1)
  const scaleX = (i: number) => padding.left + i * xStep

  const scaleY = (temp: number) =>
    padding.top + chartHeight - ((temp - minVal) / (maxVal - minVal)) * chartHeight
  const sY = (temp: number) => padding.top + chartHeight - (temp / maxVal) * chartHeight
  const { scaleXTag, scaleYTag } = scaleFuncs(
    minVal,
    maxVal,
    pointsDatesXAxis,
    width2,
    height2,
    padding,
  )

  // if (width === 0 || height === 0) {
  //   return <div ref={containerRef} style={styles.border} />
  // }
  return (
    <>
      <style>{animCSS}</style>
      <aside
          className="panel panel--left panel--steam"
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
          <h2>绝热异常及定位</h2>
        </div>
        <div ref={containerRef} style={{ flex: 1, minHeight: 0 }}>
          {loading ? renderLoading() : renderChart()}
        </div>
      </aside>
      <Modal
        open={pointsHistoryModalVisible}
        onCancel={handlePointsHistoryModalCancel}
        footer={null}
        title={'点位历史曲线'}
        width={1060}
        destroyOnClose={true}
      >
        <div>
          <Row>
            <Col span={8}>
              位置:{selectedPointIndex}/102&nbsp;&nbsp;
              {selectedPointIndex != null ? monitorPoints1[selectedPointIndex] : null}
            </Col>
            <Col span={8}>
              <RangePicker
                showTime={{ format: 'HH' }}
                format="YYYY-MM-DD HH"
                disabledDate={disabledDate}
                onOk={(val) => pointsOnOk(val, selectedPointIndex ?? 0)}
                onCalendarChange={(val) => setPointsDates(val)}
                onOpenChange={onOpenChange}
                defaultValue={[dayjs().startOf('day'), dayjs()]}
              />
            </Col>
            <Col span={8}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Button type="primary" shape="round" onClick={downloadExcel}>
                  导出Excel
                </Button>
              </div>
            </Col>
          </Row>

          <div style={{ background: '#001127', margin: '10px 0px 0px 0px' }}>
            <svg width={width2} height={height2}>
              {/* 图例 */}
              {/* <line x1={padding.left} y1={40} x2={padding.left + 20} y2={40} stroke="#ffd966" strokeWidth="2" /> */}
              <line
                x1={padding.left + 15}
                y1={20}
                x2={padding.left + 35}
                y2={20}
                stroke="#ff3eff"
                strokeWidth="2"
              />
              <text x={padding.left + 40} y={24} fill="#fff" fontSize="0.7rem">
                光纤-0°
              </text>
              <line
                x1={padding.left + 90}
                y1={20}
                x2={padding.left + 110}
                y2={20}
                stroke="#33ff33"
                strokeWidth="2"
              />
              <text x={padding.left + 115} y={24} fill="#fff" fontSize="0.7rem">
                光纤-45°
              </text>
              <line
                x1={padding.left + 165}
                y1={20}
                x2={padding.left + 185}
                y2={20}
                stroke="#33ffff"
                strokeWidth="2"
              />
              <text x={padding.left + 190} y={24} fill="#fff" fontSize="0.7rem">
                光纤-225°
              </text>

              {/* 网格线 */}
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => {
                const y = sY(ratio * maxVal)
                return (
                  <line
                    key={ratio}
                    x1={padding.left}
                    y1={y}
                    x2={width2 - padding.right}
                    y2={y}
                    stroke="rgba(108,224,255,0.15)"
                  />
                )
              })}

              {/* 坐标轴 */}
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={height2 - padding.bottom}
                stroke="#6ce0ff"
              />
              <line
                x1={padding.left}
                y1={height2 - padding.bottom}
                x2={width2 - padding.right}
                y2={height2 - padding.bottom}
                stroke="#6ce0ff"
              />

              {/* 标签 */}
              {pointsDatesXAxis.map((lbl, i) => (
                <text
                  key={i}
                  x={scaleXTag(i) + 12}
                  y={height2 - padding.bottom + 15}
                  fill="#fff"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {lbl}
                </text>
              ))}
              {Array.from({ length: 6 }).map((_, idx) => {
                const val = minVal + ((maxVal - minVal) / 5) * idx
                return (
                  <text
                    key={idx}
                    x={padding.left - 6}
                    y={scaleYTag(val) + 9}
                    fill="#fff"
                    fontSize="9"
                    textAnchor="end"
                  >
                    {val.toFixed(1) + '℃'}
                  </text>
                )
              })}

              {/* 温度曲线 */}
              {hasData && (
                <>
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffd966" />
                      <stop offset="100%" stopColor="#ff6666" />
                    </linearGradient>
                  </defs>
                  {/* <line x1={padding.left} y1={scaleY(abnormalTemperature)} x2={width2 - padding.right} y2={scaleY(abnormalTemperature)}
                        stroke="#ff6666" 
                        stroke-width="1" 
                        stroke-dasharray="10 5" 
                      /> */}
                  <path
                    d={pointsDatesXAxis
                      .map(
                        (_, i) =>
                          `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(abTemperatures[i])}`,
                      )
                      .join(' ')}
                    fill="none"
                    stroke="#ff6666"
                    strokeWidth="1"
                    strokeDasharray="10 5"
                    style={{ animation: 'drawLine 2s ease forwards' }}
                  />
                  <path
                    d={pointsDatesXAxis
                      .map((_, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(t1[i])}`)
                      .join(' ')}
                    fill="none"
                    stroke="#ff3eff"
                    strokeWidth="1"
                    style={{ animation: 'drawLine 2s ease forwards' }}
                  />
                  <path
                    d={pointsDatesXAxis
                      .map((_, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(t2[i])}`)
                      .join(' ')}
                    fill="none"
                    stroke="#33ffff"
                    strokeWidth="1"
                    style={{ animation: 'drawLine 2s ease forwards' }}
                  />
                  <path
                    d={pointsDatesXAxis
                      .map((_, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(t3[i])}`)
                      .join(' ')}
                    fill="none"
                    stroke="#33ff33"
                    strokeWidth="1"
                    style={{ animation: 'drawLine 2s ease forwards' }}
                  />
                </>
              )}

              {/* 点 */}
              {pointsDatesStr.map((date, i) => {
                const yVal = scaleY(t1[i])
                const tooltipData: Tooltip2State = {
                  x: scaleX(i),
                  y: yVal,
                  date,
                  temp: t1[i],
                  envTemperature: envTemperatures[i],
                  windSpeed: windSpeeds[i],
                }
                if (t1[i] > abTemperatures[i]) {
                  return (
                    <circle
                      key={i}
                      cx={scaleX(i)}
                      cy={yVal}
                      r="4"
                      fill="#ff6666"
                      stroke="#fff"
                      strokeWidth="1"
                      style={{
                        filter: 'drop-shadow(0 0 5px #ff3eff)',
                        cursor: 'pointer',
                        opacity: '0.9',
                      }}
                      onMouseEnter={() => setTooltip2(tooltipData)}
                      onMouseLeave={() => setTooltip2(null)}
                    />
                  )
                }
                return (
                  <circle
                    key={i}
                    cx={scaleX(i)}
                    cy={yVal}
                    r="2"
                    fill="#ff3eff"
                    style={{
                      filter: 'drop-shadow(0 0 5px #ff3eff)',
                      cursor: 'pointer',
                      opacity: '0.5',
                    }}
                    onMouseEnter={() => setTooltip2(tooltipData)}
                    onMouseLeave={() => setTooltip2(null)}
                  />
                )
              })}
              {pointsDatesStr.map((date, i) => {
                const yVal = scaleY(t2[i])
                const tooltipData: Tooltip2State = {
                  x: scaleX(i),
                  y: yVal,
                  date,
                  temp: t2[i],
                  envTemperature: envTemperatures[i],
                  windSpeed: windSpeeds[i],
                }
                if (t2[i] > abTemperatures[i]) {
                  return (
                    <circle
                      key={i}
                      cx={scaleX(i)}
                      cy={yVal}
                      r="4"
                      fill="#ff6666"
                      stroke="#fff"
                      strokeWidth="1"
                      style={{
                        filter: 'drop-shadow(0 0 5px #ff3eff)',
                        cursor: 'pointer',
                        opacity: '0.9',
                      }}
                      onMouseEnter={() => setTooltip2(tooltipData)}
                      onMouseLeave={() => setTooltip2(null)}
                    />
                  )
                }
                return (
                  <circle
                    key={i}
                    cx={scaleX(i)}
                    cy={yVal}
                    r="2"
                    fill="#33ffff"
                    style={{
                      filter: 'drop-shadow(0 0 5px #ff3eff)',
                      cursor: 'pointer',
                      opacity: '0.5',
                    }}
                    onMouseEnter={() => setTooltip2(tooltipData)}
                    onMouseLeave={() => setTooltip2(null)}
                  />
                )
              })}
              {pointsDatesStr.map((date, i) => {
                const yVal = scaleY(t3[i])
                const tooltipData: Tooltip2State = {
                  x: scaleX(i),
                  y: yVal,
                  date,
                  temp: t3[i],
                  envTemperature: envTemperatures[i],
                  windSpeed: windSpeeds[i],
                }
                if (t3[i] > abTemperatures[i]) {
                  return (
                    <circle
                      key={i}
                      cx={scaleX(i)}
                      cy={yVal}
                      r="4"
                      fill="#ff6666"
                      stroke="#fff"
                      strokeWidth="1"
                      style={{
                        filter: 'drop-shadow(0 0 5px #ff3eff)',
                        cursor: 'pointer',
                        opacity: '0.9',
                      }}
                      onMouseEnter={() => setTooltip2(tooltipData)}
                      onMouseLeave={() => setTooltip2(null)}
                    />
                  )
                }
                return (
                  <circle
                    key={i}
                    cx={scaleX(i)}
                    cy={yVal}
                    r="2"
                    fill="#33ff33"
                    style={{
                      filter: 'drop-shadow(0 0 5px #ff3eff)',
                      cursor: 'pointer',
                      opacity: '0.5',
                    }}
                    onMouseEnter={() => setTooltip2(tooltipData)}
                    onMouseLeave={() => setTooltip2(null)}
                  />
                )
              })}

              {renderTooltip2()}
            </svg>
          </div>
        </div>
      </Modal>
    </>
  )
}


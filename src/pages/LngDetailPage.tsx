import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import TrendChart, { type ChartSeries } from '../components/TrendChart'
import lngDisplay from '../assets/lng-display.png'

type SensorDefinition = {
  id: string
  point: string
  base: number
  risk?: 'normal' | 'warning' | 'alert'
}

type DisplayPoint = {
  id: string
  label: string
  temperature: number
  loss: number
  x: number
  y: number
  tone: 'cyan' | 'green' | 'red'
}

const sensorDefinitions: SensorDefinition[] = [
  { id: 'ST-57', point: '保冷上端-1', base: -143.4 },
  { id: 'ST-57', point: '保冷上端-2', base: -143.1 },
  { id: 'ST-58', point: '保冷上端-1', base: -144.7 },
  { id: 'ST-58', point: '保冷上端-2', base: -144.9 },
  { id: 'ST-59', point: '预制顶端-3', base: -146.9 },
  { id: 'ST-60', point: '预制顶端-1', base: -151.8 },
  { id: 'ST-64', point: '异常点-15', base: -10, risk: 'alert' },
  { id: 'ST-68', point: '预制末端-2', base: -159.4 },
  { id: 'ST-118', point: '传统段-1', base: -143.9 },
  { id: 'ST-119', point: '传统段-6', base: -147.2 },
  { id: 'ST-119', point: '传统段-9', base: -147.9 },
  { id: '3#罐顶', point: '罐内光纤接点', base: -158.6 },
]

const displayPoints: DisplayPoint[] = [
  { id: 'ST-57', label: '预制保冷起点', temperature: -143.4, loss: 13.2, x: 30, y: 37, tone: 'cyan' },
  { id: 'ST-64-15', label: '异常定位点', temperature: -10, loss: 30, x: 53, y: 57, tone: 'red' },
  { id: 'ST-68', label: '预制保冷末端', temperature: -159.4, loss: 11.8, x: 68, y: 66, tone: 'green' },
  { id: 'ST-118', label: '传统保温段', temperature: -143.9, loss: 19.6, x: 81, y: 78, tone: 'cyan' },
]

const preCoolLabels = ['0', '16', '32', '48', '64', '80', '96', '104']
const energyLabels = ['16:37', '16:39', '16:41', '16:43', '16:45', '16:47', '16:49', '16:51']
const coldLossLabels = ['16:36', '16:38', '16:40', '16:42', '16:44', '16:46', '16:48', '16:50']
const alertLabels = ['0', '46', '92', '138', '184', '230', '276', '322', '368', '414']
const quarterLabels = ['Q1 25', 'Q2 25', 'Q3 25', 'Q4 25', 'Q1 26', 'Q2 26', 'Q3 26', 'Q4 26']

function round1(value: number) {
  return Math.round(value * 10) / 10
}

function seriesFrom(
  length: number,
  createValue: (index: number) => number,
): number[] {
  return Array.from({ length }, (_, index) => round1(createValue(index)))
}

export default function LngDetailPage() {
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [selectedPoint, setSelectedPoint] = useState(displayPoints[1])

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 2000)
    return () => window.clearInterval(timer)
  }, [])

  const now = new Date()
  const dateText = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
  const weekText = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()]

  const ambientTemperature = round1(26.5 + Math.sin(tick * 0.6) * 0.2)
  const windSpeed = round1(3.2 + Math.cos(tick * 0.45) * 0.2)
  const humidity = Math.round(68 + Math.sin(tick * 0.5) * 2)

  const sensorRows = sensorDefinitions.map((sensor, index) => ({
    ...sensor,
    value: sensor.risk === 'alert' ? -10 : round1(sensor.base + Math.sin(tick * 0.55 + index) * 0.2),
    status: sensor.risk === 'alert' ? '高风险' : '正常',
  }))

  const fiber3 = seriesFrom(25, (index) => 3 - index * 6.35 + Math.sin(index * 0.72 + tick * 0.35) * 2.2)
  const fiber4 = seriesFrom(25, (index) => fiber3[index] - 10.2 - Math.sin(index * 0.42 + tick * 0.25) * 2.1 - index * 0.12)
  const energyValues = seriesFrom(25, (index) => 58.2 + index * 0.13 + Math.sin(index * 0.65 + tick * 0.3) * 2.1)
  const energyLoss = seriesFrom(25, (index) => 12.3 + Math.sin(index * 0.7 + tick * 0.42) * 1.7 + Math.cos(index * 0.25) * 0.6)
  const traditionalLoss = seriesFrom(25, (index) => 19.4 + Math.sin(index * 0.58 + tick * 0.3) * 1.8 + Math.cos(index * 0.22) * 0.8)
  const prefabLoss = seriesFrom(25, (index) => 14.6 + Math.sin(index * 0.62 + tick * 0.42) * 1.2 + Math.cos(index * 0.31) * 0.5)
  const alertValues = seriesFrom(41, (index) => {
    const spike = index === 18 ? 151.2 : 0
    return -160 + spike + Math.sin(index * 0.8 + tick * 0.2) * 2.1
  })
  const quarterlyLoss = [18.2, 18.8, 19.5, 20.1, 21.2, 22.4, 23.1, 23.8]

  const preCoolSeries: ChartSeries[] = [
    { label: '光纤3', color: '#4dffc3', values: fiber3, area: true, unit: '°C' },
    { label: '光纤4', color: '#ff5fe1', values: fiber4, unit: '°C' },
  ]
  const energySeries: ChartSeries[] = [
    { label: '节能量', color: '#71ff91', values: energyValues, area: true, unit: 'kWh' },
    { label: '冷损失量', color: '#54dfff', values: energyLoss, unit: 'W/m²' },
  ]
  const coldLossSeries: ChartSeries[] = [
    { label: '传统保温冷损', color: '#ff747d', values: traditionalLoss, area: true, unit: 'W/m²' },
    { label: '预制保冷冷损', color: '#56e8ef', values: prefabLoss, unit: 'W/m²' },
  ]
  const alertSeries: ChartSeries[] = [
    { label: '表面温度', color: '#55e7ff', values: alertValues, area: true, unit: '°C' },
  ]
  const quarterSeries: ChartSeries[] = [
    { label: '季度冷损', color: '#ff7079', values: quarterlyLoss, area: true, unit: 'W/m²' },
  ]

  const currentEnergy = energyValues[energyValues.length - 1]
  const currentEnergyLoss = energyLoss[energyLoss.length - 1]
  const currentTraditional = traditionalLoss[traditionalLoss.length - 1]
  const currentPrefab = prefabLoss[prefabLoss.length - 1]

  return (
    <div className="lng-dashboard">
      <AppHeader network="lng" />

      <main className="lng-dashboard__body">
        <section className="lng-panel sensor-panel">
          <div className="panel-heading">
            <span className="panel-icon" />
            <div>
              <h2>光纤监测总览</h2>
              <p>OPTICAL FIBER OVERVIEW</p>
            </div>
            <span className="panel-badge">模拟数据</span>
          </div>

          <div className="weather-card">
            <div className="weather-card__top">
              <div>
                <span className="weather-location">龙口 LNG 接收站</span>
                <strong>{dateText}</strong>
                <small>{weekText} · 天气晴朗</small>
              </div>
              <div className="weather-symbol" aria-hidden="true">
                <span>☀</span>
                <i>26°</i>
              </div>
            </div>
            <div className="environment-grid">
              <div>
                <label>管道附近温度</label>
                <strong>{ambientTemperature}<small>℃</small></strong>
              </div>
              <div>
                <label>风速</label>
                <strong>{windSpeed}<small>m/s</small></strong>
              </div>
              <div>
                <label>相对湿度</label>
                <strong>{humidity}<small>%</small></strong>
              </div>
            </div>
          </div>

          <div className="sensor-table-wrap">
            <div className="sensor-table-head">
              <span>光纤位置</span>
              <span>温度值</span>
              <span>状态</span>
            </div>
            <div className="sensor-table-body">
              {sensorRows.map((sensor, index) => (
                <div className={`sensor-row${sensor.risk === 'alert' ? ' sensor-row--alert' : ''}`} key={`${sensor.id}-${sensor.point}-${index}`}>
                  <span><b>{sensor.id}</b><small>{sensor.point}</small></span>
                  <strong>{sensor.value.toFixed(1)}°C</strong>
                  <em>{sensor.status}</em>
                </div>
              ))}
            </div>
          </div>

          <div className="sensor-footnote">
            <span>在线测点 12 / 12</span>
            <span>采样周期 2s</span>
            <span>ST-57 — ST-68</span>
          </div>
        </section>

        <section className="lng-panel twin-panel">
          <div className="twin-panel__title">
            <div>
              <span>3#储罐区 · 管线保冷数字孪生</span>
              <small>PIPE INSULATION DIGITAL TWIN</small>
            </div>
            <div className="twin-online"><i />实时画面</div>
          </div>

          <div className="twin-viewport">
            <div className="twin-scene" style={{ transform: `scale(${zoom})` }}>
              <img src={lngDisplay} alt="龙口 LNG 管道保冷系统三维展示图" draggable="false" />
              <div className="twin-shade" />
              {displayPoints.map((point) => (
                <button
                  type="button"
                  key={point.id}
                  className={`twin-marker twin-marker--${point.tone}${selectedPoint.id === point.id ? ' is-active' : ''}`}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  onClick={() => setSelectedPoint(point)}
                  title={`${point.id} · ${point.temperature.toFixed(1)}°C`}
                >
                  <i />
                  <span>{point.id}</span>
                </button>
              ))}
            </div>

            <div className="twin-controls">
              <button type="button" onClick={() => setZoom((value) => Math.min(1.32, round1(value + 0.08)))} aria-label="放大">+</button>
              <button type="button" onClick={() => setZoom((value) => Math.max(1, round1(value - 0.08)))} aria-label="缩小">−</button>
              <button type="button" onClick={() => setZoom(1)} aria-label="复位">◎</button>
            </div>

            <div className="twin-legend">
              <span><i className="legend-dot legend-dot--cyan" />深层铠装光纤</span>
              <span><i className="legend-dot legend-dot--green" />外层测温光纤</span>
              <span><i className="legend-dot legend-dot--red" />异常定位</span>
            </div>

            <button type="button" className="twin-back" onClick={() => navigate('/')}>
              ← 返回管网总览
            </button>

            <div className="twin-point-card">
              <div>
                <small>当前选点</small>
                <strong>{selectedPoint.id}</strong>
              </div>
              <div><small>表面温度</small><b>{selectedPoint.temperature.toFixed(1)}°C</b></div>
              <div><small>冷损失量</small><b>{selectedPoint.loss.toFixed(1)} W/m²</b></div>
              <em className={selectedPoint.tone === 'red' ? 'is-alert' : ''}>{selectedPoint.tone === 'red' ? '高风险' : '监测正常'}</em>
            </div>
          </div>
        </section>

        <section className="side-charts">
          <article className="lng-panel chart-panel pre-cool-panel">
            <div className="chart-panel__head">
              <div>
                <h3>预冷光纤温差对比图</h3>
                <span>光纤 3 / 光纤 4 · 全长度监测</span>
              </div>
              <div className="chart-legend">
                <span><i style={{ background: '#4dffc3' }} />光纤3</span>
                <span><i style={{ background: '#ff5fe1' }} />光纤4</span>
              </div>
            </div>
            <div className="chart-canvas chart-canvas--tall">
              <TrendChart
                series={preCoolSeries}
                min={-200}
                max={20}
                unit="°C"
                xLabels={preCoolLabels}
                defaultIndex={19}
              />
            </div>
            <div className="chart-stat-strip">
              <span>平均温差 <b>10.36°C</b></span>
              <span>最小 <b>0.1°C</b></span>
              <span>最大 <b>22.9°C</b></span>
            </div>
          </article>

          <article className="lng-panel chart-panel energy-panel">
            <div className="chart-panel__head">
              <div>
                <h3>节能量计算</h3>
                <span>预制保冷管段 · 双指标对照</span>
              </div>
              <div className="energy-current">
                <strong>{currentEnergy.toFixed(2)}</strong>
                <small>kWh</small>
              </div>
            </div>
            <div className="chart-canvas">
              <TrendChart
                series={energySeries}
                min={0}
                max={80}
                xLabels={energyLabels}
                defaultIndex={20}
              />
            </div>
            <div className="chart-stat-strip">
              <span>实时冷损失 <b>{currentEnergyLoss.toFixed(2)} W/m²</b></span>
              <span>节能量 <b className="is-green">{currentEnergy.toFixed(2)} kWh</b></span>
            </div>
          </article>
        </section>

        <section className="bottom-charts">
          <article className="lng-panel chart-panel alert-panel">
            <div className="chart-panel__head compact">
              <div>
                <h3>保冷异常识别与定位</h3>
                <span>ST-64-15 · 温度突变</span>
              </div>
              <span className="risk-tag">高风险</span>
            </div>
            <div className="chart-canvas chart-canvas--compact">
              <TrendChart
                series={alertSeries}
                min={-200}
                max={20}
                unit="°C"
                xLabels={alertLabels}
                defaultIndex={18}
                showTooltip={false}
              />
              <div className="alert-detail-card">
                <div><span>光纤位置</span><b>ST-64-15</b></div>
                <div><span>当前温度</span><b>-10.0°C</b></div>
                <div><span>表面冷损</span><b>30.00 W/m²</b></div>
                <em>更新时间 · 16:43:35</em>
              </div>
            </div>
          </article>

          <article className="lng-panel chart-panel cold-loss-panel">
            <div className="chart-panel__head compact">
              <div>
                <h3>绝热层外表面冷损失量</h3>
                <span>传统保温 / 预制保冷实时对比</span>
              </div>
              <div className="chart-legend">
                <span><i style={{ background: '#ff747d' }} />传统</span>
                <span><i style={{ background: '#56e8ef' }} />预制</span>
              </div>
            </div>
            <div className="chart-canvas chart-canvas--compact">
              <TrendChart
                series={coldLossSeries}
                min={0}
                max={30}
                unit="W/m²"
                xLabels={coldLossLabels}
                threshold={{ value: 25, label: '警戒线 25 W/m²', color: '#ff8d72' }}
                defaultIndex={19}
                showTooltip={false}
              />
            </div>
            <div className="loss-readout">
              <span>传统 <b>{currentTraditional.toFixed(2)}</b></span>
              <span>预制 <b>{currentPrefab.toFixed(2)}</b></span>
              <span>差值 <b>{(currentTraditional - currentPrefab).toFixed(2)} W/m²</b></span>
            </div>
          </article>

          <article className="lng-panel chart-panel lifetime-panel">
            <div className="chart-panel__head compact">
              <div>
                <h3>季度冷损监控及维护预测</h3>
                <span>以季度为步长 · 趋势预测</span>
              </div>
              <span className="panel-badge panel-badge--soft">预测</span>
            </div>
            <div className="chart-canvas chart-canvas--compact">
              <TrendChart
                series={quarterSeries}
                min={15}
                max={30}
                unit="W/m²"
                xLabels={quarterLabels}
                threshold={{ value: 25, label: '基准线 25 W/m²', color: '#ff9c7d' }}
                defaultIndex={7}
                showTooltip={false}
              />
              <div className="lifetime-callout">
                <span>当前季度</span>
                <strong>Q4 2026</strong>
                <b>23.8 W/m²</b>
                <small>推荐维护周期</small>
                <em>61 个月</em>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}

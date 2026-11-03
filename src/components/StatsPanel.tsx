import { Progress } from 'antd'
import {
  compareItems,
  deviationLevel,
  overview,
  pipelines,
  suppliers,
  totalPipelineKm,
  users,
} from '../data/network'
import {
  lngCompareItems,
  lngOverview,
  lngPipelines,
  lngSuppliers,
  lngTotalPipelineKm,
  lngUsers,
} from '../data/lngNetwork'
import { useLiveMetrics, type LiveCompareItem } from '../hooks/useLiveMetrics'

export type StatsNetworkKind = 'steam' | 'lng'

interface StatsPanelProps {
  /** 哪张管网的数据 */
  network: StatsNetworkKind
  /** 点击进入详情页 */
  onOpenDetail: () => void
}

const STATUS_TEXT = {
  normal: '达标',
  warn: '关注',
  alert: '偏离',
} as const

const STATUS_COLOR = {
  normal: '#3ff0c0',
  warn: '#ffb648',
  alert: '#ff5c6c',
} as const

/** 计算相对设计值的偏差：正值为优于设计目标，负值为劣于设计目标 */
function performanceDeviation(item: { better: 'higher' | 'lower' }, live: number, design: number) {
  const raw = ((live - design) / design) * 100
  return item.better === 'higher' ? raw : -raw
}

/** 单条设计 / 实时比对行，热网与冷网复用 */
function CompareRow({ item }: { item: LiveCompareItem }) {
  const deviation = performanceDeviation(item, item.live, item.design)
  const level = deviationLevel(deviation)
  const percent = Math.max(
    0,
    Math.min(
      100,
      item.better === 'higher' ? (item.live / item.design) * 100 : (item.design / item.live) * 100,
    ),
  )

  return (
    <div className="compare-row">
      <div className="compare-top">
        <span className="compare-label">{item.label}</span>
        <span className={`compare-status compare-status--${level}`}>{STATUS_TEXT[level]}</span>
      </div>
      <div className="compare-values">
        <span>
          设计 {item.design.toFixed(item.precision)} {item.unit}
        </span>
        <strong>
          实时 {item.live.toFixed(item.precision)} {item.unit}
        </strong>
      </div>
      <Progress
        percent={percent}
        showInfo={false}
        size={5}
        strokeColor={STATUS_COLOR[level]}
        trailColor="rgba(122,180,214,0.16)"
      />
      <div className="compare-dev">
        较设计目标 {deviation >= 0 ? '+' : ''}
        {deviation.toFixed(1)}%
      </div>
    </div>
  )
}

export default function StatsPanel({ network, onOpenDetail }: StatsPanelProps) {
  const isSteam = network === 'steam'

  const metrics = useLiveMetrics(isSteam ? compareItems : lngCompareItems)

  const stats = isSteam
    ? [
        { label: '热网总长度', value: totalPipelineKm.toFixed(1), unit: 'km' },
        { label: '蒸汽管线', value: pipelines.length.toString(), unit: '条' },
        { label: '上游热源', value: suppliers.length.toString(), unit: '座' },
        { label: '下游用户', value: users.length.toString(), unit: '家' },
        { label: '今日输汽量', value: overview.todayDelivered.toLocaleString('zh-CN'), unit: 't' },
        {
          label: '热网在线率',
          value: `${Math.round((overview.onlineStations / overview.stationTotal) * 100)}`,
          unit: '%',
        },
      ]
    : [
        { label: '冷网总长度', value: lngTotalPipelineKm.toFixed(1), unit: 'km' },
        { label: '冷网管线', value: lngPipelines.length.toString(), unit: '条' },
        { label: '上游冷源', value: lngSuppliers.length.toString(), unit: '座' },
        { label: '下游用户', value: lngUsers.length.toString(), unit: '家' },
        { label: '今日供冷量', value: lngOverview.todayDelivered.toLocaleString('zh-CN'), unit: 't' },
        { label: '供冷温度', value: lngOverview.supplyTemp.toString(), unit: '℃' },
      ]

  const title = isSteam ? '连云港蒸汽热网运行总览' : '龙口 LNG 冷网运行总览'
  const cta = isSteam ? '进入连云港蒸汽管网详情' : '进入龙口 LNG 冷网详情'

  return (
    <aside className={`panel panel--${isSteam ? 'left panel--steam' : 'right panel--lng'}`}>
      <div className="panel-head">
        <span className="panel-accent" />
        <h2>{title}</h2>
        <span className="panel-tag">LIVE</span>
      </div>

      <div className="stat-grid">
        {stats.map((item) => (
          <div className="stat-cell" key={item.label}>
            <label>{item.label}</label>
            <div className="stat-value">
              {item.value}
              <small>{item.unit}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-sub">
        <h3>设计 / 运行 实时比对</h3>
        <span className="panel-tip">采样周期 4s</span>
      </div>

      <div className="compare-list">
        {metrics.map((item) => (
          <CompareRow item={item} key={item.key} />
        ))}
      </div>

      <button type="button" className="detail-cta" onClick={onOpenDetail}>
        {cta}
      </button>
    </aside>
  )
}

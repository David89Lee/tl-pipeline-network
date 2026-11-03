import type { CompareItem, NetworkNode, Pipeline } from './network'
import { pipelineLengthKm } from './network'

/** 上游冷源（LNG 接收站 / 冷能站） */
export const lngSuppliers: NetworkNode[] = [
  {
    id: 'LS1',
    name: '龙口LNG接收站',
    kind: 'supplier',
    lon: 120.28,
    lat: 37.7,
    capacity: 860,
    status: '满负荷运行',
    desc: 'LNG 气化冷能回收供冷',
  },
  {
    id: 'LS2',
    name: '屺坶岛冷能储备站',
    kind: 'supplier',
    lon: 120.22,
    lat: 37.74,
    capacity: 460,
    status: '平稳运行',
    desc: 'LNG 储备与冷能调峰',
  },
  {
    id: 'LS3',
    name: '南山冷能利用中心',
    kind: 'supplier',
    lon: 120.38,
    lat: 37.57,
    capacity: 380,
    status: '平稳运行',
    desc: '工业冷能梯级利用',
  },
]

/** 下游用冷企业 */
export const lngUsers: NetworkNode[] = [
  {
    id: 'LU1',
    name: '龙口冷链物流园',
    kind: 'user',
    lon: 120.33,
    lat: 37.62,
    capacity: 320,
    status: '用冷正常',
    desc: '低温仓储与冷链中转',
  },
  {
    id: 'LU2',
    name: '滨海数据中心',
    kind: 'user',
    lon: 120.43,
    lat: 37.66,
    capacity: 260,
    status: '用冷正常',
    desc: '机房冷能集中供冷',
  },
  {
    id: 'LU3',
    name: '海产品精深加工园',
    kind: 'user',
    lon: 120.24,
    lat: 37.63,
    capacity: 210,
    status: '负荷偏高',
    desc: '速冻与保鲜加工用冷',
  },
  {
    id: 'LU4',
    name: '龙口港区冷库群',
    kind: 'user',
    lon: 120.3,
    lat: 37.67,
    capacity: 180,
    status: '用冷正常',
    desc: '港口保税冷库用冷',
  },
  {
    id: 'LU5',
    name: '黄山馆工业园',
    kind: 'user',
    lon: 120.35,
    lat: 37.55,
    capacity: 240,
    status: '用冷正常',
    desc: '精细化工低温工艺用冷',
  },
]

export const lngNodes: NetworkNode[] = [...lngSuppliers, ...lngUsers]

/**
 * 龙口 LNG 冷网管线：以接收站与储备站为核心，向冷链、数据中心等用冷场景辐射。
 */
export const lngPipelines: Pipeline[] = [
  {
    id: 'LP01',
    name: '接收站—冷链物流主干线',
    level: 'main',
    from: 'LS1',
    to: 'LU1',
    points: [
      [120.28, 37.7],
      [120.296, 37.678],
      [120.312, 37.652],
      [120.33, 37.62],
    ],
    design: { flow: 320, pressure: 1.2, temp: -8 },
    running: { flow: 302, pressure: 1.15, temp: -7 },
  },
  {
    id: 'LP02',
    name: '接收站—数据中心主干线',
    level: 'main',
    from: 'LS1',
    to: 'LU2',
    points: [
      [120.28, 37.7],
      [120.33, 37.696],
      [120.375, 37.682],
      [120.43, 37.66],
    ],
    design: { flow: 260, pressure: 1.2, temp: -8 },
    running: { flow: 248, pressure: 1.16, temp: -7 },
  },
  {
    id: 'LP03',
    name: '屺坶岛—海产品园线',
    level: 'main',
    from: 'LS2',
    to: 'LU3',
    points: [
      [120.22, 37.74],
      [120.222, 37.712],
      [120.228, 37.674],
      [120.24, 37.63],
    ],
    design: { flow: 210, pressure: 1.1, temp: -10 },
    running: { flow: 196, pressure: 1.06, temp: -9 },
  },
  {
    id: 'LP04',
    name: '屺坶岛—港区冷库线',
    level: 'main',
    from: 'LS2',
    to: 'LU4',
    points: [
      [120.22, 37.74],
      [120.246, 37.722],
      [120.272, 37.698],
      [120.3, 37.67],
    ],
    design: { flow: 180, pressure: 1.1, temp: -10 },
    running: { flow: 172, pressure: 1.07, temp: -9 },
  },
  {
    id: 'LP05',
    name: '南山—黄山馆支线',
    level: 'branch',
    from: 'LS3',
    to: 'LU5',
    points: [
      [120.38, 37.57],
      [120.37, 37.562],
      [120.36, 37.556],
      [120.35, 37.55],
    ],
    design: { flow: 120, pressure: 0.9, temp: -6 },
    running: { flow: 112, pressure: 0.87, temp: -5 },
  },
  {
    id: 'LP06',
    name: '接收站—港区支线',
    level: 'branch',
    from: 'LS1',
    to: 'LU4',
    points: [
      [120.28, 37.7],
      [120.288, 37.689],
      [120.295, 37.68],
      [120.3, 37.67],
    ],
    design: { flow: 96, pressure: 0.9, temp: -6 },
    running: { flow: 90, pressure: 0.88, temp: -6 },
  },
  {
    id: 'LP07',
    name: '南山—数据中心联络线',
    level: 'main',
    from: 'LS3',
    to: 'LU2',
    points: [
      [120.38, 37.57],
      [120.398, 37.596],
      [120.416, 37.628],
      [120.43, 37.66],
    ],
    design: { flow: 150, pressure: 1.1, temp: -8 },
    running: { flow: 138, pressure: 1.05, temp: -7 },
  },
  {
    id: 'LP08',
    name: '冷链物流—海产品园支线',
    level: 'branch',
    from: 'LU1',
    to: 'LU3',
    points: [
      [120.33, 37.62],
      [120.302, 37.622],
      [120.27, 37.626],
      [120.24, 37.63],
    ],
    design: { flow: 84, pressure: 0.85, temp: -5 },
    running: { flow: 78, pressure: 0.82, temp: -4 },
  },
]

export const lngNodeById = new Map(lngNodes.map((node) => [node.id, node]))

export const lngTotalPipelineKm = lngPipelines.reduce(
  (sum, p) => sum + pipelineLengthKm(p),
  0,
)

/** 冷网运行汇总（大屏统计信息） */
export const lngOverview = {
  designCapacity: 1700,
  runningCapacity: 1536,
  stationTotal: lngNodes.length,
  onlineStations: lngNodes.length,
  lossPercent: 3.1,
  safetyDays: 926,
  todayDelivered: 26800,
  supplyTemp: -8,
  supplyPressure: 1.12,
}

/** 冷网设计值与实时运行值比对项 */
export const lngCompareItems: CompareItem[] = [
  { key: 'flow', label: '总供冷量', unit: 't/h', design: 1680, actual: 1536, better: 'higher', precision: 0 },
  { key: 'pressure', label: '主干供液压力', unit: 'MPa', design: 1.2, actual: 1.12, better: 'higher', precision: 2 },
  { key: 'temp', label: '供冷温度', unit: '℃', design: -8, actual: -7.2, better: 'lower', precision: 1 },
  { key: 'loss', label: '管网冷损率', unit: '%', design: 3, actual: 3.1, better: 'lower', precision: 1 },
]

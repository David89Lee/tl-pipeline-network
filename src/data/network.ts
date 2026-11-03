export type NodeKind = 'supplier' | 'user'

export interface NetworkNode {
  id: string
  name: string
  kind: NodeKind
  /** 经度 */
  lon: number
  /** 纬度 */
  lat: number
  /** 供/用汽能力，单位 t/h */
  capacity: number
  /** 运行状态文案 */
  status: string
  /** 节点简介 */
  desc: string
}

export interface PipelineMetrics {
  /** 蒸汽流量 t/h */
  flow: number
  /** 压力 MPa */
  pressure: number
  /** 温度 ℃ */
  temp: number
}

export interface Pipeline {
  id: string
  name: string
  level: 'main' | 'branch'
  from: string
  to: string
  /** 管线路由（经度, 纬度） */
  points: [number, number][]
  design: PipelineMetrics
  running: PipelineMetrics
}

/** 供应商（上游热源） */
export const suppliers: NetworkNode[] = [
  {
    id: 'S1',
    name: '华能连云港热电厂',
    kind: 'supplier',
    lon: 119.305,
    lat: 34.735,
    capacity: 720,
    status: '满负荷运行',
    desc: '2×350MW 机组抽汽供热',
  },
  {
    id: 'S2',
    name: '新海石化余热站',
    kind: 'supplier',
    lon: 119.185,
    lat: 34.665,
    capacity: 380,
    status: '平稳运行',
    desc: '工业余热回收供热',
  },
  {
    id: 'S3',
    name: '赣榆临港能源站',
    kind: 'supplier',
    lon: 119.245,
    lat: 34.985,
    capacity: 460,
    status: '升负荷中',
    desc: '临港产业区集中供热',
  },
  {
    id: 'S4',
    name: '徐圩热电中心',
    kind: 'supplier',
    lon: 119.545,
    lat: 34.545,
    capacity: 560,
    status: '平稳运行',
    desc: '石化基地热电联产',
  },
]

/** 下游用汽企业 */
export const users: NetworkNode[] = [
  {
    id: 'U1',
    name: '徐圩石化产业园',
    kind: 'user',
    lon: 119.505,
    lat: 34.615,
    capacity: 420,
    status: '用汽正常',
    desc: '炼化一体化项目用汽',
  },
  {
    id: 'U2',
    name: '连云港港区物流园',
    kind: 'user',
    lon: 119.395,
    lat: 34.765,
    capacity: 260,
    status: '用汽正常',
    desc: '港口仓储与冷链用汽',
  },
  {
    id: 'U3',
    name: '海州工业园',
    kind: 'user',
    lon: 119.135,
    lat: 34.575,
    capacity: 210,
    status: '负荷偏高',
    desc: '食品与纺织加工用汽',
  },
  {
    id: 'U4',
    name: '赣榆经济开发区',
    kind: 'user',
    lon: 119.195,
    lat: 34.925,
    capacity: 320,
    status: '用汽正常',
    desc: '新材料企业集中用汽',
  },
  {
    id: 'U5',
    name: '连云新城',
    kind: 'user',
    lon: 119.305,
    lat: 34.805,
    capacity: 180,
    status: '用汽正常',
    desc: '城区集中采暖与生活热水',
  },
  {
    id: 'U6',
    name: '板浦食品工业园',
    kind: 'user',
    lon: 119.245,
    lat: 34.505,
    capacity: 150,
    status: '用汽正常',
    desc: '酿造与食品加工用汽',
  },
]

export const nodes: NetworkNode[] = [...suppliers, ...users]

/**
 * 交错的蒸汽管线：主干线 + 支线，多条线路跨越交叉，形成连云港城区蒸汽管网骨架。
 */
export const pipelines: Pipeline[] = [
  {
    id: 'P01',
    name: '新海—海州主干线',
    level: 'main',
    from: 'S2',
    to: 'U3',
    points: [
      [119.185, 34.665],
      [119.172, 34.638],
      [119.156, 34.611],
      [119.135, 34.575],
    ],
    design: { flow: 260, pressure: 1.6, temp: 300 },
    running: { flow: 244, pressure: 1.53, temp: 289 },
  },
  {
    id: 'P02',
    name: '徐圩—石化园区主干线',
    level: 'main',
    from: 'S4',
    to: 'U1',
    points: [
      [119.545, 34.545],
      [119.53, 34.578],
      [119.512, 34.6],
      [119.505, 34.615],
    ],
    design: { flow: 380, pressure: 1.6, temp: 310 },
    running: { flow: 362, pressure: 1.55, temp: 302 },
  },
  {
    id: 'P03',
    name: '徐圩—港区输汽线',
    level: 'main',
    from: 'S4',
    to: 'U2',
    points: [
      [119.545, 34.545],
      [119.492, 34.6],
      [119.455, 34.668],
      [119.42, 34.727],
      [119.395, 34.765],
    ],
    design: { flow: 220, pressure: 1.5, temp: 295 },
    running: { flow: 198, pressure: 1.42, temp: 281 },
  },
  {
    id: 'P04',
    name: '赣榆—开发区线',
    level: 'main',
    from: 'S3',
    to: 'U4',
    points: [
      [119.245, 34.985],
      [119.236, 34.965],
      [119.213, 34.945],
      [119.195, 34.925],
    ],
    design: { flow: 300, pressure: 1.6, temp: 305 },
    running: { flow: 292, pressure: 1.58, temp: 303 },
  },
  {
    id: 'P05',
    name: '赣榆—连云新城线',
    level: 'main',
    from: 'S3',
    to: 'U5',
    points: [
      [119.245, 34.985],
      [119.272, 34.955],
      [119.301, 34.918],
      [119.322, 34.876],
      [119.318, 34.838],
      [119.305, 34.805],
    ],
    design: { flow: 210, pressure: 1.5, temp: 290 },
    running: { flow: 205, pressure: 1.48, temp: 287 },
  },
  {
    id: 'P06',
    name: '华能—港区线',
    level: 'main',
    from: 'S1',
    to: 'U2',
    points: [
      [119.305, 34.735],
      [119.328, 34.742],
      [119.356, 34.755],
      [119.378, 34.762],
      [119.395, 34.765],
    ],
    design: { flow: 180, pressure: 1.5, temp: 288 },
    running: { flow: 173, pressure: 1.46, temp: 283 },
  },
  {
    id: 'P07',
    name: '华能—连云新城支线',
    level: 'branch',
    from: 'S1',
    to: 'U5',
    points: [
      [119.305, 34.735],
      [119.31, 34.758],
      [119.324, 34.78],
      [119.322, 34.797],
      [119.305, 34.805],
    ],
    design: { flow: 96, pressure: 1.3, temp: 280 },
    running: { flow: 88, pressure: 1.25, temp: 272 },
  },
  {
    id: 'P08',
    name: '徐圩—板浦支线',
    level: 'branch',
    from: 'S4',
    to: 'U6',
    points: [
      [119.545, 34.545],
      [119.47, 34.532],
      [119.395, 34.516],
      [119.318, 34.508],
      [119.245, 34.505],
    ],
    design: { flow: 120, pressure: 1.3, temp: 275 },
    running: { flow: 116, pressure: 1.28, temp: 270 },
  },
  {
    id: 'P09',
    name: '新海—板浦线',
    level: 'branch',
    from: 'S2',
    to: 'U6',
    points: [
      [119.185, 34.665],
      [119.208, 34.612],
      [119.232, 34.556],
      [119.245, 34.505],
    ],
    design: { flow: 84, pressure: 1.3, temp: 272 },
    running: { flow: 79, pressure: 1.26, temp: 266 },
  },
  {
    id: 'P10',
    name: '赣榆—华能联络线',
    level: 'main',
    from: 'S3',
    to: 'S1',
    points: [
      [119.245, 34.985],
      [119.278, 34.94],
      [119.315, 34.9],
      [119.34, 34.862],
      [119.345, 34.826],
      [119.33, 34.788],
      [119.305, 34.735],
    ],
    design: { flow: 160, pressure: 1.5, temp: 292 },
    running: { flow: 152, pressure: 1.44, temp: 286 },
  },
  {
    id: 'P11',
    name: '徐圩—赣榆联络线',
    level: 'main',
    from: 'S4',
    to: 'S3',
    points: [
      [119.545, 34.545],
      [119.47, 34.6],
      [119.4, 34.66],
      [119.352, 34.735],
      [119.33, 34.8],
      [119.3, 34.855],
      [119.272, 34.918],
      [119.245, 34.985],
    ],
    design: { flow: 210, pressure: 1.55, temp: 296 },
    running: { flow: 186, pressure: 1.47, temp: 288 },
  },
  {
    id: 'P12',
    name: '海州—板浦支线',
    level: 'branch',
    from: 'U3',
    to: 'U6',
    points: [
      [119.135, 34.575],
      [119.164, 34.556],
      [119.198, 34.532],
      [119.245, 34.505],
    ],
    design: { flow: 72, pressure: 1.2, temp: 265 },
    running: { flow: 68, pressure: 1.17, temp: 261 },
  },
]

export const nodeById = new Map(nodes.map((node) => [node.id, node]))

/** 球面距离（米） */
export function distanceMeters(a: [number, number], b: [number, number]): number {
  const R = 6378137
  const rad = Math.PI / 180
  const dLat = (b[1] - a[1]) * rad
  const dLon = (b[0] - a[0]) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function pipelineLengthKm(pipeline: Pipeline): number {
  let total = 0
  for (let i = 1; i < pipeline.points.length; i += 1) {
    total += distanceMeters(pipeline.points[i - 1], pipeline.points[i])
  }
  return total / 1000
}

export const totalPipelineKm = pipelines.reduce((sum, p) => sum + pipelineLengthKm(p), 0)

/** 管网运行汇总（大屏统计信息） */
export const overview = {
  designCapacity: 1860,
  runningCapacity: 1742,
  stationTotal: nodes.length,
  onlineStations: nodes.length,
  lossPercent: 4.3,
  safetyDays: 1286,
  todayDelivered: 32860,
  supplyTemp: 287,
  supplyPressure: 1.52,
}

/** 设计值与实时运行值比对项 */
export interface CompareItem {
  key: string
  label: string
  unit: string
  design: number
  actual: number
  /** 数值越大越好 / 越小越好，用于判定偏差方向 */
  better: 'higher' | 'lower'
  precision: number
}

export const compareItems: CompareItem[] = [
  { key: 'flow', label: '总供汽量', unit: 't/h', design: 1860, actual: 1742, better: 'higher', precision: 0 },
  { key: 'pressure', label: '主干供汽压力', unit: 'MPa', design: 1.6, actual: 1.52, better: 'higher', precision: 2 },
  { key: 'temp', label: '供汽温度', unit: '℃', design: 300, actual: 287, better: 'higher', precision: 0 },
  { key: 'return', label: '回水温度', unit: '℃', design: 90, actual: 84, better: 'higher', precision: 0 },
  { key: 'loss', label: '管网汽损率', unit: '%', design: 4, actual: 4.3, better: 'lower', precision: 1 },
  { key: 'drop', label: '单位压降', unit: 'kPa/km', design: 13.5, actual: 14.6, better: 'lower', precision: 1 },
]

/** 根据偏差程度给出预警等级 */
export function deviationLevel(deviation: number): 'normal' | 'warn' | 'alert' {
  const abs = Math.abs(deviation)
  if (abs <= 5) return 'normal'
  if (abs <= 10) return 'warn'
  return 'alert'
}

import { distanceMeters, pipelines } from './network'
import { lngPipelines } from './lngNetwork'
import type { Pipeline } from './network'

/** CZML 时间轴，用于驱动介质在管网中的流动动画 */
export const CLOCK_START = '2026-11-02T00:00:00Z'
export const CLOCK_END = '2026-11-02T00:30:00Z'

const TOTAL_SECONDS = 1800
const SAMPLE_STEP = 4
/** 管线抬升高度，避免与高德底图贴合导致画面扁平 */
export const PIPE_ALTITUDE = 260

/** 不同管线错开高度，形成有层次的立体管网 */
export function pipeAltitude(index: number): number {
  return PIPE_ALTITUDE + (index % 3) * 90
}

/** 一套管网的流动配色与标识配置 */
interface FlowTheme {
  /** CZML 实体 id 前缀，用于区分热网 / 冷网 */
  idPrefix: string
  /** 实体名称后缀 */
  nameSuffix: string
  /** 主干线流动点颜色 rgba(0-1) */
  mainDot: [number, number, number, number]
  /** 支线流动点颜色 rgba(0-1) */
  branchDot: [number, number, number, number]
  /** 主干线拖尾颜色 */
  mainTrail: [number, number, number, number]
  /** 支线拖尾颜色 */
  branchTrail: [number, number, number, number]
}

/** 连云港蒸汽热网：橘红系 */
const STEAM_THEME: FlowTheme = {
  idPrefix: 'steam-flow',
  nameSuffix: '蒸汽流',
  mainDot: [1, 0.42, 0.21, 1],
  branchDot: [1, 0.66, 0.4, 1],
  mainTrail: [1, 0.35, 0.15, 0.85],
  branchTrail: [1, 0.55, 0.3, 0.8],
}

/** 龙口 LNG 冷网：冰蓝系 */
const LNG_THEME: FlowTheme = {
  idPrefix: 'lng-flow',
  nameSuffix: '冷能流',
  mainDot: [0.49, 0.77, 1, 1],
  branchDot: [0.69, 0.86, 1, 1],
  mainTrail: [0.35, 0.65, 1, 0.85],
  branchTrail: [0.6, 0.82, 1, 0.8],
}

interface PathGeometry {
  points: [number, number][]
  cumulative: number[]
  total: number
}

function buildGeometry(points: [number, number][]): PathGeometry {
  const cumulative = [0]
  for (let i = 1; i < points.length; i += 1) {
    cumulative.push(cumulative[i - 1] + distanceMeters(points[i - 1], points[i]))
  }
  return { points, cumulative, total: cumulative[cumulative.length - 1] }
}

/** 按距离在管线上取点，用于模拟匀速流动 */
function pointAtDistance(geometry: PathGeometry, distance: number): [number, number] {
  const { points, cumulative, total } = geometry
  const target = Math.max(0, Math.min(distance, total))
  for (let i = 1; i < cumulative.length; i += 1) {
    if (cumulative[i] >= target) {
      const segLength = cumulative[i] - cumulative[i - 1] || 1
      const ratio = (target - cumulative[i - 1]) / segLength
      const [x1, y1] = points[i - 1]
      const [x2, y2] = points[i]
      return [x1 + (x2 - x1) * ratio, y1 + (y2 - y1) * ratio]
    }
  }
  return points[points.length - 1]
}

/** 为一套管网生成流动点实体，追加到 entities 数组 */
function appendFlowEntities(
  entities: Record<string, unknown>[],
  pipes: Pipeline[],
  theme: FlowTheme,
): void {
  pipes.forEach((pipe, index) => {
    const geometry = buildGeometry(pipe.points)
    // 不同管线给予不同流速，主干线更快
    const speed = pipe.level === 'main' ? 46 + (index % 4) * 5 : 34 + (index % 3) * 4
    const travelSeconds = Math.max(geometry.total / speed, 30)
    const dotCount = pipe.level === 'main' ? 3 : 2
    const rgba = pipe.level === 'main' ? theme.mainDot : theme.branchDot
    const trailRgba = pipe.level === 'main' ? theme.mainTrail : theme.branchTrail
    const altitude = pipeAltitude(index)

    for (let dot = 0; dot < dotCount; dot += 1) {
      const offset = (geometry.total * dot) / dotCount
      const samples: number[] = []

      for (let t = 0; t <= TOTAL_SECONDS; t += SAMPLE_STEP) {
        const distance = (offset + speed * (t % travelSeconds)) % geometry.total
        const [lon, lat] = pointAtDistance(geometry, distance)
        // 与对应管线保持相同高度
        samples.push(t, lon, lat, altitude)
      }

      entities.push({
        id: `${theme.idPrefix}:${pipe.id}:${dot}`,
        name: `${pipe.name}${theme.nameSuffix}`,
        availability: `${CLOCK_START}/${CLOCK_END}`,
        position: {
          epoch: CLOCK_START,
          interpolationAlgorithm: 'LINEAR',
          interpolationDegree: 1,
          cartographicDegrees: samples,
        },
        point: {
          pixelSize: 10,
          color: { rgba },
          outlineColor: { rgba: [1, 1, 1, 0.9] },
          outlineWidth: 2,
          scaleByDistance: { near: 5000, nearValue: 1.4, far: 90000, farValue: 0.55 },
        },
        path: {
          resolution: 90,
          leadTime: 0,
          trailTime: 11,
          width: 7,
          material: {
            polylineGlow: {
              glowPower: 0.22,
              color: { rgba: trailRgba },
            },
          },
        },
      })
    }
  })
}

/**
 * 生成 CZML 数据包：热网蒸汽流点与冷网冷能流点共用同一时间轴，
 * 沿各自管线匀速移动并带有 path 拖尾，形成双网介质流动的视觉效果。
 */
export function buildFlowCzml(): Record<string, unknown> {
  const entities: Record<string, unknown>[] = []
  appendFlowEntities(entities, pipelines, STEAM_THEME)
  appendFlowEntities(entities, lngPipelines, LNG_THEME)

  return {
    id: 'document',
    name: 'pipeline-flow',
    version: '1.0',
    clock: {
      interval: `${CLOCK_START}/${CLOCK_END}`,
      currentTime: CLOCK_START,
      multiplier: 4,
      // LOOP_STOP：到达终点后回到起点循环播放（CZML 不支持 loop 属性）
      range: 'LOOP_STOP',
    },
    entities,
  }
}

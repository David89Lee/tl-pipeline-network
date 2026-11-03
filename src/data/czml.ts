import { distanceMeters, pipelines } from './network'

/** CZML 时间轴，用于驱动蒸汽在管网中的流动动画 */
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

/**
 * 生成 CZML 数据包：每条管线上若干个发光的蒸汽流点沿管线匀速移动，
 * 并带有 path 拖尾，形成蒸汽在管网中流动的视觉效果。
 */
export function buildSteamFlowCzml(): Record<string, unknown> {
  const entities: Record<string, unknown>[] = []

  pipelines.forEach((pipe, index) => {
    const geometry = buildGeometry(pipe.points)
    // 不同管线给予不同流速，主干线更快
    const speed = pipe.level === 'main' ? 46 + (index % 4) * 5 : 34 + (index % 3) * 4
    const travelSeconds = Math.max(geometry.total / speed, 30)
    const dotCount = pipe.level === 'main' ? 3 : 2
    const rgba = pipe.level === 'main' ? [0.55, 0.92, 1, 1] : [0.62, 1, 0.86, 1]
    const trailRgba = pipe.level === 'main' ? [0.25, 0.78, 1, 0.85] : [0.3, 1, 0.7, 0.8]
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
        id: `steam-flow:${pipe.id}:${dot}`,
        name: `${pipe.name}蒸汽流`,
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

  return {
    id: 'document',
    name: 'lyg-steam-flow',
    version: '1.0',
    clock: {
      interval: `${CLOCK_START}/${CLOCK_END}`,
      currentTime: CLOCK_START,
      multiplier: 4,
      range: 'CLAMPED',
      loop: true,
    },
    entities,
  }
}

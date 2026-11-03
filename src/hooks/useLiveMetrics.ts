import { useEffect, useMemo, useState } from 'react'
import { compareItems, type CompareItem } from '../data/network'

export interface LiveCompareItem extends CompareItem {
  /** 实时采集值 */
  live: number
}

/**
 * 模拟 4 秒一次的数据采集上报，让“设计与运行比对”呈现实时波动。
 */
export function useLiveMetrics(): LiveCompareItem[] {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 4000)
    return () => window.clearInterval(timer)
  }, [])

  return useMemo(
    () =>
      compareItems.map((item, index) => {
        const wave =
          Math.sin(tick * 0.9 + index * 1.7) * 0.6 + Math.sin(tick * 0.41 + index * 2.3) * 0.4
        const live = item.actual + wave * item.design * 0.012
        return { ...item, live }
      }),
    [tick],
  )
}

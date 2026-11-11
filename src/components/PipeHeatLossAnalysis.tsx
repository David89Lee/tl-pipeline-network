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

export default function PipeHeatLossAnalysis() {
  const [pipeHeatLoss, setPipeHeatLoss] = useState<HeatLossData[]>([])
  const [loading, setLoading] = useState(true)
  const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadHeatLossData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get<ApiResponse<HeatLossData[]>>('/api/v1/heat-loss-data')
      if (res.data && res.data.code === 200 && Array.isArray(res.data.data)) {
        setPipeHeatLoss(res.data.data)
      }
    } catch (err) {
      console.error('获取管道散热损失数据失败', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHeatLossData()
    // 每 60s 检查一次，整点后第 2 分钟刷新（与原蓝卓 scriptUtil 逻辑一致）
    refreshInterval.current = setInterval(() => {
      if (new Date().getMinutes() === 2) {
        loadHeatLossData()
      }
    }, 60000)

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
      }
    }
  }, [loadHeatLossData])

  const renderLoading = () => (
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
      加载管道散热损失数据...
    </div>
  )

  const renderContent = () => (
    // 关键：让内容区使用列布局并允许子元素撑满剩余高度
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '14px' }}>
      {/* <div
        style={{ color: '#6ce0ff', fontSize: '12px', marginBottom: '8px', fontWeight: 'bold' }}
      >
        管道散热损失
      </div> */}

      {/* 关键：滚动区使用 flex:1 + minHeight:0，移除固定 max/min 高度 */}
      <div
        style={{
          flex: 1,
          minHeight: '20vh',
          overflowY: 'auto',
          borderRadius: '6px',
          background: 'rgba(108,224,255,0.05)',
        }}
      >
        {pipeHeatLoss.length > 0 ? (
          <div>
            {/* 粘性表头，滚动时固定在顶部 */}
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 2fr 2fr 2fr',
                gap: '6px',
                padding: '8px 12px',
                background:
                  'linear-gradient(180deg, rgba(108,224,255,0.20), rgba(108,224,255,0.10))',
                backdropFilter: 'blur(2px)',
                borderBottom: '1px solid rgba(108,224,255,0.25)',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
              }}
            >
              <div style={{ color: '#6ce0ff', fontSize: '10px', fontWeight: 'bold' }}>管段</div>
              <div
                style={{
                  color: '#6ce0ff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                管道平均热损失(W/m²)
              </div>
              <div
                style={{
                  color: '#6ce0ff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                标准最大热损失(W/m²)
              </div>
              <div
                style={{
                  color: '#6ce0ff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                管道热损总值(W)
              </div>
            </div>

            {/* 数据行 */}
            {pipeHeatLoss.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr 2fr 2fr',
                  gap: '8px',
                  padding: '10px 12px',
                  backgroundColor: index % 2 === 0 ? 'rgba(108,224,255,0.05)' : 'transparent',
                  borderBottom: '1px solid rgba(108,224,255,0.10)',
                }}
              >
                <div
                  style={{
                    color: '#fff',
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.PipeSection}
                </div>
                <div
                  style={{
                    color:
                      item.HeatLoss != null && item.HeatLoss > item.Standard
                        ? '#ff6666'
                        : '#ffd966',
                    fontSize: '10px',
                    textAlign: 'center',
                    fontWeight:
                      item.HeatLoss != null && item.HeatLoss > item.Standard ? 'bold' : 'normal',
                  }}
                >
                  {item.HeatLoss?.toFixed(1)}
                </div>
                <div style={{ color: '#6ce0ff', fontSize: '10px', textAlign: 'center' }}>
                  {item.Standard?.toFixed(1)}
                </div>
                <div style={{ color: '#ffd966', fontSize: '10px', textAlign: 'center' }}>
                  {item.TotalHeat?.toFixed(1)}
                </div>
              </div>
            ))}

            {/* 底部圆角填充，让滚动区底部也圆角更美观 */}
            <div style={{ height: 6, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }} />
          </div>
        ) : (
          // 无数据时也让占位块填满滚动区，避免只占很小空间
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '100%',
                textAlign: 'center',
                color: '#6ce0ff',
                fontSize: '11px',
                opacity: 0.8,
                border: '1px dashed rgba(108,224,255,0.3)',
                borderRadius: '4px',
                padding: '18px',
              }}
            >
              暂无管道散热损失数据
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    // <div
    //   style={{
    //     width: '100%',
    //     height: '100%',
    //     background: '#001127',
    //     borderRadius: '8px',
    //     border: '2px solid rgba(0,198,255,0.6)',
    //     boxShadow: '0 0 10px rgba(0,198,255,0.4), inset 0 0 10px rgba(0,198,255,0.2)',
    //     padding: '15px',
    //     display: 'flex',
    //     flexDirection: 'column',
    //     // 关键：允许子元素在 flex 容器内正确计算高度
    //     minHeight: 0,
    //   }}
    // >
    //   <div
    //     style={{
    //       color: '#00eaff',
    //       fontSize: '18px',
    //       fontWeight: 'bold',
    //       marginBottom: '12px',
    //       textAlign: 'center',
    //       lineHeight: 1,
    //     }}
    //   >
    //     管道散热损失分析
    //   </div>

    <aside className={`panel panel--left panel--steam`}>
      <div className="panel-head">
        <span className="panel-accent" />
        <h2>管道散热损失分析</h2>
      </div>
      {loading ? renderLoading() : renderContent()}
    </aside>
    // </div>
  )
}

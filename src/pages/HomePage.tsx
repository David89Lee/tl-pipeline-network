import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Legend from '../components/Legend'
import NetworkPanel from '../components/NetworkPanel'
import NetworkViewer, { type NetworkKind } from '../components/NetworkViewer'
import StatsPanel from '../components/StatsPanel'

export default function HomePage() {
  const navigate = useNavigate()

  const openDetail = (pipelineId?: string, network: NetworkKind = 'steam') => {
    const base = network === 'lng' ? '/network/lng' : '/network/lyg'
    navigate(pipelineId ? `${base}?line=${pipelineId}` : base)
  }

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="map-stage">
        <NetworkViewer onSelectPipeline={openDetail} />
        <div className="map-vignette" />
        <StatsPanel />
        <NetworkPanel
          onOpenPipeline={(id) => openDetail(id, 'steam')}
          onOpenDetail={() => openDetail()}
        />
        <Legend />
        <div className="map-hint">点击发光管线，进入对应热网 / 冷网详情</div>
      </main>
    </div>
  )
}

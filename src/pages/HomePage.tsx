import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
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
        <StatsPanel network="steam" onOpenDetail={() => openDetail(undefined, 'steam')} />
        <StatsPanel network="lng" onOpenDetail={() => openDetail(undefined, 'lng')} />
        <div className="map-hint">点击发光管线，进入对应热网 / 冷网详情</div>
      </main>
    </div>
  )
}

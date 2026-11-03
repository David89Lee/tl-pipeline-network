import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Legend from '../components/Legend'
import NetworkPanel from '../components/NetworkPanel'
import NetworkViewer from '../components/NetworkViewer'
import StatsPanel from '../components/StatsPanel'

export default function HomePage() {
  const navigate = useNavigate()

  const openDetail = (pipelineId?: string) => {
    navigate(pipelineId ? `/network/lyg?line=${pipelineId}` : '/network/lyg')
  }

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="map-stage">
        <NetworkViewer onSelectPipeline={openDetail} />
        <div className="map-vignette" />
        <StatsPanel />
        <NetworkPanel onOpenPipeline={openDetail} onOpenDetail={() => openDetail()} />
        <Legend />
        <div className="map-hint">点击发光蒸汽管线，进入连云港蒸汽管网详情</div>
      </main>
    </div>
  )
}

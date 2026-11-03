import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'

export default function LngDetailPage() {
  const navigate = useNavigate()

  return (
    <div className="detail-page detail-page--lng">
      <AppHeader />
      <section className="detail-hero">
        <div className="detail-grid" />
        <div className="detail-glow" />
        <div className="detail-content">
          <span className="detail-eyebrow">LONGKOU · LNG COLD NETWORK</span>
          <h1>龙口LNG冷网</h1>
          <p>探灵智慧管网平台 · 上游冷源与下游用户的冷能输配一张图</p>
          <button type="button" className="ghost-btn" onClick={() => navigate('/')}>
            ← 返回管网总览
          </button>
        </div>
      </section>
    </div>
  )
}

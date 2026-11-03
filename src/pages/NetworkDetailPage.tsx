import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'

export default function NetworkDetailPage() {
  const navigate = useNavigate()

  return (
    <div className="detail-page">
      <AppHeader />
      <section className="detail-hero">
        <div className="detail-grid" />
        <div className="detail-glow" />
        <div className="detail-content">
          <span className="detail-eyebrow">LIANYUNGANG · STEAM NETWORK</span>
          <h1>连云港蒸汽管网</h1>
          <p>探灵智慧管网平台 · 上游热源与下游用户的蒸汽输配一张图</p>
          <button type="button" className="ghost-btn" onClick={() => navigate('/')}>
            ← 返回管网总览
          </button>
        </div>
      </section>
    </div>
  )
}

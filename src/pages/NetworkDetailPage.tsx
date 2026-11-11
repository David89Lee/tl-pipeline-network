import AppHeader from '../components/AppHeader'
import { useNavigate } from 'react-router-dom'
import PipeHeatLossAnalysis from '../components/PipeHeatLossAnalysis'
import InsulationPerformance from '../components/InsulationPerformance'
import HeatLossPieChart from '../components/HeatLossPieChart'
import InsulationAnomaly from '../components/InsulationAnomaly'

export default function NetworkDetailPage() {
  const navigate = useNavigate()

  // TODO: 接入后端 /api/v1/weather 后改回 useState
  const address = '连云港石化园区'
  const temperature = '26°C'
  const windSpeed = '3 m/s'
  const humidity = '65%'

  const renderInfoPanel = () => {
    return (
      <div style={{
        position: 'absolute',
        top: '150px',
        left: '24px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '12px 16px',
        borderRadius: '6px',
        color: '#fff',
        fontSize: '12px',
        lineHeight: '2',
        boxShadow: '0 0 8px rgba(0,198,255,0.4)',
        zIndex: 2
      }}>
        <div>📍 地址: {address}</div>
        <div>🌡 环境温度: {temperature}</div>
        <div>💨 环境风速: {windSpeed}</div>
        <div>💧 环境湿度: {humidity}</div>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <AppHeader />
      <div className="lyg-detail-bg">
        <iframe
          title="detail-bg"
          className="detail-bg-iframe"
          src="http://vpn.szwutu.cn:5678/apps/client/#/share/5mk4x1nj4emrw56g11l6"
        />
        <button type="button" className="ghost-btn" onClick={() => navigate('/')}>
          ← 返回管网总览
        </button>
        {renderInfoPanel()}
        <div style={{
          position: 'absolute',
          top: '280px',
          left: '8px',
          height: '200px',
        }}>
          <PipeHeatLossAnalysis />
        </div>
        <div style={{
          position: 'absolute',
          top: '600px',
          left: '8px',
          width: '800px',
          height: '320px',
          zIndex: 2,
        }}>
          <InsulationAnomaly />
        </div>
        <div style={{
          position: 'absolute',
          top: '240px',
          right: '8px',
          width: '352px',
          height: '300px',
          zIndex: 2,
        }}>
          <HeatLossPieChart />
        </div>
        <div style={{
          position: 'absolute',
          right: '8px',
          bottom: '12px',
          width: '600px',
          height: '300px',
          zIndex: 2,
        }}>
          <InsulationPerformance />
        </div>
        {/* <div className="detail-bg-mask" />
        <div className="detail-grid" />
        <div className="detail-glow" />
        <div className="detail-content">
          <span className="detail-eyebrow">LIANYUNGANG · STEAM NETWORK</span>
          <h1>连云港蒸汽管网</h1>
          <p>探灵智慧管网平台 · 上游热源与下游用户的蒸汽输配一张图</p>
          <button type="button" className="ghost-btn" onClick={() => navigate('/')}>
            ← 返回管网总览
          </button>
        </div> */}
      </div>
    </div>
  )
}


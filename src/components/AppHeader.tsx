import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function pad(value: number) {
  return value.toString().padStart(2, '0')
}

/** 全局顶部标题栏，首页与详情页共用，保证风格一致 */
export default function AppHeader() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const dateText = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const weekText = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]
  const timeText = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  return (
    <header className="app-header">
      <Link to="/" className="brand">
        <span className="brand-mark">探</span>
        <span className="brand-text">
          <h1>探灵智慧管网平台</h1>
          <p>SMART STEAM PIPE NETWORK PLATFORM</p>
        </span>
      </Link>

      {/* <div className="header-center">
        <span className="header-chip">连云港蒸汽热网</span>
        <span className="header-chip header-chip--ghost">三维 GIS 实时态势</span>
      </div> */}

      <div className="header-right">
        <div className="sys-status">
          <i className="sys-dot" />
          系统运行正常
        </div>
        <div className="header-clock">
          <span>{dateText}</span>
          <em>星期{weekText}</em>
          <strong>{timeText}</strong>
        </div>
      </div>
    </header>
  )
}

import { pipelineLengthKm, pipelines, suppliers, users } from '../data/network'

interface NetworkPanelProps {
  onOpenPipeline: (pipelineId: string) => void
  onOpenDetail: () => void
}

/** 热网列表中使用的节点简称，避免长名称撑开布局 */
const SHORT_NAME: Record<string, string> = {
  S1: '华能热电',
  S2: '新海余热',
  S3: '赣榆能源',
  S4: '徐圩热电',
  U1: '石化园区',
  U2: '港区物流',
  U3: '海州工业园',
  U4: '赣榆开发区',
  U5: '连云新城',
  U6: '板浦食品园',
}

export default function NetworkPanel({ onOpenPipeline, onOpenDetail }: NetworkPanelProps) {
  return (
    <aside className="panel panel--right">
      <div className="panel-head">
        <span className="panel-accent" />
        <h2>蒸汽热网清单</h2>
        <span className="panel-tag">{pipelines.length} 条</span>
      </div>

      <div className="pipe-list">
        {pipelines.map((pipe, index) => (
          <button
            type="button"
            className="pipe-item"
            key={pipe.id}
            onClick={() => onOpenPipeline(pipe.id)}
            title={`点击查看 ${pipe.name} 所属的连云港蒸汽管网详情`}
          >
            <span className="pipe-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="pipe-main">
              <strong>{pipe.name}</strong>
              <small>
                {SHORT_NAME[pipe.from] ?? pipe.from} → {SHORT_NAME[pipe.to] ?? pipe.to} ·{' '}
                {pipelineLengthKm(pipe).toFixed(1)} km
              </small>
            </span>
            <span className="pipe-meta">
              <span className={`pipe-level pipe-level--${pipe.level}`}>
                {pipe.level === 'main' ? '主干' : '支线'}
              </span>
              <span>{pipe.running.flow} t/h</span>
            </span>
          </button>
        ))}
      </div>

      <div className="panel-sub">
        <h3>上下游节点</h3>
        <span className="panel-tip">热源 {suppliers.length} · 用户 {users.length}</span>
      </div>

      <div className="node-groups">
        <div className="node-row">
          {suppliers.map((node) => (
            <span className="node-chip node-chip--supplier" key={node.id}>
              {node.name}
            </span>
          ))}
        </div>
        <div className="node-row">
          {users.map((node) => (
            <span className="node-chip node-chip--user" key={node.id}>
              {node.name}
            </span>
          ))}
        </div>
      </div>

      <button type="button" className="detail-cta" onClick={onOpenDetail}>
        进入连云港蒸汽管网详情
      </button>
    </aside>
  )
}

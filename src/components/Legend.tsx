const ITEMS = [
  { label: '上游热源', className: 'legend-dot', color: '#ffb648' },
  { label: '下游用户', className: 'legend-dot', color: '#36e2ff' },
  { label: '主干管线', className: 'legend-line', color: '#4fe4ff' },
  { label: '支线管线', className: 'legend-line', color: '#59ffc9' },
  { label: '蒸汽流向', className: 'legend-dot legend-dot--flow', color: '#effdff' },
]

export default function Legend() {
  return (
    <div className="legend">
      {ITEMS.map((item) => (
        <span className="legend-item" key={item.label}>
          <i className={item.className} style={{ color: item.color, background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

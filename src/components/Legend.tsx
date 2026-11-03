const ITEMS = [
  { label: '上游热源', className: 'legend-dot', color: '#ffb648' },
  { label: '下游用户', className: 'legend-dot', color: '#36e2ff' },
  { label: '热网主干', className: 'legend-line', color: '#4fe4ff' },
  { label: '热网支线', className: 'legend-line', color: '#59ffc9' },
  { label: '上游冷源', className: 'legend-dot', color: '#a8d8ff' },
  { label: '用冷企业', className: 'legend-dot', color: '#c4a5ff' },
  { label: '冷网主干', className: 'legend-line', color: '#7c9dff' },
  { label: '冷网支线', className: 'legend-line', color: '#b48cff' },
  { label: '介质流向', className: 'legend-dot legend-dot--flow', color: '#effdff' },
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

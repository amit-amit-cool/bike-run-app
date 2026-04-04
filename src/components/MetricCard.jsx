export default function MetricCard({ label, value, unit, icon, accent = false, large = false }) {
  return (
    <div className={`bg-white rounded-2xl p-4 border transition-all duration-200 ${
      accent ? 'border-brand-200 bg-brand-50' : 'border-gray-100 shadow-card'
    }`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-sm">{icon}</span>}
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-bold text-gray-900 tabular-nums ${large ? 'text-4xl' : 'text-3xl'}`}>
        {value ?? '--'}
      </div>
      {unit && <div className="text-sm text-gray-400 mt-0.5">{unit}</div>}
    </div>
  )
}

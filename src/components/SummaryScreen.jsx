function formatPace(speedKmh) {
  if (!speedKmh || speedKmh < 0.5) return '--\'--"'
  const secsPerKm = 3600 / speedKmh
  const mins = Math.floor(secsPerKm / 60)
  const secs = Math.round(secsPerKm % 60)
  return `${mins}'${String(secs).padStart(2, '0')}"`
}

function StatCard({ icon, label, value, unit, color = 'text-gray-900', wide = false }) {
  return (
    <div className={`bg-gray-50 rounded-2xl p-4 flex flex-col gap-1 ${wide ? 'col-span-2' : ''}`}>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{icon} {label}</div>
      <div className={`text-2xl font-black tabular-nums leading-none ${color}`}>{value}</div>
      {unit && <div className="text-xs text-gray-400">{unit}</div>}
    </div>
  )
}

export default function SummaryScreen({ mode, timer, onDismiss, onHome }) {
  const isBike = mode === 'bike'

  const avgDisplay = isBike
    ? (timer.avgSpeedKmh != null ? `${timer.avgSpeedKmh}` : '—')
    : formatPace(timer.avgSpeedKmh)
  const avgUnit = isBike ? 'km/h' : 'min/km'
  const avgLabel = isBike ? 'Avg Speed' : 'Avg Pace'

  const elapsedSec = Math.floor(timer.elapsedMs / 1000)
  const h = Math.floor(elapsedSec / 3600)
  const m = Math.floor((elapsedSec % 3600) / 60)
  const s = elapsedSec % 60
  const durationLabel = h > 0
    ? `${h}h ${String(m).padStart(2, '0')}m`
    : `${m}m ${String(s).padStart(2, '0')}s`

  const hasData = timer.totalDistanceKm > 0

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-4">

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onHome}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Home
        </button>
        <div className="text-xs text-gray-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Hero header */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-card">
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${isBike ? 'bg-brand-50' : 'bg-orange-50'}`}>
            {isBike ? '🚴' : '🏃'}
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">{isBike ? 'Ride' : 'Run'} Complete!</h1>
            <p className="text-sm text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Distance — hero number */}
        <div className="text-center py-4 border-y border-gray-100">
          <div className={`text-7xl font-black tabular-nums leading-none ${isBike ? 'text-brand-500' : 'text-orange-500'}`}>
            {hasData ? timer.totalDistanceKm : '—'}
          </div>
          <div className="text-lg text-gray-400 font-medium mt-2">kilometers</div>
        </div>

        {/* Time below distance */}
        <div className="text-center pt-4">
          <div className="text-3xl font-black tabular-nums text-gray-900 font-mono tracking-tight">
            {timer.timeString}
          </div>
          <div className="text-sm text-gray-400 mt-1">total time</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon="📈"
          label={avgLabel}
          value={avgDisplay}
          unit={avgUnit}
          color={isBike ? 'text-brand-600' : 'text-orange-500'}
        />
        <StatCard
          icon="⏱"
          label="Duration"
          value={durationLabel}
          color="text-gray-900"
        />
        <StatCard
          icon="⛰️"
          label="Climbing"
          value={`+${timer.elevGainM}`}
          unit="meters gained"
          color="text-brand-600"
        />
        <StatCard
          icon="🏔️"
          label="Descending"
          value={`-${timer.elevLossM}`}
          unit="meters lost"
          color="text-orange-500"
        />
      </div>

      {/* Encouragement */}
      {hasData && (
        <div className={`rounded-2xl px-5 py-4 flex items-center gap-3 ${isBike ? 'bg-brand-50 border border-brand-100' : 'bg-orange-50 border border-orange-100'}`}>
          <span className="text-2xl">⚡</span>
          <div>
            <div className={`font-semibold text-sm ${isBike ? 'text-brand-700' : 'text-orange-700'}`}>Great effort!</div>
            <div className={`text-xs mt-0.5 ${isBike ? 'text-brand-600' : 'text-orange-600'}`}>
              {timer.totalDistanceKm} km in {durationLabel}
              {timer.elevGainM > 0 ? ` · ${timer.elevGainM}m climbing` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 pb-2">
        <button
          onClick={onDismiss}
          className={`w-full py-4 text-white rounded-2xl text-base font-bold tracking-wide shadow-lg transition-all active:scale-95 ${
            isBike
              ? 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/25'
              : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25'
          }`}
        >
          Start New Activity
        </button>
        <button
          onClick={onHome}
          className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-2xl text-sm font-semibold transition-colors"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  )
}

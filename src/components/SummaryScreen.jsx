import { aqiLabel } from '../utils/aqiLabel'
import { uvLabel } from '../utils/uvLabel'
import { weatherDesc } from '../utils/weatherIcon'

function formatPace(speedKmh) {
  if (!speedKmh || speedKmh < 0.5) return '--\'--"'
  const secsPerKm = 3600 / speedKmh
  const mins = Math.floor(secsPerKm / 60)
  const secs = Math.round(secsPerKm % 60)
  return `${mins}'${String(secs).padStart(2, '0')}"`
}

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

function formatSplitPace(ms) {
  const secsPerKm = ms / 1000
  const mins = Math.floor(secsPerKm / 60)
  const secs = Math.round(secsPerKm % 60)
  return `${mins}'${String(secs).padStart(2, '0')}"`
}

function StatCard({ icon, label, value, unit, color = 'text-gray-900' }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-1">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{icon} {label}</div>
      <div className={`text-xl font-black tabular-nums leading-none ${color}`}>{value}</div>
      {unit && <div className="text-[10px] text-gray-400">{unit}</div>}
    </div>
  )
}

function ElevationChart({ profile }) {
  if (!profile || profile.length < 2) return null

  // Downsample to ~60 points for smooth chart
  const maxPoints = 60
  const step = Math.max(1, Math.floor(profile.length / maxPoints))
  const sampled = profile.filter((_, i) => i % step === 0)

  const min = Math.min(...sampled)
  const max = Math.max(...sampled)
  const range = max - min || 1

  const width = 100
  const height = 40
  const points = sampled.map((v, i) => {
    const x = (i / (sampled.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4)
    return `${x},${y}`
  }).join(' ')

  // Create filled area path
  const areaPath = `M0,${height} L${sampled.map((v, i) => {
    const x = (i / (sampled.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4)
    return `${x},${y}`
  }).join(' L')} L${width},${height} Z`

  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Elevation Profile</div>
      <svg viewBox={`0 0 ${width} ${height + 4}`} className="w-full h-16" preserveAspectRatio="none">
        <defs>
          <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#elevGrad)" />
        <polyline points={points} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{min}m</span>
        <span>{max}m</span>
      </div>
    </div>
  )
}

function SplitsTable({ splits, mode }) {
  if (!splits || splits.length === 0) return null
  const isBike = mode === 'bike'

  // Find fastest and slowest for highlighting
  const times = splits.map((s) => s.movingMs)
  const fastest = Math.min(...times)
  const slowest = Math.max(...times)

  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Splits</div>
      <div className="space-y-1">
        <div className="grid grid-cols-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-200">
          <span>KM</span>
          <span className="text-center">{isBike ? 'Speed' : 'Pace'}</span>
          <span className="text-right">Time</span>
        </div>
        {splits.map((split) => {
          const speedForSplit = split.movingMs > 0 ? (1 / (split.movingMs / 3_600_000)) : 0
          const isFastest = split.movingMs === fastest && splits.length > 1
          const isSlowest = split.movingMs === slowest && splits.length > 1

          // Bar width relative to slowest split
          const barPct = slowest > 0 ? (split.movingMs / slowest) * 100 : 0

          return (
            <div key={split.km} className="relative">
              <div
                className={`absolute inset-y-0 left-0 rounded ${
                  isFastest ? 'bg-green-100' : isSlowest ? 'bg-red-50' : 'bg-brand-50'
                }`}
                style={{ width: `${barPct}%` }}
              />
              <div className="relative grid grid-cols-3 py-1.5 text-xs">
                <span className="font-semibold text-gray-700">{split.km}</span>
                <span className={`text-center font-semibold ${
                  isFastest ? 'text-green-600' : isSlowest ? 'text-red-500' : 'text-gray-700'
                }`}>
                  {isBike ? `${Math.round(speedForSplit * 10) / 10} km/h` : formatSplitPace(split.movingMs)}
                </span>
                <span className="text-right text-gray-500">{formatDuration(split.movingMs)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function estimateCalories(mode, distanceKm, movingMs, elevGainM) {
  // MET-based estimate: Biking ~8 MET, Running ~10 MET (adjusted for speed/elevation)
  const hours = movingMs / 3_600_000
  if (hours <= 0 || distanceKm <= 0) return 0
  const speedKmh = distanceKm / hours
  let met
  if (mode === 'bike') {
    if (speedKmh < 16) met = 6.8
    else if (speedKmh < 20) met = 8.0
    else if (speedKmh < 25) met = 10.0
    else met = 12.0
  } else {
    if (speedKmh < 8) met = 8.3
    else if (speedKmh < 10) met = 10.0
    else if (speedKmh < 12) met = 11.5
    else met = 13.5
  }
  // Rough elevation bonus: +0.5 MET per 100m gained per hour
  if (elevGainM > 0 && hours > 0) {
    met += Math.min(2, (elevGainM / hours / 100) * 0.5)
  }
  // Assume ~70kg body weight (standard estimate)
  return Math.round(met * 70 * hours)
}

export default function SummaryScreen({ mode, timer, currentWeather, airQuality, trail, onDismiss, onHome }) {
  const isBike = mode === 'bike'
  const accentColor = isBike ? 'brand' : 'orange'

  const avgDisplay = isBike
    ? (timer.avgSpeedKmh != null ? `${timer.avgSpeedKmh}` : '—')
    : formatPace(timer.avgSpeedKmh)
  const avgUnit = isBike ? 'km/h' : 'min/km'
  const avgLabel = isBike ? 'Avg Speed' : 'Avg Pace'

  const maxDisplay = isBike
    ? (timer.maxSpeedKmh > 0 ? `${timer.maxSpeedKmh}` : '—')
    : formatPace(timer.maxSpeedKmh)
  const maxUnit = isBike ? 'km/h' : 'min/km'
  const maxLabel = isBike ? 'Max Speed' : 'Best Pace'

  const hasData = timer.totalDistanceKm > 0
  const calories = estimateCalories(mode, timer.totalDistanceKm, timer.movingMs, timer.elevGainM)

  const aqi = airQuality?.usAqi != null ? aqiLabel(airQuality.usAqi) : null
  const uv = currentWeather?.uv != null ? uvLabel(currentWeather.uv) : null

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-3">

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
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Hero header */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-card">
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${isBike ? 'bg-brand-50' : 'bg-orange-50'}`}>
            {isBike ? '🚴' : '🏃'}
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">{isBike ? 'Ride' : 'Run'} Summary</h1>
            <p className="text-sm text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        {/* Three hero metrics */}
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <div className="text-center px-2">
            <div className={`text-3xl font-black tabular-nums ${isBike ? 'text-brand-500' : 'text-orange-500'}`}>
              {hasData ? timer.totalDistanceKm : '—'}
            </div>
            <div className="text-xs text-gray-400 mt-1">km</div>
          </div>
          <div className="text-center px-2">
            <div className="text-3xl font-black tabular-nums text-gray-900">
              {timer.movingTimeString || timer.timeString}
            </div>
            <div className="text-xs text-gray-400 mt-1">moving time</div>
          </div>
          <div className="text-center px-2">
            <div className={`text-3xl font-black tabular-nums ${isBike ? 'text-brand-500' : 'text-orange-500'}`}>
              {avgDisplay}
            </div>
            <div className="text-xs text-gray-400 mt-1">{avgUnit}</div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon="🔥"
          label="Calories"
          value={calories > 0 ? calories : '—'}
          unit="kcal"
          color={`text-${accentColor}-600`}
        />
        <StatCard
          icon="⚡"
          label={maxLabel}
          value={maxDisplay}
          unit={maxUnit}
          color="text-gray-900"
        />
        <StatCard
          icon="⏱"
          label="Elapsed"
          value={formatDuration(timer.elapsedMs)}
          color="text-gray-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon="⛰️"
          label="Elev. Gain"
          value={`+${timer.elevGainM}`}
          unit="meters"
          color="text-green-600"
        />
        <StatCard
          icon="⬇️"
          label="Elev. Loss"
          value={`-${timer.elevLossM}`}
          unit="meters"
          color="text-red-500"
        />
      </div>

      {/* Elevation profile chart */}
      <ElevationChart profile={timer.elevationProfile} />

      {/* Splits */}
      <SplitsTable splits={timer.splits} mode={mode} />

      {/* Weather conditions during activity */}
      {currentWeather && (
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Conditions</div>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{currentWeather.temp}°</div>
              <div className="text-[10px] text-gray-400">{weatherDesc(currentWeather.code)}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{currentWeather.windSpeed}</div>
              <div className="text-[10px] text-gray-400">km/h wind</div>
            </div>
            {uv && (
              <div className="text-center">
                <div className={`text-lg font-bold ${uv.color}`}>{Math.round(currentWeather.uv)}</div>
                <div className="text-[10px] text-gray-400">UV {uv.label}</div>
              </div>
            )}
            {aqi && (
              <div className="text-center">
                <div className={`text-lg font-bold ${aqi.color}`}>{airQuality.usAqi}</div>
                <div className="text-[10px] text-gray-400">AQI {aqi.label}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-1 pb-2">
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

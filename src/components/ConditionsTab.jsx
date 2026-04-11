import { uvLabel } from '../utils/uvLabel'
import { aqiLabel } from '../utils/aqiLabel'
import { weatherIcon, weatherDesc } from '../utils/weatherIcon'
import { windDirLabel, calcWindAssist } from '../utils/windAssist'

function UVBar({ uv }) {
  // Map UV 0–12+ onto a color gradient bar
  const pct = Math.min(100, (uv / 12) * 100)
  const { label, color } = uvLabel(uv)
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className={`text-sm font-semibold ${color}`}>UV {Math.round(uv)} — {label}</span>
      </div>
      <div className="h-2 rounded-full bg-gradient-to-r from-green-300 via-yellow-300 via-orange-400 to-purple-500 relative">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-gray-400 rounded-full shadow"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>Low</span><span>Moderate</span><span>High</span><span>V.High</span><span>Extreme</span>
      </div>
    </div>
  )
}

function BeaufortDesc(windSpeed) {
  if (windSpeed < 2) return 'Calm'
  if (windSpeed < 6) return 'Light air'
  if (windSpeed < 12) return 'Light breeze'
  if (windSpeed < 20) return 'Gentle breeze'
  if (windSpeed < 29) return 'Moderate breeze'
  if (windSpeed < 39) return 'Fresh breeze'
  if (windSpeed < 50) return 'Strong breeze'
  return 'Near gale'
}

function SunProtectionTip(uv) {
  if (uv < 3) return { icon: '😎', text: 'No protection needed. Enjoy your ride!' }
  if (uv < 6) return { icon: '🧴', text: 'SPF 15+ recommended. Wear sunglasses.' }
  if (uv < 8) return { icon: '🧴', text: 'SPF 30+ required. Hat + sunglasses recommended.' }
  if (uv < 11) return { icon: '⚠️', text: 'SPF 50+ essential. Avoid 10am–3pm if possible.' }
  return { icon: '🚫', text: 'Extreme UV. Minimize time outdoors. Full protection.' }
}

function CurrentTimeCard({ currentWeather, airQuality, hourlyAqi }) {
  if (!currentWeather) return null

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const uv = uvLabel(currentWeather.uv)
  const wind = windDirLabel(currentWeather.windDir)
  const icon = weatherIcon(currentWeather.code)

  // Get current AQI from hourly data or airQuality object
  const currentHourKey = `${now.toISOString().split('T')[0]}T${String(now.getHours()).padStart(2, '0')}:00`
  const aqiValue = hourlyAqi?.[currentHourKey] ?? airQuality?.usAqi
  const aqi = aqiLabel(aqiValue)

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-card">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        🕐 Right Now — {timeStr}
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="text-3xl">{icon}</div>
        <div>
          <div className="text-lg font-bold text-gray-900">{currentWeather.temp}°C</div>
          <div className="text-sm text-gray-500">{weatherDesc(currentWeather.code)}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
          <div className={`text-lg font-bold ${uv.color}`}>{Math.round(currentWeather.uv)}</div>
          <div className="text-[10px] text-gray-400">UV {uv.label}</div>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
          <div className="text-lg font-bold text-gray-800">{currentWeather.windSpeed}</div>
          <div className="text-[10px] text-gray-400">{wind} wind</div>
        </div>
        {aqiValue != null && (
          <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
            <div className={`text-lg font-bold ${aqi.color}`}>{aqiValue}</div>
            <div className="text-[10px] text-gray-400">AQI {aqi.label}</div>
          </div>
        )}
      </div>
    </div>
  )
}


export default function ConditionsTab({ hourly, currentWeather, heading, mode, isToday, airQuality, hourlyAqi = {} }) {
  const currentHour = new Date().getHours()

  if (!currentWeather && !hourly.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 py-16">
        <div className="text-center">
          <div className="text-4xl mb-3">🌤️</div>
          <p className="text-sm">Loading conditions…</p>
        </div>
      </div>
    )
  }

  const uv = uvLabel(currentWeather?.uv)
  const icon = weatherIcon(currentWeather?.code)
  const windDir = currentWeather ? windDirLabel(currentWeather.windDir) : ''
  const tip = SunProtectionTip(currentWeather?.uv ?? 0)
  const beaufort = BeaufortDesc(currentWeather?.windSpeed ?? 0)

  // Wind assist for common headings
  const windAssistDirections = heading != null
    ? [{ label: 'Your heading', deg: heading }]
    : [
        { label: 'North ↑', deg: 0 },
        { label: 'East →', deg: 90 },
        { label: 'South ↓', deg: 180 },
        { label: 'West ←', deg: 270 },
      ]

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-4">

      {/* NOW card */}
      {currentWeather && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-card">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Now</div>

          {/* Hero temp + icon */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{icon}</span>
            <div>
              <div className="text-4xl font-black text-gray-900">{currentWeather.temp}°C</div>
              <div className="text-sm text-gray-500">{weatherDesc(currentWeather.code)}</div>
            </div>
          </div>

          {/* UV bar */}
          <UVBar uv={currentWeather.uv} />

          {/* Sun protection tip */}
          <div className="mt-3 flex items-start gap-2 bg-amber-50 rounded-xl px-3 py-2.5">
            <span className="text-base">{tip.icon}</span>
            <span className="text-xs text-amber-800">{tip.text}</span>
          </div>
        </div>
      )}

      {/* Wind card */}
      {currentWeather && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-card">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">💨 Wind</div>
          <div className="flex items-center gap-4 mb-3">
            <div>
              <span className="text-3xl font-black text-gray-900">{currentWeather.windSpeed}</span>
              <span className="text-base text-gray-400 ml-1.5">km/h</span>
            </div>
            <div className="ml-auto text-right">
              <div className="text-lg font-bold text-gray-700">{windDir}</div>
              <div className="text-xs text-gray-400">{beaufort}</div>
            </div>
          </div>

          {/* Wind compass rose indicator */}
          <div className="text-xs text-gray-400 mb-3">
            Wind coming from the <span className="font-semibold text-gray-600">{windDir}</span>
          </div>

          {/* Wind assist table */}
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {heading != null ? 'Wind assist for your heading' : 'Wind assist by direction'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {windAssistDirections.map(({ label, deg }) => {
                const assist = calcWindAssist(currentWeather.windSpeed, currentWeather.windDir, deg)
                const isPositive = assist >= 0
                return (
                  <div key={label} className={`rounded-xl px-3 py-2 flex items-center justify-between ${
                    isPositive ? 'bg-brand-50' : 'bg-red-50'
                  }`}>
                    <span className="text-xs text-gray-600">{label}</span>
                    <span className={`text-sm font-bold ${isPositive ? 'text-brand-600' : 'text-red-500'}`}>
                      {isPositive ? '+' : ''}{assist} km/h
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Current time details */}
      <CurrentTimeCard currentWeather={currentWeather} airQuality={airQuality} hourlyAqi={hourlyAqi} />

      {/* Hourly breakdown table */}
      {hourly.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-card">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            📅 Hourly Breakdown
          </div>
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-6 text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100">
              <span>Time</span>
              <span className="text-center">Temp</span>
              <span className="text-center">UV</span>
              <span className="text-center">Wind</span>
              <span className="text-center">Dir</span>
              <span className="text-center">AQI</span>
            </div>
            {hourly.map((h) => {
              const isCurrent = h.hour === currentHour
              const rowUv = uvLabel(h.uv)
              const rowAqi = hourlyAqi[h.time]
              const rowAqiInfo = aqiLabel(rowAqi)
              return (
                <div
                  key={h.time}
                  className={`grid grid-cols-6 py-1.5 text-sm rounded-lg px-1 transition-colors ${
                    isCurrent ? 'bg-brand-50 font-semibold' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-xs ${isCurrent ? 'text-brand-600 font-bold' : 'text-gray-500'}`}>
                    {isCurrent ? 'Now' : `${String(h.hour).padStart(2, '0')}:00`}
                  </span>
                  <span className="text-center text-xs text-gray-800">{h.temp}°</span>
                  <span className={`text-center text-xs font-semibold ${rowUv.color}`}>{Math.round(h.uv)}</span>
                  <span className="text-center text-xs text-gray-600">{h.windSpeed}</span>
                  <span className="text-center text-xs text-gray-400">{windDirLabel(h.windDir)}</span>
                  <span className={`text-center text-xs font-semibold ${rowAqiInfo.color}`}>{rowAqi != null ? rowAqi : '—'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

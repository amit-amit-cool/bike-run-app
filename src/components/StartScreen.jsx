import { uvLabel } from '../utils/uvLabel'
import { aqiLabel } from '../utils/aqiLabel'
import { weatherDesc, weatherIcon } from '../utils/weatherIcon'
import { windDirLabel } from '../utils/windAssist'

export default function StartScreen({ mode, currentWeather, gpsReady, gpsWaitSecs, onStart, airQuality }) {
  const uv = uvLabel(currentWeather?.uv)
  const icon = weatherIcon(currentWeather?.code)
  const windDir = currentWeather ? windDirLabel(currentWeather.windDir) : ''

  const isBike = mode === 'bike'
  const btnColor = 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-orange-500/30'

  const label = isBike ? 'ride' : 'run'

  // GPS status display
  const gpsStatus = gpsReady
    ? { text: 'GPS ready', color: 'text-brand-600 bg-brand-50', dot: 'bg-brand-500 gps-dot' }
    : gpsWaitSecs >= 10
      ? { text: 'No GPS — location from network', color: 'text-amber-600 bg-amber-50', dot: 'bg-amber-400' }
      : { text: `GPS acquiring… ${gpsWaitSecs > 0 ? `(${gpsWaitSecs}s)` : ''}`, color: 'text-gray-400 bg-gray-50', dot: 'bg-gray-300 animate-pulse' }

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-4">

      {/* Activity card */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${isBike ? 'bg-brand-50' : 'bg-orange-50'}`}>
              {isBike ? '🚴' : '🏃'}
            </div>
            <div>
              <h1 className={`text-xl font-bold ${isBike ? 'text-brand-600' : 'text-orange-600'}`}>
                Ready to {label}?
              </h1>
              <p className="text-gray-400 text-sm">{isBike ? 'Cycling' : 'Running'} · GPS tracking</p>
            </div>
          </div>
          {/* GPS pill */}
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full shrink-0 ${gpsStatus.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${gpsStatus.dot}`} />
            {gpsStatus.text}
          </div>
        </div>
      </div>

      {/* Current conditions */}
      {currentWeather ? (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-card">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Current Conditions</h3>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-4xl">{icon}</span>
            <div className="flex-1">
              <div className="text-2xl font-bold text-gray-900">{currentWeather.temp}°C</div>
              <div className="text-sm text-gray-500">{weatherDesc(currentWeather.code)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
              <div className={`text-sm font-bold ${uv.color}`}>UV {Math.round(currentWeather.uv)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{uv.label}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
              <div className="text-sm font-bold text-gray-800">{currentWeather.windSpeed} <span className="text-xs font-normal text-gray-400">km/h</span></div>
              <div className="text-xs text-gray-400">{windDir}</div>
            </div>
            {airQuality?.usAqi != null && (() => {
              const aqi = aqiLabel(airQuality.usAqi)
              return (
                <div className={`rounded-xl p-2.5 text-center ${aqi.bg}`}>
                  <div className={`text-sm font-bold ${aqi.color}`}>{aqi.emoji} AQI {airQuality.usAqi}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{aqi.label}</div>
                </div>
              )
            })()}
            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
              <div className={`text-sm font-bold ${currentWeather.uv < 6 ? 'text-brand-600' : currentWeather.uv < 8 ? 'text-amber-500' : 'text-red-500'}`}>
                {currentWeather.uv < 6 ? 'Good' : currentWeather.uv < 8 ? 'Caution' : 'Use SPF'}
              </div>
              <div className="text-xs text-gray-400">Conditions</div>
            </div>
          </div>
        </div>
      ) : (
        /* Skeleton while weather loads */
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-card">
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-3 h-3 border-2 border-brand-300 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading weather conditions…</span>
          </div>
        </div>
      )}

      {/* START button — always enabled */}
      <button
        onClick={onStart}
        className={`w-full py-4 rounded-2xl text-white text-lg font-bold tracking-wide shadow-lg transition-all duration-150 active:scale-[0.98] ${btnColor}`}
      >
        Start {isBike ? 'Ride' : 'Run'}
      </button>
    </div>
  )
}

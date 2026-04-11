import { useState } from 'react'
import { calcWindAssist, windDirLabel } from '../utils/windAssist'
import { uvLabel } from '../utils/uvLabel'
import { aqiLabel } from '../utils/aqiLabel'

function formatPace(speedKmh) {
  if (!speedKmh || speedKmh < 0.5) return '--\'--"'
  const secsPerKm = 3600 / speedKmh
  const mins = Math.floor(secsPerKm / 60)
  const secs = Math.round(secsPerKm % 60)
  return `${mins}'${String(secs).padStart(2, '0')}"`
}

function formatAvgPace(speedKmh) {
  if (!speedKmh) return '--:--'
  return formatPace(speedKmh)
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function ActiveScreen({ speedKmh, heading, currentWeather, mode, timer, activityState, onPause, onResume, onFinish, planDestCoords, planStats, position, airQuality }) {
  const isPaused = activityState === 'paused'
  const [showKmhOverride, setShowKmhOverride] = useState(mode === 'bike')

  const windAssist =
    currentWeather && heading != null
      ? calcWindAssist(currentWeather.windSpeed, currentWeather.windDir, heading)
      : null

  const showKmh = showKmhOverride

  const displaySpeed = showKmh
    ? (speedKmh != null ? speedKmh.toFixed(1) : '—')
    : formatPace(speedKmh)

  const speedUnit = showKmh ? 'km/h' : 'min/km'

  const avgDisplay = showKmh
    ? (timer.avgSpeedKmh != null ? `${timer.avgSpeedKmh}` : '—')
    : formatAvgPace(timer.avgSpeedKmh)

  const avgUnit = showKmh ? 'km/h' : 'min/km'

  const uv = uvLabel(currentWeather?.uv)
  const windDir = currentWeather ? windDirLabel(currentWeather.windDir) : ''

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-2 flex flex-col gap-2">

      {/* Status bar + controls */}
      <div className="flex items-center justify-between">
        {isPaused ? (
          <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full text-[11px] font-bold">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full paused-dot" />
            PAUSED
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-brand-50 text-brand-600 px-2.5 py-1 rounded-full text-[11px] font-bold">
            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full gps-dot" />
            {mode === 'bike' ? 'RIDING' : 'RUNNING'}
          </div>
        )}

        <div className="flex gap-2">
          {isPaused ? (
            <>
              <button onClick={onResume} className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-sm">
                ▶ Resume
              </button>
              <button onClick={onFinish} className="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                Finish
              </button>
            </>
          ) : (
            <>
              <button onClick={onPause} className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm">
                ⏸ Pause
              </button>
              <button onClick={onFinish} className="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Compact speed + key metrics in one card */}
      <div
        onClick={() => setShowKmhOverride((v) => !v)}
        className={`bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-card cursor-pointer active:scale-[0.99] transition-opacity ${isPaused ? 'opacity-60' : ''}`}
      >
        <div className="flex items-center justify-between">
          {/* Speed — left */}
          <div className="flex items-baseline gap-2">
            <span className="text-[40px] font-black text-gray-900 leading-none tabular-nums tracking-tight">
              {displaySpeed}
            </span>
            <span className="text-sm text-gray-400 font-medium">{speedUnit}</span>
          </div>

          {/* Wind assist — right */}
          {windAssist != null && (
            <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              windAssist >= 0 ? 'bg-brand-50 text-brand-600' : 'bg-red-50 text-red-500'
            }`}>
              {windAssist >= 0 ? '↑' : '↓'} {Math.abs(windAssist)} km/h
            </div>
          )}
        </div>
        <div className="text-[10px] text-gray-300 uppercase tracking-wider mt-0.5">
          tap to show {showKmh ? 'pace' : 'km/h'}
        </div>
      </div>

      {/* Distance to destination chip */}
      {planDestCoords && position && (() => {
        const distLeft = Math.round(haversineKm(position.lat, position.lon, planDestCoords.lat, planDestCoords.lon) * 10) / 10
        return (
          <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-sm">📍</span>
            <span className="text-xs font-bold text-orange-700">{distLeft} km</span>
            <span className="text-xs text-orange-500">to destination</span>
            {planStats && (
              <span className="ml-auto text-[10px] text-orange-400">{planStats.distanceKm} km total</span>
            )}
          </div>
        )
      })()}

      {/* Compact metrics grid — 3 columns */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-card">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">⏱ Time</div>
          <div className="text-lg font-bold text-gray-900 tabular-nums font-mono leading-tight mt-0.5">{timer.timeString}</div>
        </div>
        <div className="bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-card">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">📏 Distance</div>
          <div className="text-lg font-bold text-gray-900 tabular-nums leading-tight mt-0.5">
            {timer.totalDistanceKm > 0 ? timer.totalDistanceKm : '—'} <span className="text-xs font-normal text-gray-400">km</span>
          </div>
        </div>
        <div className="bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-card">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">📈 {showKmh ? 'Avg' : 'Pace'}</div>
          <div className="text-lg font-bold text-gray-900 tabular-nums leading-tight mt-0.5">
            {avgDisplay} <span className="text-xs font-normal text-gray-400">{avgUnit}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-card">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">⛰️ Climb</div>
          <div className="text-lg font-bold text-brand-600 tabular-nums leading-tight mt-0.5">
            +{timer.elevGainM > 0 ? timer.elevGainM : '0'}<span className="text-xs font-normal text-gray-400">m</span>
          </div>
        </div>
        <div className="bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-card">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">⬇️ Desc</div>
          <div className="text-lg font-bold text-orange-500 tabular-nums leading-tight mt-0.5">
            -{timer.elevLossM > 0 ? timer.elevLossM : '0'}<span className="text-xs font-normal text-gray-400">m</span>
          </div>
        </div>
        <div className="bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-card">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">💨 Wind</div>
          <div className="text-lg font-bold text-gray-900 tabular-nums leading-tight mt-0.5">
            {currentWeather?.windSpeed ?? '—'}<span className="text-xs font-normal text-gray-400"> {windDir}</span>
          </div>
        </div>
      </div>

      {/* Compact conditions strip */}
      {currentWeather && (
        <div className="bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-card flex items-center gap-3 text-xs">
          <span className={`font-semibold ${uv.color}`}>UV {Math.round(currentWeather.uv)}</span>
          <span className="w-px h-3 bg-gray-200" />
          <span className="text-gray-600">{currentWeather.temp}°C</span>
          {airQuality?.usAqi != null && (() => {
            const aqi = aqiLabel(airQuality.usAqi)
            return (
              <>
                <span className="w-px h-3 bg-gray-200" />
                <span className={`font-semibold ${aqi.color}`}>{aqi.emoji} AQI {airQuality.usAqi}</span>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

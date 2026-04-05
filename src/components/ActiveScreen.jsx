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
  // bike default: km/h (true), run default: pace (false)
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
  const speedLabel = showKmh ? 'Current Speed' : 'Current Pace'

  const avgDisplay = showKmh
    ? (timer.avgSpeedKmh != null ? `${timer.avgSpeedKmh}` : '—')
    : formatAvgPace(timer.avgSpeedKmh)

  const avgUnit = showKmh ? 'km/h' : 'min/km'
  const avgLabel = showKmh ? 'Avg Speed' : 'Avg Pace'

  const uv = uvLabel(currentWeather?.uv)
  const windDir = currentWeather ? windDirLabel(currentWeather.windDir) : ''

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-4 flex flex-col gap-3">

      {/* Status bar */}
      <div className="flex items-center justify-between">
        {isPaused ? (
          <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-xs font-bold">
            <div className="w-2 h-2 bg-orange-500 rounded-full paused-dot" />
            PAUSED
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-brand-50 text-brand-600 px-3 py-1.5 rounded-full text-xs font-bold">
            <div className="w-2 h-2 bg-brand-500 rounded-full gps-dot" />
            {mode === 'bike' ? 'RIDING' : 'RUNNING'}
          </div>
        )}

        <div className="flex gap-2">
          {isPaused ? (
            <>
              <button
                onClick={onResume}
                className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                ▶ Resume
              </button>
              <button
                onClick={onFinish}
                className="bg-red-50 hover:bg-red-100 text-red-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                Finish
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onPause}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
              >
                ⏸ Pause
              </button>
              <button
                onClick={onFinish}
                className="bg-red-50 hover:bg-red-100 text-red-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hero speed */}
      <div
        onClick={() => setShowKmhOverride((v) => !v)}
        className={`bg-white rounded-3xl p-6 border border-gray-100 shadow-card text-center transition-opacity duration-300 cursor-pointer active:scale-[0.98] ${isPaused ? 'opacity-60' : 'opacity-100'}`}
      >
        <div className="text-[64px] font-black text-gray-900 leading-none tabular-nums tracking-tight">
          {displaySpeed}
        </div>
        <div className="text-base text-gray-400 font-medium mt-1">{speedUnit}</div>
        <div className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">
          {speedLabel}
        </div>
        <div className="text-[10px] text-gray-300 mt-1.5 uppercase tracking-wider">
          tap to show {showKmh ? 'pace' : 'km/h'}
        </div>

        {/* Wind assist */}
        {windAssist != null && (
          <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold ${
            windAssist >= 0
              ? 'bg-brand-50 text-brand-600'
              : 'bg-red-50 text-red-500'
          }`}>
            {windAssist >= 0 ? '↑ Tailwind' : '↓ Headwind'} {Math.abs(windAssist)} km/h
          </div>
        )}
      </div>

      {/* Distance to destination chip */}
      {planDestCoords && position && (() => {
        const distLeft = Math.round(haversineKm(position.lat, position.lon, planDestCoords.lat, planDestCoords.lon) * 10) / 10
        return (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-2.5 flex items-center gap-3">
            <span className="text-base">📍</span>
            <div className="flex-1">
              <span className="text-sm font-bold text-orange-700">{distLeft} km</span>
              <span className="text-sm text-orange-500"> to destination</span>
            </div>
            {planStats && (
              <span className="text-xs text-orange-400 font-medium">{planStats.distanceKm} km total</span>
            )}
          </div>
        )
      })()}

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Time */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-card">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">⏱ Time</div>
          <div className="text-3xl font-bold text-gray-900 tabular-nums font-mono">{timer.timeString}</div>
          <div className="text-xs text-gray-400 mt-0.5">Active duration</div>
        </div>

        {/* Distance */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-card">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">📏 Distance</div>
          <div className="text-3xl font-bold text-gray-900 tabular-nums">
            {timer.totalDistanceKm > 0 ? timer.totalDistanceKm : '—'}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">km</div>
        </div>

        {/* Avg speed */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-card">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            📈 {avgLabel}
          </div>
          <div className="text-3xl font-bold text-gray-900 tabular-nums">
            {avgDisplay}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{avgUnit}</div>
        </div>

        {/* Wind */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-card">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">💨 Wind</div>
          <div className="text-3xl font-bold text-gray-900 tabular-nums">
            {currentWeather?.windSpeed ?? '—'}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">km/h {windDir}</div>
        </div>

        {/* Elevation gain */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-card">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">⛰️ Climbing</div>
          <div className="text-3xl font-bold text-brand-600 tabular-nums">
            +{timer.elevGainM > 0 ? timer.elevGainM : '0'}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">meters gained</div>
        </div>

        {/* Elevation loss */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-card">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">🏔️ Descending</div>
          <div className="text-3xl font-bold text-orange-500 tabular-nums">
            -{timer.elevLossM > 0 ? timer.elevLossM : '0'}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">meters lost</div>
        </div>
      </div>

      {/* Current UV/weather strip */}
      {currentWeather && (
        <div className="bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-card flex items-center gap-4 flex-wrap">
          <div className={`text-sm font-semibold ${uv.color}`}>☀️ UV {Math.round(currentWeather.uv)} — {uv.label}</div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="text-sm text-gray-600">{currentWeather.temp}°C</div>
          {airQuality?.usAqi != null && (() => {
            const aqi = aqiLabel(airQuality.usAqi)
            return (
              <>
                <div className="w-px h-4 bg-gray-200" />
                <div className={`text-sm font-semibold ${aqi.color}`}>{aqi.emoji} AQI {airQuality.usAqi}</div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

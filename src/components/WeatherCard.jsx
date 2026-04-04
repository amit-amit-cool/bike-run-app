import { uvLabel } from '../utils/uvLabel'
import { weatherIcon } from '../utils/weatherIcon'
import { windDirLabel } from '../utils/windAssist'

export default function WeatherCard({ hour, isCurrentHour }) {
  const uv = uvLabel(hour.uv)
  const icon = weatherIcon(hour.code)
  const windDir = windDirLabel(hour.windDir)
  const timeLabel = `${String(hour.hour).padStart(2, '0')}:00`

  if (isCurrentHour) {
    return (
      <div className="flex-shrink-0 w-[72px] rounded-2xl p-2.5 text-center bg-brand-500 shadow-lg shadow-brand-500/25">
        <div className="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-1.5">Now</div>
        <div className="text-xl mb-1">{icon}</div>
        <div className="text-base font-bold text-white mb-1">{hour.temp}°</div>
        <div className="text-[10px] font-semibold bg-white/20 text-white rounded-full px-1.5 py-0.5 mb-1.5">
          UV {Math.round(hour.uv)}
        </div>
        <div className="text-[10px] text-white/70">💨 {hour.windSpeed}</div>
        <div className="text-[10px] text-white/60">{windDir}</div>
      </div>
    )
  }

  return (
    <div className="flex-shrink-0 w-[72px] rounded-2xl p-2.5 text-center bg-white border border-gray-100 shadow-card hover:shadow-card-hover hover:border-gray-200 transition-all duration-200">
      <div className="text-[10px] font-medium text-gray-400 mb-1.5">{timeLabel}</div>
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-base font-bold text-gray-900 mb-1">{hour.temp}°</div>
      <div className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 mb-1.5 ${uv.bg} ${uv.color}`}>
        UV {Math.round(hour.uv)}
      </div>
      <div className="text-[10px] text-gray-400">💨 {hour.windSpeed}</div>
      <div className="text-[10px] text-gray-300">{windDir}</div>
    </div>
  )
}

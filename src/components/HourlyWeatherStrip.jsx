import { useEffect, useRef } from 'react'
import WeatherCard from './WeatherCard'

function formatDateChip(dateStr, index) {
  if (index === 0) return 'Today'
  if (index === 1) return 'Tomorrow'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function HourlyWeatherStrip({ hourly, loading, error, selectedDate, availableDates, onDateChange, isToday }) {
  const currentHour = new Date().getHours()
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!scrollRef.current || !hourly.length) return
    const highlightIndex = isToday
      ? hourly.findIndex((h) => h.hour === currentHour)
      : 0
    if (highlightIndex < 0) return
    const cardWidth = 80
    const containerWidth = scrollRef.current.clientWidth
    const scrollTarget = cardWidth * highlightIndex - containerWidth / 2 + cardWidth / 2
    scrollRef.current.scrollTo({ left: Math.max(0, scrollTarget), behavior: 'smooth' })
  }, [hourly, currentHour, isToday])

  const dateLabel = isToday
    ? "Today's Forecast"
    : (() => {
        const d = new Date(selectedDate + 'T12:00:00')
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      })()

  return (
    <div className="bg-white border-b border-gray-100">
      {/* Header row: label + spinner */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {dateLabel}
        </h2>
        {loading && (
          <div className="w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Date chip selector */}
      {availableDates?.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pt-2 pb-0">
          {availableDates.map((date, i) => {
            const isActive = date === selectedDate
            return (
              <button
                key={date}
                onClick={() => onDateChange(date)}
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  isActive
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {formatDateChip(date, i)}
              </button>
            )
          })}
        </div>
      )}

      {/* Loading state inline */}
      {loading && !hourly.length && (
        <div className="flex items-center gap-2 text-gray-400 px-4 py-4">
          <span className="text-sm">Loading weather...</span>
        </div>
      )}

      {/* Error state inline */}
      {error && !hourly.length && !loading && (
        <p className="text-sm text-red-500 px-4 py-3">⚠️ {error}</p>
      )}

      {/* Horizontal scroll */}
      {hourly.length > 0 && (
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3"
        >
          {hourly.map((hour) => (
            <WeatherCard
              key={hour.time}
              hour={hour}
              isCurrentHour={isToday && hour.hour === currentHour}
            />
          ))}
        </div>
      )}
    </div>
  )
}

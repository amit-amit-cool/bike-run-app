import { useState, useRef } from 'react'
import { usePlanRoute } from '../hooks/usePlanRoute'
import MapView from './MapView'

export default function PlanTab({ position, mode, onRouteReady, onStart }) {
  const [query, setQuery] = useState('')
  const [mapClickMode, setMapClickMode] = useState(false) // tap-to-set-dest mode
  const inputRef = useRef(null)
  const {
    search, searchByCoords, clear, loading, error,
    destCoords, destName, routeCoords, distanceKm, durationMin,
    viaPoints, addViaPoint, updateViaPoint, removeViaPoint,
  } = usePlanRoute()

  const isBike = mode === 'bike'
  const hasRoute = routeCoords.length > 1

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setMapClickMode(false)
    await search(query.trim(), position, mode)
  }

  const handleMapClick = async (lat, lng) => {
    if (!position) return
    if (!hasRoute) {
      // No dest yet — set destination
      await searchByCoords(lat, lng, position, mode)
      setMapClickMode(false)
    } else {
      // Route exists — add via waypoint
      await addViaPoint(lat, lng)
    }
  }

  const handleStart = () => {
    if (!hasRoute) return
    onRouteReady({ routeCoords, destCoords, destName, distanceKm, durationMin })
    onStart()
  }

  const handleClear = () => {
    clear()
    setQuery('')
    setMapClickMode(false)
    onRouteReady({ routeCoords: [], destCoords: null, destName: '', distanceKm: null, durationMin: null })
  }

  const formatDuration = (mins) => {
    if (mins < 60) return `~${mins} min`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `~${h}h ${m > 0 ? `${m}m` : ''}`
  }

  return (
    <div className="flex flex-col h-full">

      {/* Search bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Where do you want to go?"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold rounded-xl transition-colors"
          >
            {loading ? '…' : 'Go'}
          </button>
        </form>

        {error && (
          <p className="text-xs text-red-500 mt-2 px-1">⚠️ {error}</p>
        )}

        {/* Long-press-to-set hint */}
        {position && !hasRoute && (
          <p className="text-xs text-gray-400 mt-2 px-1 text-center">
            — or long press anywhere on the map to set your destination —
          </p>
        )}

        {/* Via-point hint when route exists */}
        {hasRoute && (
          <p className="text-xs text-gray-400 mt-2 px-1 text-center">
            Long press map to add a waypoint · drag <span className="text-orange-400 font-semibold">●</span> to move · tap <span className="text-orange-400 font-semibold">●</span> to remove
          </p>
        )}
      </div>

      {/* Map — full remaining height */}
      <div className="flex-1 relative min-h-0">
        {!position ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center px-8">
              <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Waiting for GPS to plan a route…</p>
            </div>
          </div>
        ) : (
          <MapView
            position={position}
            trail={[]}
            plannedRoute={routeCoords}
            planDestCoords={destCoords}
            onMapClick={handleMapClick}
            viaPoints={viaPoints}
            onViaPointDrag={updateViaPoint}
            onViaPointRemove={removeViaPoint}
          />
        )}

        {/* Loading overlay on map */}
        {loading && (
          <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="w-7 h-7 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500 font-medium">Finding route…</p>
            </div>
          </div>
        )}
      </div>

      {/* Route info + action */}
      <div className="bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-3">
        {hasRoute ? (
          <>
            {/* Stats card */}
            <div className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">📏</span>
                <span className="text-lg font-black text-gray-900">{distanceKm} km</span>
              </div>
              <div className="w-px h-5 bg-gray-200" />
              <div className="flex items-center gap-1.5">
                <span className="text-lg">⏱</span>
                <span className="text-base font-bold text-gray-700">{formatDuration(durationMin)}</span>
              </div>
              <div className="ml-auto text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {isBike ? '🚴 Cycling' : '🏃 Walking'} route
              </div>
            </div>

            {destName && (
              <p className="text-xs text-gray-400 text-center">To: <span className="font-semibold text-gray-600">{destName}</span></p>
            )}

            <button
              onClick={handleStart}
              className={`w-full py-4 rounded-2xl text-white text-base font-bold tracking-wide shadow-lg transition-all active:scale-95 ${
                isBike
                  ? 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/25'
                  : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25'
              }`}
            >
              Start {isBike ? 'Ride' : 'Run'} This Route
            </button>

            <button
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-gray-600 text-center transition-colors"
            >
              Clear route
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center py-2">
            {loading ? 'Finding best route…' : 'Search a destination or tap the map'}
          </p>
        )}
      </div>
    </div>
  )
}

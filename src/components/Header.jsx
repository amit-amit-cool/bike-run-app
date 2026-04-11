import { useState } from 'react'
import pkg from '../../package.json'

const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev'

export default function Header({ cityName, mode, onModeChange, onSearch, onUseGps, manualOverride, loading, latestRelease }) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    await onSearch(query.trim())
    setSearching(false)
    setShowSearch(false)
    setQuery('')
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-2xl mx-auto px-4">
        {/* Main row */}
        <div className="flex items-center justify-between h-14">
          {/* Location */}
          <button
            onClick={() => setShowSearch((s) => !s)}
            className="flex items-center gap-2 min-w-0 group"
          >
            <span className="text-brand-500 text-base">📍</span>
            <div className="min-w-0 text-left">
              <span className="text-gray-900 font-semibold text-base truncate block leading-tight group-hover:text-brand-500 transition-colors">
                {loading ? 'Locating...' : cityName || 'Detecting location...'}
              </span>
              {manualOverride ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onUseGps() }}
                  className="text-brand-500 text-xs font-medium hover:text-brand-600 transition-colors"
                >
                  ← Use my GPS location
                </button>
              ) : (
                <span className="text-gray-400 text-xs">Tap to change</span>
              )}
            </div>
          </button>

          {/* Android version / update icon */}
          {latestRelease.hasUpdate ? (
            <a
              href={latestRelease.url}
              title={`Download ${latestRelease.version}`}
              className="flex items-center gap-1 text-brand-500 hover:text-brand-600 transition-colors ml-2 shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.341A5.005 5.005 0 0 0 17 13H7a5.005 5.005 0 0 0-.523 2.341A2 2 0 0 0 5 17v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-1.477-1.659ZM8.5 9a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1Zm7 0a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1ZM6.05 8.64l1.2-2.08A6.994 6.994 0 0 1 12 5a6.994 6.994 0 0 1 4.75 1.56l1.2 2.08A7.01 7.01 0 0 0 12 6a7.01 7.01 0 0 0-5.95 2.64ZM4 8l-.6 1.04A7 7 0 0 0 5 20h14a7 7 0 0 0 1.6-10.96L20 8l-1.5-.87A9 9 0 0 0 12 4a9 9 0 0 0-6.5 3.13L4 8Z"/>
              </svg>
              <span className="text-[10px] font-medium">{latestRelease.version}</span>
            </a>
          ) : (
            <span className="flex items-center gap-1 text-gray-400 ml-2 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.341A5.005 5.005 0 0 0 17 13H7a5.005 5.005 0 0 0-.523 2.341A2 2 0 0 0 5 17v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-1.477-1.659ZM8.5 9a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1Zm7 0a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1ZM6.05 8.64l1.2-2.08A6.994 6.994 0 0 1 12 5a6.994 6.994 0 0 1 4.75 1.56l1.2 2.08A7.01 7.01 0 0 0 12 6a7.01 7.01 0 0 0-5.95 2.64ZM4 8l-.6 1.04A7 7 0 0 0 5 20h14a7 7 0 0 0 1.6-10.96L20 8l-1.5-.87A9 9 0 0 0 12 4a9 9 0 0 0-6.5 3.13L4 8Z"/>
              </svg>
              <span className="text-[10px] font-medium">v{pkg.version}</span>
            </span>
          )}

          {/* Mode toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1 ml-3 shrink-0">
            <button
              onClick={() => onModeChange('bike')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                mode === 'bike'
                  ? 'bg-white text-brand-600 shadow-card'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🚴 Bike
            </button>
            <button
              onClick={() => onModeChange('run')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                mode === 'run'
                  ? 'bg-white text-orange-600 shadow-card'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🏃 Run
            </button>
          </div>
        </div>

        {/* Version + build time */}
        <div className="text-[10px] text-gray-300 text-right pb-1 -mt-1 tabular-nums">
          v{pkg.version} · {new Date(buildTime).toLocaleString()}
        </div>

        {/* Expandable search */}
        {showSearch && (
          <div className="pb-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city or location..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
              <button
                type="submit"
                disabled={searching}
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {searching ? '...' : 'Go'}
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  )
}

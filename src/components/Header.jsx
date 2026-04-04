import { useState } from 'react'

export default function Header({ cityName, mode, onModeChange, onSearch, onUseGps, manualOverride, loading }) {
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

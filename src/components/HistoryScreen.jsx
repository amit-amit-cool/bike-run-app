import { useState } from 'react'

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m`
}

function formatPace(speedKmh) {
  if (!speedKmh || speedKmh < 0.5) return '--\'--"'
  const secsPerKm = 3600 / speedKmh
  const mins = Math.floor(secsPerKm / 60)
  const secs = Math.round(secsPerKm % 60)
  return `${mins}'${String(secs).padStart(2, '0')}"`
}

function formatDate(isoString) {
  const d = new Date(isoString)
  const now = new Date()
  const diff = now - d
  const days = Math.floor(diff / 86400000)

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function HistoryScreen({ activities, onDelete, onRename }) {
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  if (activities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 py-16">
        <div className="text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm font-medium">No activities yet</p>
          <p className="text-xs mt-1">Complete a ride or run to see it here</p>
        </div>
      </div>
    )
  }

  // Group activities by date
  const grouped = {}
  activities.forEach((a) => {
    const key = formatDate(a.date)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(a)
  })

  const handleStartEdit = (a) => {
    setEditingId(a.id)
    setEditTitle(a.title)
  }

  const handleSaveEdit = (id) => {
    if (editTitle.trim()) onRename(id, editTitle.trim())
    setEditingId(null)
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900">Activity History</h2>
        <span className="text-xs text-gray-400">{activities.length} {activities.length === 1 ? 'activity' : 'activities'}</span>
      </div>

      {/* Summary totals */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-card">
        <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
          <div>
            <div className="text-xl font-black text-brand-500 tabular-nums">
              {Math.round(activities.reduce((s, a) => s + (a.distanceKm || 0), 0) * 10) / 10}
            </div>
            <div className="text-[10px] text-gray-400">total km</div>
          </div>
          <div>
            <div className="text-xl font-black text-gray-900 tabular-nums">
              {activities.length}
            </div>
            <div className="text-[10px] text-gray-400">activities</div>
          </div>
          <div>
            <div className="text-xl font-black text-orange-500 tabular-nums">
              {formatDuration(activities.reduce((s, a) => s + (a.movingMs || 0), 0))}
            </div>
            <div className="text-[10px] text-gray-400">total time</div>
          </div>
        </div>
      </div>

      {/* Activity list grouped by date */}
      {Object.entries(grouped).map(([dateLabel, items]) => (
        <div key={dateLabel}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{dateLabel}</div>
          <div className="flex flex-col gap-2">
            {items.map((a) => {
              const isBike = a.mode === 'bike'
              const isExpanded = expandedId === a.id
              const isEditing = editingId === a.id
              const isConfirmingDelete = confirmDeleteId === a.id

              return (
                <div
                  key={a.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden"
                >
                  {/* Main row — tap to expand */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                    className="w-full p-4 flex items-center gap-3 text-left"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      isBike ? 'bg-brand-50' : 'bg-orange-50'
                    }`}>
                      {isBike ? '🚴' : '🏃'}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleSaveEdit(a.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(a.id) }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 w-full outline-none focus:border-brand-300"
                          autoFocus
                        />
                      ) : (
                        <div className="text-sm font-bold text-gray-900 truncate">{a.title}</div>
                      )}
                      <div className="text-[10px] text-gray-400">{formatTime(a.date)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-lg font-black tabular-nums ${isBike ? 'text-brand-500' : 'text-orange-500'}`}>
                        {a.distanceKm} <span className="text-xs font-normal text-gray-400">km</span>
                      </div>
                      <div className="text-[10px] text-gray-400">{formatDuration(a.movingMs || a.elapsedMs)}</div>
                    </div>
                    <svg className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-50">
                      <div className="grid grid-cols-3 gap-2 py-3">
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">Avg {isBike ? 'Speed' : 'Pace'}</div>
                          <div className="text-sm font-bold text-gray-800">
                            {isBike ? `${a.avgSpeedKmh || '—'} km/h` : formatPace(a.avgSpeedKmh)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">Max {isBike ? 'Speed' : 'Pace'}</div>
                          <div className="text-sm font-bold text-gray-800">
                            {isBike ? `${a.maxSpeedKmh || '—'} km/h` : formatPace(a.maxSpeedKmh)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">Calories</div>
                          <div className="text-sm font-bold text-gray-800">{a.calories || '—'} kcal</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">Elev. Gain</div>
                          <div className="text-sm font-bold text-green-600">+{a.elevGainM || 0}m</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">Elev. Loss</div>
                          <div className="text-sm font-bold text-red-500">-{a.elevLossM || 0}m</div>
                        </div>
                        {a.weather && (
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase">Weather</div>
                            <div className="text-sm font-bold text-gray-800">{a.weather.temp}° · {a.weather.wind} km/h</div>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2 border-t border-gray-50">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(a) }}
                          className="flex-1 py-2 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                          ✏️ Rename
                        </button>
                        {isConfirmingDelete ? (
                          <div className="flex-1 flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); onDelete(a.id); setConfirmDeleteId(null); setExpandedId(null) }}
                              className="flex-1 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}
                              className="flex-1 py-2 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(a.id) }}
                            className="flex-1 py-2 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

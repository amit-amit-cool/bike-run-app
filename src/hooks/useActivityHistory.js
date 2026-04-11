import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'bike-run-activity-history'

export function useActivityHistory() {
  const [activities, setActivities] = useState([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setActivities(JSON.parse(stored))
    } catch { /* ignore corrupt data */ }
  }, [])

  // Persist whenever activities change
  const persist = useCallback((updated) => {
    setActivities(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch { /* storage full — silently fail */ }
  }, [])

  const saveActivity = useCallback((activity) => {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: new Date().toISOString(),
      title: activity.title || (activity.mode === 'bike' ? 'Ride' : 'Run'),
      mode: activity.mode,
      distanceKm: activity.distanceKm,
      elapsedMs: activity.elapsedMs,
      movingMs: activity.movingMs,
      avgSpeedKmh: activity.avgSpeedKmh,
      maxSpeedKmh: activity.maxSpeedKmh,
      elevGainM: activity.elevGainM,
      elevLossM: activity.elevLossM,
      calories: activity.calories,
      splits: activity.splits,
      weather: activity.weather,
      aqi: activity.aqi,
    }
    persist([entry, ...activities])
    return entry
  }, [activities, persist])

  const deleteActivity = useCallback((id) => {
    persist(activities.filter((a) => a.id !== id))
  }, [activities, persist])

  const renameActivity = useCallback((id, newTitle) => {
    persist(activities.map((a) => a.id === id ? { ...a, title: newTitle } : a))
  }, [activities, persist])

  return { activities, saveActivity, deleteActivity, renameActivity }
}

import { useState, useEffect, useRef, useCallback } from 'react'

const ELEV_NOISE_THRESHOLD_M = 3   // GPS altitude is ±5-15m — ignore smaller changes
const MAX_DIST_PER_UPDATE_KM = 0.1 // max 100m per GPS tick
const GOOD_ACCURACY_M = 20         // only accumulate distance when GPS is this accurate

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function useActivityTimer(isGpsMoving, position, altitude, activityState) {
  const isRunning = activityState === 'active'

  const [elapsedMs, setElapsedMs] = useState(0)
  const [movingMs, setMovingMs] = useState(0)      // time actually moving (Strava "moving time")
  const [totalDistanceKm, setTotalDistanceKm] = useState(0)
  const [elevGainM, setElevGainM] = useState(0)
  const [elevLossM, setElevLossM] = useState(0)

  const intervalRef = useRef(null)
  const lastTickRef = useRef(null)
  const lastPositionRef = useRef(null)
  const lastAltitudeRef = useRef(null)
  const isGpsMovingRef = useRef(isGpsMoving)

  // Keep ref in sync so the interval always sees the latest value
  useEffect(() => { isGpsMovingRef.current = isGpsMoving }, [isGpsMoving])

  // Timer tick — counts total elapsed AND moving time
  useEffect(() => {
    if (isRunning) {
      lastTickRef.current = Date.now()
      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const delta = now - lastTickRef.current
        lastTickRef.current = now
        setElapsedMs((ms) => ms + delta)
        // Count as moving time only when GPS confirms movement
        // isGpsMoving is true even when speed is null (unknown = assume moving)
        if (isGpsMovingRef.current) {
          setMovingMs((ms) => ms + delta)
        }
      }, 500)
    } else {
      clearInterval(intervalRef.current)
      lastTickRef.current = null
    }
    return () => clearInterval(intervalRef.current)
  }, [isRunning])

  // Distance + elevation accumulation
  useEffect(() => {
    if (!position || !isRunning) {
      lastPositionRef.current = position
      if (altitude != null && lastAltitudeRef.current == null) lastAltitudeRef.current = altitude
      return
    }

    // Distance — only when GPS accuracy is good enough
    const prev = lastPositionRef.current
    if (prev) {
      const accuracyOk = position.accuracy == null || position.accuracy <= GOOD_ACCURACY_M
      if (accuracyOk) {
        const dist = haversineKm(prev.lat, prev.lon, position.lat, position.lon)
        if (dist > 0 && dist < MAX_DIST_PER_UPDATE_KM) {
          setTotalDistanceKm((d) => d + dist)
        }
      }
    }
    lastPositionRef.current = position

    // Elevation — only when GPS accuracy is reasonable (altitude is ±10-30m typically)
    if (altitude != null) {
      const accuracyOk = position.accuracy == null || position.accuracy <= 25
      const prevAlt = lastAltitudeRef.current
      if (prevAlt != null && accuracyOk) {
        const delta = altitude - prevAlt
        if (Math.abs(delta) >= ELEV_NOISE_THRESHOLD_M) {
          if (delta > 0) setElevGainM((g) => g + delta)
          else setElevLossM((l) => l + Math.abs(delta))
          lastAltitudeRef.current = altitude
        }
      } else if (prevAlt == null) {
        lastAltitudeRef.current = altitude
      }
    }
  }, [position, altitude, isRunning])

  const reset = useCallback(() => {
    setElapsedMs(0)
    setMovingMs(0)
    setTotalDistanceKm(0)
    setElevGainM(0)
    setElevLossM(0)
    lastPositionRef.current = null
    lastAltitudeRef.current = null
  }, [])

  const elapsedSec = Math.floor(elapsedMs / 1000)
  const h = Math.floor(elapsedSec / 3600)
  const m = Math.floor((elapsedSec % 3600) / 60)
  const s = elapsedSec % 60
  const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  // Avg speed = distance ÷ moving time (Strava method — excludes stops)
  const movingHours = movingMs / 3_600_000
  const avgSpeedKmh =
    movingHours > 0 && totalDistanceKm > 0
      ? Math.round((totalDistanceKm / movingHours) * 10) / 10
      : null

  return {
    timeString,
    elapsedMs,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    avgSpeedKmh,
    elevGainM: Math.round(elevGainM),
    elevLossM: Math.round(elevLossM),
    reset,
  }
}

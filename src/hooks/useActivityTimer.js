import { useState, useEffect, useRef, useCallback } from 'react'

const ELEV_NOISE_THRESHOLD_M = 3   // GPS altitude is ±5-15m — ignore smaller changes
const MAX_DIST_PER_UPDATE_KM = 0.5 // max 500m per GPS tick

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

export function useActivityTimer(isGpsMoving, position, altitude, activityState, speedKmh) {
  const isRunning = activityState === 'active'

  const [elapsedMs, setElapsedMs] = useState(0)
  const [movingMs, setMovingMs] = useState(0)      // time actually moving (Strava "moving time")
  const [totalDistanceKm, setTotalDistanceKm] = useState(0)
  const [elevGainM, setElevGainM] = useState(0)
  const [elevLossM, setElevLossM] = useState(0)
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(0)
  const [splits, setSplits] = useState([])          // per-km splits
  const [elevationProfile, setElevationProfile] = useState([]) // altitude samples

  const intervalRef = useRef(null)
  const lastTickRef = useRef(null)
  const lastPositionRef = useRef(null)
  const lastAltitudeRef = useRef(null)
  const isGpsMovingRef = useRef(isGpsMoving)
  const splitStartRef = useRef(0)       // distance at start of current km split
  const splitStartMsRef = useRef(0)     // movingMs at start of current km split

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

  // Max speed tracking
  useEffect(() => {
    if (!isRunning || speedKmh == null) return
    setMaxSpeedKmh((prev) => Math.max(prev, speedKmh))
  }, [speedKmh, isRunning])

  // Distance + elevation accumulation
  useEffect(() => {
    if (!position || !isRunning) {
      lastPositionRef.current = position
      if (altitude != null && lastAltitudeRef.current == null) lastAltitudeRef.current = altitude
      return
    }

    // Distance accumulation
    const prev = lastPositionRef.current
    if (prev) {
      const dist = haversineKm(prev.lat, prev.lon, position.lat, position.lon)
      if (dist > 0 && dist < MAX_DIST_PER_UPDATE_KM) {
        setTotalDistanceKm((d) => {
          const newDist = d + dist
          // Check if we crossed a km boundary for splits
          const prevKm = Math.floor(d)
          const newKm = Math.floor(newDist)
          if (newKm > prevKm && prevKm >= 0) {
            setSplits((s) => {
              const splitMs = movingMs - splitStartMsRef.current
              splitStartMsRef.current = movingMs
              splitStartRef.current = newKm
              return [...s, { km: newKm, movingMs: splitMs }]
            })
          }
          return newDist
        })
      }
    }
    lastPositionRef.current = position

    // Elevation accumulation
    if (altitude != null) {
      const prevAlt = lastAltitudeRef.current
      if (prevAlt != null) {
        const delta = altitude - prevAlt
        if (Math.abs(delta) >= ELEV_NOISE_THRESHOLD_M) {
          if (delta > 0) setElevGainM((g) => g + delta)
          else setElevLossM((l) => l + Math.abs(delta))
          lastAltitudeRef.current = altitude
        }
      } else if (prevAlt == null) {
        lastAltitudeRef.current = altitude
      }
      // Sample elevation profile (every position update)
      setElevationProfile((ep) => [...ep, Math.round(altitude)])
    }
  }, [position, altitude, isRunning, movingMs])

  const reset = useCallback(() => {
    setElapsedMs(0)
    setMovingMs(0)
    setTotalDistanceKm(0)
    setElevGainM(0)
    setElevLossM(0)
    setMaxSpeedKmh(0)
    setSplits([])
    setElevationProfile([])
    lastPositionRef.current = null
    lastAltitudeRef.current = null
    splitStartRef.current = 0
    splitStartMsRef.current = 0
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

  // Moving time formatted
  const movingSec = Math.floor(movingMs / 1000)
  const mh = Math.floor(movingSec / 3600)
  const mm = Math.floor((movingSec % 3600) / 60)
  const ms2 = movingSec % 60
  const movingTimeString = `${String(mh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ms2).padStart(2, '0')}`

  return {
    timeString,
    movingTimeString,
    elapsedMs,
    movingMs,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    avgSpeedKmh,
    maxSpeedKmh: Math.round(maxSpeedKmh * 10) / 10,
    elevGainM: Math.round(elevGainM),
    elevLossM: Math.round(elevLossM),
    splits,
    elevationProfile,
    reset,
  }
}

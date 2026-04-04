import { useState, useEffect, useRef, useCallback } from 'react'

const SPEED_THRESHOLD_KMH = 1.5
const MAX_JUMP_KM = 1.0       // discard jump > 1 km from last good fix
const MAX_ACCURACY_M = 35     // discard readings with > 35m horizontal error
const SPEED_WINDOW = 5        // readings to rolling-average for display speed

// Geographic fence — Israel + small border margin
const GEO_FENCE = { minLat: 29.4, maxLat: 33.4, minLon: 34.0, maxLon: 35.9 }

function inFence(lat, lon) {
  return lat >= GEO_FENCE.minLat && lat <= GEO_FENCE.maxLat &&
         lon >= GEO_FENCE.minLon && lon <= GEO_FENCE.maxLon
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function useGeolocation() {
  const [position, setPosition] = useState(null)
  const [speedKmh, setSpeedKmh] = useState(null)
  const [heading, setHeading] = useState(null)
  const [altitude, setAltitude] = useState(null)
  const [error, setError] = useState(null)
  const [isMoving, setIsMoving] = useState(false)
  const [gpsReady, setGpsReady] = useState(false)
  const [gpsWaitSecs, setGpsWaitSecs] = useState(0)

  const watchId = useRef(null)
  const stationaryTimer = useRef(null)
  const waitTimer = useRef(null)
  const waitCount = useRef(0)
  const lastGoodPos = useRef(null)
  const lastTimestamp = useRef(null)
  const speedBuffer = useRef([])

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.')
      return
    }

    lastGoodPos.current = null
    lastTimestamp.current = null
    speedBuffer.current = []
    waitCount.current = 0
    waitTimer.current = setInterval(() => {
      waitCount.current += 1
      setGpsWaitSecs(waitCount.current)
    }, 1000)

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        clearInterval(waitTimer.current)
        setGpsWaitSecs(0)

        const { latitude, longitude, accuracy, speed, heading: hdg, altitude: alt } = pos.coords

        // 1. Geographic fence
        if (!inFence(latitude, longitude)) return

        // 2. Accuracy gate — reject poor GPS signals
        //    Relax on very first fix so we get a starting point quickly
        const maxAcc = lastGoodPos.current ? MAX_ACCURACY_M : 60
        if (accuracy > maxAcc) return

        // 3. Jump filter — reject teleportation glitches
        if (lastGoodPos.current) {
          const jump = haversineKm(lastGoodPos.current.lat, lastGoodPos.current.lon, latitude, longitude)
          if (jump > MAX_JUMP_KM) return
        }

        // 4. Position-derived speed (more reliable than raw GPS speed in some conditions)
        let derivedKmh = null
        if (lastGoodPos.current && lastTimestamp.current) {
          const distKm = haversineKm(lastGoodPos.current.lat, lastGoodPos.current.lon, latitude, longitude)
          const dtSec = (pos.timestamp - lastTimestamp.current) / 1000
          if (dtSec > 0) derivedKmh = (distKm / dtSec) * 3600
        }

        lastGoodPos.current = { lat: latitude, lon: longitude, accuracy }
        lastTimestamp.current = pos.timestamp

        setPosition({ lat: latitude, lon: longitude, accuracy })
        setGpsReady(true)
        setError(null)

        if (alt != null) setAltitude(alt)
        if (hdg != null) setHeading(hdg)

        // 5. Best speed estimate: prefer GPS Doppler speed; fall back to position-derived
        const rawKmh = speed != null ? speed * 3.6
          : derivedKmh != null ? derivedKmh
          : null

        // 6. Rolling average for smooth display
        if (rawKmh != null) {
          speedBuffer.current.push(rawKmh)
          if (speedBuffer.current.length > SPEED_WINDOW) speedBuffer.current.shift()
        }
        const smoothed = speedBuffer.current.length
          ? Math.round(speedBuffer.current.reduce((a, b) => a + b, 0) / speedBuffer.current.length * 10) / 10
          : null

        setSpeedKmh(smoothed)

        // 7. isMoving uses raw speed so auto-pause stays responsive
        if (rawKmh == null || rawKmh >= SPEED_THRESHOLD_KMH) {
          clearTimeout(stationaryTimer.current)
          setIsMoving(true)
        } else {
          clearTimeout(stationaryTimer.current)
          stationaryTimer.current = setTimeout(() => setIsMoving(false), 3000)
        }
      },
      (err) => {
        setError(err.message)
        setGpsReady(false)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: Infinity }
    )
  }, [])

  const stop = useCallback(() => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    clearTimeout(stationaryTimer.current)
    clearInterval(waitTimer.current)
  }, [])

  useEffect(() => {
    start()
    return stop
  }, [start, stop])

  return { position, speedKmh, heading, altitude, isMoving, gpsReady, gpsWaitSecs, error }
}

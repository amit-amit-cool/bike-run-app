import { useState, useEffect, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

const SPEED_WINDOW = 5

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

function makeProcessor(setters) {
  const { setPosition, setSpeedKmh, setHeading, setAltitude, setError, setIsMoving, setGpsReady, setGpsWaitSecs } = setters
  const lastGoodPos = { current: null }
  const lastTimestamp = { current: null }
  const speedBuffer = { current: [] }
  const waitTimer = { current: null }
  const waitCount = { current: 0 }

  waitCount.current = 0
  waitTimer.current = setInterval(() => {
    waitCount.current += 1
    setGpsWaitSecs(waitCount.current)
  }, 1000)

  const process = (lat, lon, accuracy, speed, hdg, alt, timestamp) => {
    clearInterval(waitTimer.current)
    setGpsWaitSecs(0)

    let derivedKmh = null
    if (lastGoodPos.current && lastTimestamp.current) {
      const distKm = haversineKm(lastGoodPos.current.lat, lastGoodPos.current.lon, lat, lon)
      const dtSec = (timestamp - lastTimestamp.current) / 1000
      if (dtSec > 0) derivedKmh = (distKm / dtSec) * 3600
    }

    lastGoodPos.current = { lat, lon, accuracy }
    lastTimestamp.current = timestamp

    setPosition({ lat, lon, accuracy })
    setGpsReady(true)
    setError(null)
    if (alt != null) setAltitude(alt)
    if (hdg != null) setHeading(hdg)

    const rawKmh = speed != null && speed >= 0 ? speed * 3.6
      : derivedKmh != null ? derivedKmh
      : null

    if (rawKmh != null) {
      speedBuffer.current.push(rawKmh)
      if (speedBuffer.current.length > SPEED_WINDOW) speedBuffer.current.shift()
    }
    const smoothed = speedBuffer.current.length
      ? Math.round(speedBuffer.current.reduce((a, b) => a + b, 0) / speedBuffer.current.length * 10) / 10
      : null

    setSpeedKmh(smoothed)
    setIsMoving(true)
  }

  const cleanup = () => {
    clearInterval(waitTimer.current)
  }

  return { process, cleanup }
}

// ─── Native (Capacitor Android/iOS) ─────────────────────────────────────────
function useNativeGeolocation() {
  const [position, setPosition] = useState(null)
  const [speedKmh, setSpeedKmh] = useState(null)
  const [heading, setHeading] = useState(null)
  const [altitude, setAltitude] = useState(null)
  const [error, setError] = useState(null)
  const [isMoving, setIsMoving] = useState(false)
  const [gpsReady, setGpsReady] = useState(false)
  const [gpsWaitSecs, setGpsWaitSecs] = useState(0)
  const watchIdRef = useRef(null)
  const cleanupRef = useRef(null)
  const retryTimer = useRef(null)

  useEffect(() => {
    let cancelled = false

    const startWatch = async () => {
      // Clean up previous watch if retrying
      if (watchIdRef.current != null) {
        await Geolocation.clearWatch({ id: watchIdRef.current }).catch(() => {})
        watchIdRef.current = null
      }
      cleanupRef.current?.()

      try {
        const perm = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] })
        if (cancelled) return
        if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
          setError('Location permission denied')
          return
        }
      } catch {
        // Some devices don't need explicit request
      }

      const setters = { setPosition, setSpeedKmh, setHeading, setAltitude, setError, setIsMoving, setGpsReady, setGpsWaitSecs }
      const { process, cleanup } = makeProcessor(setters)
      cleanupRef.current = cleanup

      try {
        watchIdRef.current = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 30000 },
          (pos, err) => {
            if (cancelled) return
            if (err) {
              setError(err.message ?? 'GPS error')
              // Retry after 3s on error
              clearTimeout(retryTimer.current)
              retryTimer.current = setTimeout(() => {
                if (!cancelled) startWatch()
              }, 3000)
              return
            }
            if (!pos) return
            clearTimeout(retryTimer.current)
            const { latitude, longitude, accuracy, speed, heading: hdg, altitude: alt } = pos.coords
            process(latitude, longitude, accuracy, speed, hdg, alt, pos.timestamp)
          }
        )
      } catch (e) {
        setError(e.message ?? 'GPS unavailable')
        // Retry after 3s
        clearTimeout(retryTimer.current)
        retryTimer.current = setTimeout(() => {
          if (!cancelled) startWatch()
        }, 3000)
      }
    }

    startWatch()

    return () => {
      cancelled = true
      clearTimeout(retryTimer.current)
      cleanupRef.current?.()
      if (watchIdRef.current != null) {
        Geolocation.clearWatch({ id: watchIdRef.current })
      }
    }
  }, [])

  return { position, speedKmh, heading, altitude, isMoving, gpsReady, gpsWaitSecs, error }
}

// ─── Web (Browser) ────────────────────────────────────────────────────────────
function useWebGeolocation() {
  const [position, setPosition] = useState(null)
  const [speedKmh, setSpeedKmh] = useState(null)
  const [heading, setHeading] = useState(null)
  const [altitude, setAltitude] = useState(null)
  const [error, setError] = useState(null)
  const [isMoving, setIsMoving] = useState(false)
  const [gpsReady, setGpsReady] = useState(false)
  const [gpsWaitSecs, setGpsWaitSecs] = useState(0)
  const watchIdRef = useRef(null)
  const cleanupRef = useRef(null)
  const retryTimer = useRef(null)

  const start = useCallback(() => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return }

    const setters = { setPosition, setSpeedKmh, setHeading, setAltitude, setError, setIsMoving, setGpsReady, setGpsWaitSecs }
    const { process, cleanup } = makeProcessor(setters)
    cleanupRef.current = cleanup

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        clearTimeout(retryTimer.current)
        const { latitude, longitude, accuracy, speed, heading: hdg, altitude: alt } = pos.coords
        process(latitude, longitude, accuracy, speed, hdg, alt, pos.timestamp)
      },
      (err) => {
        setError(err.message)
        setGpsReady(false)
        // Retry after 3s — handles permission grant not restarting the watcher
        clearTimeout(retryTimer.current)
        retryTimer.current = setTimeout(() => {
          if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
          }
          cleanupRef.current?.()
          start()
        }, 3000)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    )
  }, [])

  const stop = useCallback(() => {
    clearTimeout(retryTimer.current)
    cleanupRef.current?.()
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  useEffect(() => { start(); return stop }, [start, stop])

  return { position, speedKmh, heading, altitude, isMoving, gpsReady, gpsWaitSecs, error }
}

// ─── Auto-select platform ────────────────────────────────────────────────────
const isNative = Capacitor.isNativePlatform()

export function useGeolocation() {
  const native = useNativeGeolocation()
  const web = useWebGeolocation()
  return isNative ? native : web
}

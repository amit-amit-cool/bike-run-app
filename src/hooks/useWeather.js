import { useState, useEffect, useRef } from 'react'

const REFETCH_INTERVAL_MS = 10 * 60 * 1000
const IP_GEO_DELAY_MS = 4000 // wait 4s for GPS, then try IP geolocation

async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: 'uv_index,temperature_2m,windspeed_10m,winddirection_10m,weathercode',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
    forecast_days: 7,
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error('Weather fetch failed')
  return res.json()
}

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.address?.city || data.address?.town || data.address?.village || data.address?.county || null
  } catch {
    return null
  }
}

async function geocodeCity(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.length) return null
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      name: data[0].display_name.split(',')[0],
    }
  } catch {
    return null
  }
}

// IP-based geolocation fallback — fires when GPS is unavailable
async function ipGeolocate() {
  try {
    const res = await fetch('https://ipapi.co/json/')
    if (!res.ok) return null
    const data = await res.json()
    if (!data.latitude || !data.longitude) return null
    return {
      lat: data.latitude,
      lon: data.longitude,
      name: data.city || data.region || 'Your location',
    }
  } catch {
    return null
  }
}

function parseHourly(data) {
  const { time, uv_index, temperature_2m, windspeed_10m, winddirection_10m, weathercode } = data.hourly
  return time.map((t, i) => ({
    time: t,
    hour: parseInt(t.split('T')[1]),
    uv: Math.round(uv_index[i] * 10) / 10,
    temp: Math.round(temperature_2m[i]),
    windSpeed: Math.round(windspeed_10m[i]),
    windDir: Math.round(winddirection_10m[i]),
    code: weathercode[i],
  }))
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function useWeather(gpsPosition) {
  const [allHourly, setAllHourly] = useState([])
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [cityName, setCityName] = useState('')
  const [coords, setCoords] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [manualOverride, setManualOverride] = useState(false)
  const timerRef = useRef(null)
  const ipFallbackTimer = useRef(null)
  const didLoadRef = useRef(false)

  const loadWeather = async (lat, lon, name = null) => {
    setLoading(true)
    setError(null)
    try {
      const weatherData = await fetchWeather(lat, lon)
      setAllHourly(parseHourly(weatherData))
      didLoadRef.current = true
      if (!name) {
        reverseGeocode(lat, lon).then((n) => { if (n) setCityName(n) })
      } else {
        setCityName(name)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const searchCity = async (query) => {
    setLoading(true)
    setError(null)
    try {
      const result = await geocodeCity(query)
      if (!result) { setError('City not found'); setLoading(false); return }
      setCoords({ lat: result.lat, lon: result.lon })
      setCityName(result.name)
      setManualOverride(true)
      await loadWeather(result.lat, result.lon, result.name)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  const useGpsLocation = () => setManualOverride(false)

  // Use GPS position when available and not manually overridden
  useEffect(() => {
    if (manualOverride || !gpsPosition) return
    const { lat, lon } = gpsPosition
    if (coords?.lat === lat && coords?.lon === lon) return
    clearTimeout(ipFallbackTimer.current) // GPS fired — cancel IP fallback
    setCoords({ lat, lon })
    loadWeather(lat, lon)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsPosition, manualOverride])

  // IP geolocation fallback: if GPS doesn't fire within 4s, use IP location
  useEffect(() => {
    if (manualOverride) return
    ipFallbackTimer.current = setTimeout(async () => {
      if (didLoadRef.current || manualOverride) return // GPS already loaded
      const result = await ipGeolocate()
      if (!result || didLoadRef.current || manualOverride) return
      setCoords({ lat: result.lat, lon: result.lon })
      setCityName(result.name)
      loadWeather(result.lat, result.lon, result.name)
    }, IP_GEO_DELAY_MS)
    return () => clearTimeout(ipFallbackTimer.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualOverride])

  // Periodic refetch
  useEffect(() => {
    if (!coords) return
    timerRef.current = setInterval(() => loadWeather(coords.lat, coords.lon), REFETCH_INTERVAL_MS)
    return () => clearInterval(timerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords])

  const hourly = allHourly.filter((h) => h.time.startsWith(selectedDate))
  const isToday = selectedDate === todayStr()
  const currentHour = new Date().getHours()
  const currentWeather = hourly.length
    ? (isToday ? hourly.find((h) => h.hour === currentHour) : hourly.find((h) => h.hour === 12)) || hourly[0]
    : null

  // Available dates (today + next 6 days, matching what API returned)
  const availableDates = [...new Set(allHourly.map((h) => h.time.split('T')[0]))].slice(0, 7)

  return {
    hourly, currentWeather, cityName, loading, error,
    searchCity, useGpsLocation, manualOverride,
    selectedDate, setSelectedDate, availableDates, isToday,
  }
}

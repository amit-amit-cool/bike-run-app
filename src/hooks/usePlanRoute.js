import { useState, useRef } from 'react'

async function geocodeDest(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
    { headers: { 'Accept-Language': 'en' } }
  )
  if (!res.ok) throw new Error('Geocoding failed')
  const data = await res.json()
  if (!data.length) throw new Error('Destination not found')
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    name: data[0].display_name.split(',')[0],
  }
}

async function reverseGeocode(lat, lon) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
    { headers: { 'Accept-Language': 'en' } }
  )
  if (!res.ok) return 'Selected location'
  const data = await res.json()
  return data.display_name?.split(',')[0] ?? 'Selected location'
}

// Build OSRM URL with optional via points: from;via1;via2;...;dest
async function fetchRoute(fromLat, fromLon, toLat, toLon, mode, viaPoints = []) {
  const profile = mode === 'run' ? 'foot' : 'bike'
  const waypoints = [
    [fromLon, fromLat],
    ...viaPoints.map(p => [p.lon, p.lat]),
    [toLon, toLat],
  ]
  const coordStr = waypoints.map(([lon, lat]) => `${lon},${lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coordStr}?geometries=geojson&overview=full`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Routing failed')
  const data = await res.json()
  if (!data.routes?.length) throw new Error('No route found')
  const route = data.routes[0]
  // OSRM returns [lon, lat] — flip to [lat, lon] for Leaflet
  const coords = route.geometry.coordinates.map(([lon, lat]) => [lat, lon])
  return {
    coords,
    distanceKm: Math.round(route.distance / 100) / 10,
    durationMin: Math.round(route.duration / 60),
  }
}

export function usePlanRoute() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [destCoords, setDestCoords] = useState(null)
  const [destName, setDestName] = useState('')
  const [routeCoords, setRouteCoords] = useState([])
  const [distanceKm, setDistanceKm] = useState(null)
  const [durationMin, setDurationMin] = useState(null)
  const [viaPoints, setViaPoints] = useState([]) // [{lat, lon}]

  // Keep refs so recalcRoute can always see latest values
  const fromPosRef = useRef(null)
  const modeRef = useRef('bike')
  const destCoordsRef = useRef(null)
  const viaPointsRef = useRef([])

  const recalcRoute = async (from, dest, via, mode) => {
    if (!from || !dest) return
    setLoading(true)
    setError(null)
    try {
      const route = await fetchRoute(from.lat, from.lon, dest.lat, dest.lon, mode, via)
      setRouteCoords(route.coords)
      setDistanceKm(route.distanceKm)
      setDurationMin(route.durationMin)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const search = async (query, fromPos, mode) => {
    if (!fromPos) { setError('GPS position required'); return }
    fromPosRef.current = fromPos
    modeRef.current = mode
    setLoading(true)
    setError(null)
    try {
      const dest = await geocodeDest(query)
      const newVia = []
      setViaPoints(newVia)
      viaPointsRef.current = newVia
      const route = await fetchRoute(fromPos.lat, fromPos.lon, dest.lat, dest.lon, mode, newVia)
      setDestCoords({ lat: dest.lat, lon: dest.lon })
      destCoordsRef.current = { lat: dest.lat, lon: dest.lon }
      setDestName(dest.name)
      setRouteCoords(route.coords)
      setDistanceKm(route.distanceKm)
      setDurationMin(route.durationMin)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Set destination by clicking map coords (reverse geocode + route)
  const searchByCoords = async (lat, lon, fromPos, mode) => {
    if (!fromPos) { setError('GPS position required'); return }
    fromPosRef.current = fromPos
    modeRef.current = mode
    setLoading(true)
    setError(null)
    try {
      const name = await reverseGeocode(lat, lon)
      const dest = { lat, lon }
      const newVia = []
      setViaPoints(newVia)
      viaPointsRef.current = newVia
      const route = await fetchRoute(fromPos.lat, fromPos.lon, lat, lon, mode, newVia)
      setDestCoords(dest)
      destCoordsRef.current = dest
      setDestName(name)
      setRouteCoords(route.coords)
      setDistanceKm(route.distanceKm)
      setDurationMin(route.durationMin)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Add a via waypoint at the end of the via list (from map tap on existing route)
  const addViaPoint = async (lat, lon) => {
    const from = fromPosRef.current
    const dest = destCoordsRef.current
    const mode = modeRef.current
    if (!from || !dest) return
    const newVia = [...viaPointsRef.current, { lat, lon }]
    setViaPoints(newVia)
    viaPointsRef.current = newVia
    await recalcRoute(from, dest, newVia, mode)
  }

  // Called when a via marker is dragged to a new position
  const updateViaPoint = async (index, lat, lon) => {
    const from = fromPosRef.current
    const dest = destCoordsRef.current
    const mode = modeRef.current
    if (!from || !dest) return
    const newVia = viaPointsRef.current.map((p, i) => i === index ? { lat, lon } : p)
    setViaPoints(newVia)
    viaPointsRef.current = newVia
    await recalcRoute(from, dest, newVia, mode)
  }

  // Remove a via waypoint by index
  const removeViaPoint = async (index) => {
    const from = fromPosRef.current
    const dest = destCoordsRef.current
    const mode = modeRef.current
    if (!from || !dest) return
    const newVia = viaPointsRef.current.filter((_, i) => i !== index)
    setViaPoints(newVia)
    viaPointsRef.current = newVia
    await recalcRoute(from, dest, newVia, mode)
  }

  const clear = () => {
    setDestCoords(null)
    setDestName('')
    setRouteCoords([])
    setDistanceKm(null)
    setDurationMin(null)
    setViaPoints([])
    setError(null)
    destCoordsRef.current = null
    viaPointsRef.current = []
  }

  return {
    search, searchByCoords, clear, loading, error,
    destCoords, destName, routeCoords, distanceKm, durationMin,
    viaPoints, addViaPoint, updateViaPoint, removeViaPoint,
  }
}

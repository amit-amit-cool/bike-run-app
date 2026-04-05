import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Live position marker — pulsing dot with heading arrow
function makeLiveDot(heading) {
  const arrow = heading != null
    ? `<div style="
        position:absolute; top:50%; left:50%;
        width:0; height:0;
        transform: translate(-50%, -180%) rotate(${heading}deg);
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-bottom: 9px solid #00b55e;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
      "></div>`
    : ''

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative; width:26px; height:26px;">
        <div style="
          position:absolute; inset:0;
          background: rgba(0,181,94,0.18);
          border-radius:50%;
          animation: pulse-ring 1.8s ease-out infinite;
        "></div>
        <div style="
          position:absolute; top:50%; left:50%;
          transform: translate(-50%,-50%);
          width:16px; height:16px;
          background: #00b55e;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          z-index:2;
        "></div>
        ${arrow}
      </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

// Finish/destination marker
const finishIcon = L.divIcon({
  className: '',
  html: `
    <div style="display:flex; flex-direction:column; align-items:center;">
      <div style="
        background: #f97316;
        color: white;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.05em;
        padding: 3px 7px;
        border-radius: 6px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        line-height: 1.4;
      ">FINISH 🏁</div>
      <div style="width:2px;height:8px;background:#f97316;margin-top:-1px;"></div>
      <div style="width:8px;height:8px;background:#f97316;border-radius:50%;margin-top:-1px;"></div>
    </div>`,
  iconSize: [64, 34],
  iconAnchor: [32, 34],
})

// Start flag marker
const startIcon = L.divIcon({
  className: '',
  html: `
    <div style="display:flex; flex-direction:column; align-items:center;">
      <div style="
        background: #1a1a2e;
        color: white;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.05em;
        padding: 3px 7px;
        border-radius: 6px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        line-height: 1.4;
      ">START</div>
      <div style="
        width: 2px; height: 8px;
        background: #1a1a2e;
        margin-top: -1px;
      "></div>
      <div style="
        width: 8px; height: 8px;
        background: #1a1a2e;
        border-radius: 50%;
        margin-top: -1px;
      "></div>
    </div>`,
  iconSize: [48, 34],
  iconAnchor: [24, 34],
})

function AutoCenter({ position }) {
  const map = useMap()
  const lastCenter = useRef(null)

  useEffect(() => {
    if (!position) return
    const { lat, lon } = position
    if (
      lastCenter.current &&
      Math.abs(lastCenter.current[0] - lat) < 0.0002 &&
      Math.abs(lastCenter.current[1] - lon) < 0.0002
    ) return
    lastCenter.current = [lat, lon]
    map.panTo([lat, lon], { animate: true, duration: 0.5 })
  }, [position, map])

  return null
}

// Via-point marker — draggable orange dot
function makeViaIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 18px; height: 18px;
        background: #f97316;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: grab;
      "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

const viaIcon = makeViaIcon()

// Simple single-tap handler — used when tap-to-place mode is active
function MapTapHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Long-press handler: attaches native touch/mouse events directly to the
// map container — bypasses Leaflet's synthetic event layer which swallows
// touchstart/contextmenu on many mobile browsers.
const LONG_PRESS_MS = 600

function MapLongPressHandler({ onMapClick }) {
  const map = useMap()
  const timerRef = useRef(null)
  const movedRef = useRef(false)
  const startPtRef = useRef(null)

  useEffect(() => {
    const container = map.getContainer()

    const cancel = () => {
      clearTimeout(timerRef.current)
    }

    // ── Touch (mobile) ──────────────────────────────────────
    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return
      movedRef.current = false
      const t = e.touches[0]
      const rect = container.getBoundingClientRect()
      startPtRef.current = L.point(t.clientX - rect.left, t.clientY - rect.top)
      timerRef.current = setTimeout(() => {
        if (!movedRef.current && startPtRef.current) {
          const latlng = map.containerPointToLatLng(startPtRef.current)
          onMapClick(latlng.lat, latlng.lng)
        }
      }, LONG_PRESS_MS)
    }

    const onTouchMove = (e) => {
      // cancel if finger moves more than ~10px
      if (startPtRef.current && e.touches.length === 1) {
        const t = e.touches[0]
        const rect = container.getBoundingClientRect()
        const dx = t.clientX - rect.left - startPtRef.current.x
        const dy = t.clientY - rect.top - startPtRef.current.y
        if (Math.sqrt(dx * dx + dy * dy) > 10) {
          movedRef.current = true
          cancel()
        }
      }
    }

    const onTouchEnd = () => cancel()
    const onTouchCancel = () => cancel()

    // Prevent browser context-menu popup from appearing on long press
    const onContextMenu = (e) => e.preventDefault()

    // ── Mouse (desktop fallback) ─────────────────────────────
    const onMouseDown = (e) => {
      movedRef.current = false
      startPtRef.current = L.point(e.offsetX, e.offsetY)
      timerRef.current = setTimeout(() => {
        if (!movedRef.current && startPtRef.current) {
          const latlng = map.containerPointToLatLng(startPtRef.current)
          onMapClick(latlng.lat, latlng.lng)
        }
      }, LONG_PRESS_MS)
    }

    const onMouseMove = (e) => {
      if (!startPtRef.current) return
      const dx = e.offsetX - startPtRef.current.x
      const dy = e.offsetY - startPtRef.current.y
      if (Math.sqrt(dx * dx + dy * dy) > 10) { movedRef.current = true; cancel() }
    }

    const onMouseUp = () => cancel()

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: true })
    container.addEventListener('touchend', onTouchEnd)
    container.addEventListener('touchcancel', onTouchCancel)
    container.addEventListener('contextmenu', onContextMenu)
    container.addEventListener('mousedown', onMouseDown)
    container.addEventListener('mousemove', onMouseMove)
    container.addEventListener('mouseup', onMouseUp)

    return () => {
      cancel()
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('touchcancel', onTouchCancel)
      container.removeEventListener('contextmenu', onContextMenu)
      container.removeEventListener('mousedown', onMouseDown)
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mouseup', onMouseUp)
    }
  }, [map, onMapClick])

  return null
}

function FitTrail({ trail }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (fitted.current || trail.length < 2) return
    try {
      map.fitBounds(L.latLngBounds(trail), { padding: [40, 40], maxZoom: 16 })
      fitted.current = true
    } catch {/* ignore */}
  }, [trail, map])

  return null
}

export default function MapView({ position, trail, compact = false, heading, plannedRoute = [], planDestCoords = null, onMapClick, tapToPlace = false, viaPoints = [], onViaPointDrag, onViaPointRemove }) {
  const defaultCenter = [32.08, 34.78]
  const center = position ? [position.lat, position.lon] : defaultCenter
  const hasTrail = trail.length >= 2
  const startPoint = hasTrail ? trail[0] : null
  const liveDot = makeLiveDot(heading ?? null)

  return (
    <div className={`relative w-full ${compact ? 'h-48' : 'flex-1 min-h-[320px]'}`}>

      {/* Pulse keyframe injected once */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

      {/* GPS coords chip */}
      {position && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-gray-200 shadow-sm">
          <span className="text-[11px] text-gray-500 font-medium tabular-nums">
            {position.lat.toFixed(5)}, {position.lon.toFixed(5)}
          </span>
        </div>
      )}

      {/* Distance chip over map when trail exists */}
      {hasTrail && !compact && (
        <div className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-gray-200 shadow-sm">
          <span className="text-[11px] font-semibold text-brand-600">📍 Route</span>
        </div>
      )}

      {!position && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-gray-50/80 backdrop-blur-sm rounded-2xl">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Waiting for GPS...</p>
          </div>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%', minHeight: compact ? '192px' : '320px' }}
        zoomControl={!compact}
      >
        {/* CartoDB Voyager — rich colours, clean labels */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        {position && (
          <>
            <AutoCenter position={position} />
            <Marker position={[position.lat, position.lon]} icon={liveDot} />
          </>
        )}

        {/* Planned route — dashed gray underlay */}
        {plannedRoute.length >= 2 && (
          <Polyline
            positions={plannedRoute}
            pathOptions={{ color: '#6b7280', weight: 3, dashArray: '8 6', opacity: 0.7, lineCap: 'round', lineJoin: 'round' }}
          />
        )}

        {/* Tap/click handler (Plan tab only) */}
        {onMapClick && tapToPlace && <MapTapHandler onMapClick={onMapClick} />}
        {onMapClick && !tapToPlace && <MapLongPressHandler onMapClick={onMapClick} />}

        {/* Destination marker */}
        {planDestCoords && (
          <Marker position={[planDestCoords.lat, planDestCoords.lon]} icon={finishIcon} />
        )}

        {/* Draggable via-point markers */}
        {viaPoints.map((pt, i) => (
          <Marker
            key={i}
            position={[pt.lat, pt.lon]}
            icon={viaIcon}
            draggable
            eventHandlers={{
              dragend(e) {
                const { lat, lng } = e.target.getLatLng()
                onViaPointDrag && onViaPointDrag(i, lat, lng)
              },
              click() {
                onViaPointRemove && onViaPointRemove(i)
              },
            }}
          />
        ))}

        {/* Route — white casing + coloured fill (Strava/Komoot style) */}
        {hasTrail && (
          <>
            {/* Shadow/casing layer */}
            <Polyline
              positions={trail}
              pathOptions={{ color: 'white', weight: 9, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
            />
            {/* Coloured route */}
            <Polyline
              positions={trail}
              pathOptions={{ color: '#00b55e', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
            />
            {/* Glow pulse on top */}
            <Polyline
              positions={trail}
              pathOptions={{ color: '#00ff88', weight: 3, opacity: 0.35, lineCap: 'round', lineJoin: 'round' }}
            />
          </>
        )}

        {/* Start pin */}
        {startPoint && (
          <Marker position={startPoint} icon={startIcon} />
        )}

        {/* Fit map to full trail when viewing summary (no live position tracking) */}
        {hasTrail && !position && (
          <FitTrail trail={trail} />
        )}

        {/* Fit map to planned route when shown in Plan tab */}
        {!hasTrail && plannedRoute.length >= 2 && (
          <FitTrail trail={plannedRoute} />
        )}
      </MapContainer>
    </div>
  )
}

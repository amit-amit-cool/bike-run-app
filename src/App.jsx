import { useState, useEffect, useRef } from 'react'
import Header from './components/Header'
import HourlyWeatherStrip from './components/HourlyWeatherStrip'
import StartScreen from './components/StartScreen'
import ActiveScreen from './components/ActiveScreen'
import SummaryScreen from './components/SummaryScreen'
import ConditionsTab from './components/ConditionsTab'
import PlanTab from './components/PlanTab'
import MapView from './components/MapView'
import { useGeolocation } from './hooks/useGeolocation'
import { useWeather } from './hooks/useWeather'
import { useActivityTimer } from './hooks/useActivityTimer'
import { useUpdateCheck } from './hooks/useUpdateCheck'

const MAX_TRAIL = 500

export default function App() {
  const [mode, setMode] = useState('bike')
  const [activityState, setActivityState] = useState('idle') // idle | active | paused | finished
  const [activeTab, setActiveTab] = useState('activity')     // activity | plan | conditions
  const [trail, setTrail] = useState([])

  // Planned route state
  const [plannedRoute, setPlannedRoute] = useState([])
  const [planDestCoords, setPlanDestCoords] = useState(null)
  const [planDestName, setPlanDestName] = useState('')
  const [planStats, setPlanStats] = useState(null)

  const { position, speedKmh, heading, altitude, isMoving, gpsReady, gpsWaitSecs, error: gpsError } =
    useGeolocation()
  const {
    hourly, currentWeather, cityName, loading, error: weatherError,
    searchCity, useGpsLocation, manualOverride,
    selectedDate, setSelectedDate, availableDates, isToday,
  } = useWeather(position)
  const timer = useActivityTimer(isMoving, position, altitude, activityState)
  const updateUrl = useUpdateCheck()

  // Accumulate trail during active/paused states
  const lastTrailPos = useRef(null)
  useEffect(() => {
    if (!position || activityState === 'idle' || activityState === 'finished') return
    const point = [position.lat, position.lon]
    const prev = lastTrailPos.current
    if (
      !prev ||
      Math.abs(prev[0] - point[0]) > 0.00005 ||
      Math.abs(prev[1] - point[1]) > 0.00005
    ) {
      lastTrailPos.current = point
      setTrail((t) => {
        const next = [...t, point]
        return next.length > MAX_TRAIL ? next.slice(-MAX_TRAIL) : next
      })
    }
  }, [position, activityState])

  const handleStart = () => {
    timer.reset()
    setTrail([])
    lastTrailPos.current = null
    setActivityState('active')
    setActiveTab('activity')
  }

  const handlePause = () => setActivityState('paused')
  const handleResume = () => setActivityState('active')
  const handleFinish = () => { setActivityState('finished'); setActiveTab('activity') }

  // "Back to Home" from summary — preserve idle state, show conditions can still be seen
  const handleHome = () => {
    setActivityState('idle')
    setActiveTab('activity')
  }

  const handleRouteReady = ({ routeCoords, destCoords, destName, distanceKm, durationMin }) => {
    setPlannedRoute(routeCoords)
    setPlanDestCoords(destCoords)
    setPlanDestName(destName)
    setPlanStats(distanceKm != null ? { distanceKm, durationMin } : null)
  }

  // "Start New Activity" — full reset
  const handleNewActivity = () => {
    timer.reset()
    setTrail([])
    lastTrailPos.current = null
    setPlannedRoute([])
    setPlanDestCoords(null)
    setPlanDestName('')
    setPlanStats(null)
    setActivityState('idle')
    setActiveTab('activity')
  }

  const isTracking = activityState === 'active' || activityState === 'paused'
  const isFinished = activityState === 'finished'

  // Tab bar items
  const tabs = [
    { id: 'activity', label: isTracking ? (mode === 'bike' ? 'Ride' : 'Run') : 'Activity', icon: mode === 'bike' ? '🚴' : '🏃' },
    { id: 'plan', label: 'Plan', icon: '🗺️' },
    { id: 'conditions', label: 'Conditions', icon: '🌤' },
  ]

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">

      {/* Header — always visible */}
      <Header
        cityName={cityName}
        mode={mode}
        onModeChange={(m) => { if (activityState === 'idle') setMode(m) }}
        onSearch={searchCity}
        onUseGps={useGpsLocation}
        manualOverride={manualOverride}
        loading={loading}
      />

      {/* GPS error banner (only in idle/not-started state) */}
      {gpsError && activityState === 'idle' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-700 text-xs text-center">
          ⚠️ {gpsError}
        </div>
      )}

      {/* Update available banner */}
      {updateUrl && (
        <a
          href={updateUrl}
          className="flex items-center justify-center gap-2 bg-brand-500 px-4 py-2.5 text-white text-sm font-semibold text-center"
        >
          🆕 New version available — tap to download
        </a>
      )}

      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto pb-16">

        {/* ── PLAN TAB ────────────────────────────────────── */}
        {activeTab === 'plan' && (
          <div className="flex flex-col" style={{ height: 'calc(100dvh - 112px)' }}>
            <PlanTab
              position={position}
              mode={mode}
              onRouteReady={handleRouteReady}
              onStart={handleStart}
            />
          </div>
        )}

        {/* ── CONDITIONS TAB ─────────────────────────────── */}
        {activeTab === 'conditions' && (
          <>
            <HourlyWeatherStrip hourly={hourly} loading={loading} error={weatherError} selectedDate={selectedDate} availableDates={availableDates} onDateChange={setSelectedDate} isToday={isToday} />
            <ConditionsTab
              hourly={hourly}
              currentWeather={currentWeather}
              heading={heading}
              mode={mode}
              isToday={isToday}
            />
          </>
        )}

        {/* ── ACTIVITY TAB ────────────────────────────────── */}
        {activeTab === 'activity' && (
          <>
            {/* IDLE */}
            {activityState === 'idle' && (
              <>
                <HourlyWeatherStrip hourly={hourly} loading={loading} error={weatherError} selectedDate={selectedDate} availableDates={availableDates} onDateChange={setSelectedDate} isToday={isToday} />
                <StartScreen
                  mode={mode}
                  currentWeather={currentWeather}
                  gpsReady={gpsReady}
                  gpsWaitSecs={gpsWaitSecs}
                  onStart={handleStart}
                />
                <div className="px-4 pb-4">
                  <div className="rounded-3xl overflow-hidden shadow-card border border-gray-100" style={{ height: 200 }}>
                    <MapView position={position} trail={[]} heading={heading} plannedRoute={plannedRoute} planDestCoords={planDestCoords} compact />
                  </div>
                </div>
              </>
            )}

            {/* ACTIVE / PAUSED */}
            {isTracking && (
              <>
                <ActiveScreen
                  speedKmh={speedKmh}
                  heading={heading}
                  currentWeather={currentWeather}
                  mode={mode}
                  timer={timer}
                  activityState={activityState}
                  onPause={handlePause}
                  onResume={handleResume}
                  onFinish={handleFinish}
                  planDestCoords={planDestCoords}
                  planStats={planStats}
                  position={position}
                />
                <div className="px-4 pb-4">
                  <div className="rounded-3xl overflow-hidden shadow-card border border-gray-100" style={{ height: 240 }}>
                    <MapView position={position} trail={trail} heading={heading} plannedRoute={plannedRoute} planDestCoords={planDestCoords} compact />
                  </div>
                </div>
              </>
            )}

            {/* FINISHED */}
            {isFinished && (
              <>
                {trail.length > 1 && (
                  <div className="px-4 pt-4">
                    <div className="rounded-3xl overflow-hidden shadow-card border border-gray-100" style={{ height: 180 }}>
                      <MapView position={null} trail={trail} compact />
                    </div>
                  </div>
                )}
                <SummaryScreen
                  mode={mode}
                  timer={timer}
                  onDismiss={handleNewActivity}
                  onHome={handleHome}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex safe-b">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          // Show a red dot on activity tab when tracking
          const showDot = tab.id === 'activity' && isTracking
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors relative ${
                isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className={`text-[11px] font-semibold ${isActive ? 'text-brand-600' : 'text-gray-400'}`}>
                {tab.label}
              </span>
              {showDot && (
                <span className="absolute top-2 right-[calc(50%-14px)] w-2 h-2 bg-red-500 rounded-full paused-dot" />
              )}
              {isActive && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-brand-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

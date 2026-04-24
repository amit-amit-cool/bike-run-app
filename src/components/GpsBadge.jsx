function gpsQuality(accuracy) {
  if (accuracy == null) return { label: 'No signal', color: 'text-red-500', bg: 'bg-red-50', bars: 0 }
  if (accuracy <= 5) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50', bars: 4 }
  if (accuracy <= 15) return { label: 'Good', color: 'text-green-600', bg: 'bg-green-50', bars: 3 }
  if (accuracy <= 30) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-50', bars: 2 }
  if (accuracy <= 100) return { label: 'Weak', color: 'text-orange-500', bg: 'bg-orange-50', bars: 1 }
  return { label: 'Very weak', color: 'text-red-500', bg: 'bg-red-50', bars: 1 }
}

function SignalBars({ bars }) {
  return (
    <div className="flex items-end gap-[2px] h-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-[3px] rounded-sm ${i <= bars ? 'bg-current' : 'bg-gray-300'}`}
          style={{ height: `${25 + i * 25}%` }}
        />
      ))}
    </div>
  )
}

export default function GpsBadge({ position, gpsReady, gpsWaitSecs, error, altitude }) {
  const accuracy = position?.accuracy
  const q = gpsReady ? gpsQuality(accuracy) : { label: 'Searching', color: 'text-gray-400', bg: 'bg-gray-50', bars: 0 }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl px-3 py-2 flex items-center gap-2">
        <span className="text-red-500 text-xs font-semibold">GPS Error: {error}</span>
      </div>
    )
  }

  return (
    <div className={`${q.bg} rounded-xl px-3 py-2 flex items-center gap-3`}>
      <div className={`flex items-center gap-1.5 ${q.color}`}>
        <SignalBars bars={q.bars} />
        <span className="text-xs font-bold">{q.label}</span>
      </div>
      {gpsReady && accuracy != null && (
        <>
          <span className="w-px h-3 bg-gray-200" />
          <span className="text-[10px] text-gray-500">±{Math.round(accuracy)}m</span>
        </>
      )}
      {gpsReady && altitude != null && (
        <>
          <span className="w-px h-3 bg-gray-200" />
          <span className="text-[10px] text-gray-500">{Math.round(altitude)}m alt</span>
        </>
      )}
      {!gpsReady && gpsWaitSecs > 0 && (
        <span className="text-[10px] text-gray-400">waiting {gpsWaitSecs}s…</span>
      )}
    </div>
  )
}

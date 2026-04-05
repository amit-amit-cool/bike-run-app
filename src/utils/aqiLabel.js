export function aqiLabel(aqi) {
  if (aqi == null) return { label: '—', color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-100', emoji: '🌫️' }
  if (aqi <= 50)  return { label: 'Good',                       color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100',  emoji: '😊' }
  if (aqi <= 100) return { label: 'Moderate',                   color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', emoji: '😐' }
  if (aqi <= 150) return { label: 'Sensitive Groups',           color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', emoji: '😷' }
  if (aqi <= 200) return { label: 'Unhealthy',                  color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100',    emoji: '🤢' }
  if (aqi <= 300) return { label: 'Very Unhealthy',             color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', emoji: '🤧' }
  return           { label: 'Hazardous',                        color: 'text-red-900',    bg: 'bg-red-100',   border: 'border-red-200',    emoji: '☠️' }
}

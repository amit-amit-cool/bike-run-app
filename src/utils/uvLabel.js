export function uvLabel(uv) {
  if (uv == null) return { label: '--', color: 'text-gray-400', bg: 'bg-gray-100' }
  if (uv < 3) return { label: 'Low', color: 'text-emerald-600', bg: 'bg-emerald-50' }
  if (uv < 6) return { label: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-50' }
  if (uv < 8) return { label: 'High', color: 'text-orange-600', bg: 'bg-orange-50' }
  if (uv < 11) return { label: 'Very High', color: 'text-red-600', bg: 'bg-red-50' }
  return { label: 'Extreme', color: 'text-purple-700', bg: 'bg-purple-50' }
}

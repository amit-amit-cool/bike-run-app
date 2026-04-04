// Returns wind component in the direction of travel (positive = tailwind, negative = headwind)
// windSpeed: km/h, windDir: degrees (meteorological: 0=from N, 90=from E)
// heading: degrees (0=N, 90=E, direction of travel)
export function calcWindAssist(windSpeed, windDir, heading) {
  if (windSpeed == null || windDir == null || heading == null) return null
  // Wind direction is where wind comes FROM; convert to where it goes TO
  const windToDir = (windDir + 180) % 360
  const angleDiff = ((windToDir - heading + 180 + 360) % 360) - 180
  return Math.round(windSpeed * Math.cos((angleDiff * Math.PI) / 180) * 10) / 10
}

export function windDirLabel(degrees) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(((degrees % 360) + 360) % 360 / 45) % 8]
}

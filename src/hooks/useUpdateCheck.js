import { useState, useEffect } from 'react'
import pkg from '../../package.json'

const CURRENT_VERSION = `v${pkg.version}`
// Use /releases (list) instead of /releases/latest — the latter has a stickier CDN cache
const RELEASES_API = 'https://api.github.com/repos/amit-amit-cool/bike-run-app/releases?per_page=1'

// Compare semver strings like "v1.2.0" > "v1.0.0"
function isNewer(remote, local) {
  const parse = (v) => v.replace(/^v/, '').split('.').map(Number)
  const r = parse(remote)
  const l = parse(local)
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true
    if ((r[i] || 0) < (l[i] || 0)) return false
  }
  return false
}

export function useUpdateCheck() {
  const [latest, setLatest] = useState({ url: null, version: null, hasUpdate: false })

  useEffect(() => {
    fetch(RELEASES_API)
      .then(r => r.json())
      .then(releases => {
        const data = Array.isArray(releases) ? releases[0] : releases
        if (data?.tag_name) {
          const apk = data.assets?.find(a => a.name.endsWith('.apk'))
          setLatest({
            url: apk?.browser_download_url || data.html_url,
            version: data.tag_name,
            hasUpdate: isNewer(data.tag_name, CURRENT_VERSION),
          })
        }
      })
      .catch(() => {}) // silently ignore if offline
  }, [])

  return latest
}

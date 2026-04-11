import { useState, useEffect } from 'react'
import pkg from '../../package.json'

const CURRENT_VERSION = `v${pkg.version}`
const RELEASES_API = 'https://api.github.com/repos/amit-amit-cool/bike-run-app/releases/latest'

export function useUpdateCheck() {
  const [latest, setLatest] = useState({ url: null, version: null, hasUpdate: false })

  useEffect(() => {
    fetch(RELEASES_API)
      .then(r => r.json())
      .then(data => {
        if (data.tag_name) {
          const apk = data.assets?.find(a => a.name.endsWith('.apk'))
          setLatest({
            url: apk?.browser_download_url || data.html_url,
            version: data.tag_name,
            hasUpdate: data.tag_name !== CURRENT_VERSION,
          })
        }
      })
      .catch(() => {}) // silently ignore if offline
  }, [])

  return latest
}

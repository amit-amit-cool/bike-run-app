import { useState, useEffect } from 'react'

const CURRENT_VERSION = 'v1.0.0'
const RELEASES_API = 'https://api.github.com/repos/amit-amit-cool/bike-run-app/releases/latest'

export function useUpdateCheck() {
  const [updateUrl, setUpdateUrl] = useState(null)

  useEffect(() => {
    fetch(RELEASES_API)
      .then(r => r.json())
      .then(data => {
        if (data.tag_name && data.tag_name !== CURRENT_VERSION) {
          const apk = data.assets?.find(a => a.name.endsWith('.apk'))
          setUpdateUrl(apk?.browser_download_url || data.html_url)
        }
      })
      .catch(() => {}) // silently ignore if offline
  }, [])

  return updateUrl
}

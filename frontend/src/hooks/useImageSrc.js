import { useState, useEffect } from 'react'
import { api } from '../services/api'

// Resolves a detection-image URL into something an <img> can display.
//  - null/'' → null (caller shows a placeholder)
//  - absolute URL (BKC signed URL) → used as-is
//  - relative /api/... path → fetched with the bearer token and returned as a blob
//    object URL (browsers can't attach Authorization to a bare <img src>)
// Return value: string url | null (still loading / none) | false (fetch failed)
export function useImageSrc(src) {
  const [resolved, setResolved] = useState(
    () => (src && src.startsWith('http') ? src : null)
  )

  useEffect(() => {
    if (!src) { setResolved(null); return }
    if (src.startsWith('http')) { setResolved(src); return }

    let objectUrl = null
    let cancelled = false
    setResolved(null)
    api.authBlobUrl(src)
      .then(url => {
        if (cancelled) { URL.revokeObjectURL(url) }
        else { objectUrl = url; setResolved(url) }
      })
      .catch(() => { if (!cancelled) setResolved(false) })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  return resolved
}

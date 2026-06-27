import React, { useState } from 'react'
import { ImageOff } from 'lucide-react'

export default function ImagePreview({ src, alt = 'Detection image', className = '' }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-lg aspect-video ${className}`}
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        role="img"
        aria-label="Image unavailable"
      >
        <ImageOff size={28} style={{ color: 'var(--ink-subtle)' }} />
        <span className="text-xs" style={{ color: 'var(--ink-subtle)' }}>
          Image unavailable
        </span>
      </div>
    )
  }

  return (
    <div className={`relative rounded-lg overflow-hidden aspect-video ${className}`}
      style={{ background: 'var(--surface-2)' }}
    >
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  )
}

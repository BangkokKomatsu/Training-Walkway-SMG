import React, { useState } from 'react'
import { ImageOff, ZoomIn } from 'lucide-react'

export default function ImagePreview({ src, alt = 'Detection image', className = '' }) {
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-xl bg-surface-2 border border-border aspect-video w-full ${className}`}
        role="img"
        aria-label="Detection frame unavailable"
      >
        <ImageOff size={24} className="text-ink-subtle opacity-70" />
        <span className="text-xs font-bold text-ink-subtle opacity-70">
          Detection Frame Unavailable
        </span>
      </div>
    )
  }

  return (
    <div className={`relative rounded-xl overflow-hidden aspect-video border border-border bg-surface-2/60 group w-full ${className}`}>
      {/* Skeleton loading screen while image fetches */}
      {loading && (
        <div className="absolute inset-0 bg-surface-2 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoading(false)}
        onError={() => {
          setFailed(true)
          setLoading(false)
        }}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      {/* Beautiful dark/glassy overlay on hover */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface/95 text-xs font-bold border border-border shadow-md">
          <ZoomIn size={12} className="text-primary" />
          <span>Inspect Detection Capture</span>
        </div>
      </div>
    </div>
  )
}

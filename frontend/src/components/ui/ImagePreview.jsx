import React, { useState } from 'react'
import { ImageOff, ZoomIn } from 'lucide-react'
import { useImageSrc } from '../../hooks/useImageSrc'

export default function ImagePreview({ src, alt = 'Detection image', className = '' }) {
  const resolved = useImageSrc(src)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  // resolved === false → the authed blob fetch failed; treat like a missing frame
  if (!src || failed || resolved === false) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-xl bg-surface-2 border border-border aspect-[4/3] w-full ${className}`}
        role="img"
        aria-label="Detection frame unavailable"
      >
        <ImageOff size={24} className="text-ink-subtle opacity-70" />
        <span className="text-sm font-bold text-ink-subtle opacity-70">
          Detection Frame Unavailable
        </span>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`relative rounded-xl overflow-hidden aspect-[4/3] border border-border bg-surface-2/60 group w-full cursor-zoom-in ${className}`}
      >
        {/* Skeleton loading screen while image fetches */}
        {loading && (
          <div className="absolute inset-0 bg-surface-2 animate-pulse flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}
        <img
          src={resolved || undefined}
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface/95 text-sm font-bold border border-border shadow-md">
            <ZoomIn size={12} className="text-primary" />
            <span>Inspect Detection Capture</span>
          </div>
        </div>
      </button>

      {/* Full-resolution lightbox — same pattern as the resolution-image viewer in EventDetailPage */}
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-5xl max-h-[85vh] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 p-1 flex items-center justify-center">
            <img src={resolved || undefined} alt={alt} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1.5 rounded-full text-[12px] font-bold text-white uppercase pointer-events-none">
              Click anywhere to close
            </div>
          </div>
        </div>
      )}
    </>
  )
}

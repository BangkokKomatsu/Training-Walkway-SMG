import React from 'react'
import { AlertCircle, FileQuestion, Loader2 } from 'lucide-react'

export function LoadingSpinner({ size = 20 }) {
  return (
    <Loader2
      size={size}
      className="animate-spin text-primary"
    />
  )
}

export function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3" aria-label="Loading" role="status">
      <LoadingSpinner size={32} />
      <span className="text-sm font-semibold text-ink-muted">Loading workspace...</span>
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 gap-3 text-center border border-dashed border-red-500/30 rounded-xl bg-red-500/5 max-w-md mx-auto">
      <AlertCircle size={28} className="text-red-500" />
      <p className="text-base font-bold text-ink">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm px-3.5 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-2 transition-all font-semibold"
        >
          Retry Connection
        </button>
      )}
    </div>
  )
}

export function EmptyState({ message = 'No data found', icon: Icon = FileQuestion }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 gap-3 text-center border border-dashed border-border rounded-xl bg-surface/50 max-w-md mx-auto">
      <Icon size={28} className="text-ink-subtle" />
      <p className="text-sm font-semibold text-ink-muted">{message}</p>
    </div>
  )
}

/* SKELETON SCREENS */

// 4 Metric cards skeleton
export function SkeletonMetrics() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4].map(n => (
        <div key={n} className="h-28 rounded-xl border border-border bg-surface/60 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 bg-border rounded-md" />
            <div className="w-4 h-4 bg-border rounded-full" />
          </div>
          <div className="h-7 w-12 bg-border rounded-md mt-2" />
          <div className="h-3 w-24 bg-border rounded-md" />
        </div>
      ))}
    </div>
  )
}

// Table loading skeleton
export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface/40 animate-pulse">
      <div className="h-10 bg-surface-2/60 border-b border-border" />
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center justify-between gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-3.5 bg-border rounded-md"
                style={{ width: `${100 / cols - 5}%`, maxWidth: c === 0 ? '60px' : '150px' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Camera feed status grid skeleton
export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-32 border border-border bg-surface/60 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-4 w-16 bg-border rounded-md" />
            <div className="h-5 w-12 bg-border rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-28 bg-border rounded-md" />
            <div className="h-3 w-16 bg-border rounded-md" />
          </div>
          <div className="h-3 w-24 bg-border rounded-md pt-1 border-t border-border/30" />
        </div>
      ))}
    </div>
  )
}

// System health components skeleton
export function SkeletonHealth() {
  return (
    <div className="border border-border rounded-xl bg-surface/60 overflow-hidden divide-y divide-border animate-pulse">
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} className="p-4 flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-border flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-40 bg-border rounded-md" />
            <div className="h-3 w-64 bg-border rounded-md" />
          </div>
          <div className="h-6 w-16 bg-border rounded-full" />
        </div>
      ))}
    </div>
  )
}

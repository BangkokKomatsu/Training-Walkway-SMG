import React from 'react'

export function LoadingSpinner({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
      style={{ animation: 'spin 0.8s linear infinite', color: 'var(--ink-muted)' }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-24" aria-label="Loading" role="status">
      <LoadingSpinner size={28} />
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <span className="text-sm" style={{ color: 'var(--status-err)' }}>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs px-3 py-1.5 rounded border transition-colors duration-[120ms] hover:bg-[var(--surface-2)]"
          style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)' }}
        >
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ message = 'No data found', icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      {Icon && <Icon size={32} style={{ color: 'var(--ink-subtle)' }} />}
      <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>{message}</p>
    </div>
  )
}

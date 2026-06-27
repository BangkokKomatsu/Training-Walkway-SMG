import React from 'react'
import { CheckCircle, XCircle, AlertTriangle, Circle } from 'lucide-react'
import clsx from 'clsx'

const VARIANTS = {
  ok:      { icon: CheckCircle,  color: 'var(--status-ok)',   bg: 'var(--status-ok)',   label: 'Online' },
  warn:    { icon: AlertTriangle, color: 'var(--status-warn)', bg: 'var(--status-warn)', label: 'Warning' },
  error:   { icon: XCircle,      color: 'var(--status-err)',  bg: 'var(--status-err)',  label: 'Failed' },
  offline: { icon: Circle,       color: 'var(--status-off)',  bg: 'var(--status-off)',  label: 'Offline' },
}

// status: 'ok' | 'warn' | 'error' | 'offline'
// label: override the default label
export default function StatusBadge({ status = 'offline', label, size = 'sm' }) {
  const v = VARIANTS[status] ?? VARIANTS.offline
  const Icon = v.icon
  const iconSize = size === 'sm' ? 10 : 12

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      )}
      style={{
        background: `color-mix(in oklch, ${v.bg} 15%, transparent)`,
        color: v.color,
        border: `1px solid color-mix(in oklch, ${v.bg} 30%, transparent)`,
      }}
    >
      <Icon size={iconSize} strokeWidth={2.5} aria-hidden />
      {label ?? v.label}
    </span>
  )
}

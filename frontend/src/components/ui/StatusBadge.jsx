import React from 'react'
import { CheckCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react'
import clsx from 'clsx'

const VARIANTS = {
  ok: {
    icon: CheckCircle,
    styles: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    label: 'Online'
  },
  warn: {
    icon: AlertTriangle,
    styles: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
    label: 'Warning'
  },
  error: {
    icon: XCircle,
    styles: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
    label: 'Failed'
  },
  offline: {
    icon: HelpCircle,
    styles: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500 dark:text-zinc-400',
    label: 'Offline'
  }
}

export default function StatusBadge({ status = 'offline', label, size = 'sm' }) {
  const activeVariant = VARIANTS[status] || VARIANTS.offline
  const Icon = activeVariant.icon
  const iconSize = size === 'sm' ? 10 : 12

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-md font-bold border transition-all duration-150',
        size === 'sm' ? 'px-2 py-0.5 text-[12px] tracking-wide' : 'px-2.5 py-1 text-[13px] tracking-wider',
        activeVariant.styles
      )}
    >
      <Icon size={iconSize} strokeWidth={2.5} aria-hidden />
      <span>{label || activeVariant.label}</span>
    </span>
  )
}

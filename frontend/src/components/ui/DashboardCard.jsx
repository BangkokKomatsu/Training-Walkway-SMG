import React from 'react'
import clsx from 'clsx'

const COLOR_MAPS = {
  danger:  'from-red-500 to-orange-500 text-red-500',
  success: 'from-emerald-500 to-teal-500 text-emerald-500',
  info:    'from-cyan-500 to-blue-500 text-cyan-400',
  warning: 'from-amber-500 to-yellow-500 text-amber-500',
  default: 'from-indigo-500 to-purple-500 text-primary',
}

export default function DashboardCard({ icon: Icon, label, value, sub, accent = false }) {
  // Infer coloring based on label names
  let themeKey = 'default'
  const normLabel = (label || '').toLowerCase()
  if (normLabel.includes('today') || normLabel.includes('danger') || accent) {
    themeKey = 'danger'
  } else if (normLabel.includes('camera') || normLabel.includes('online')) {
    themeKey = 'success'
  } else if (normLabel.includes('alert') || normLabel.includes('success')) {
    themeKey = 'info'
  } else if (normLabel.includes('month')) {
    themeKey = 'default'
  }

  const gradientColors = COLOR_MAPS[themeKey] || COLOR_MAPS.default
  const colorText = gradientColors.split(' ').pop()
  const gradients = gradientColors.replace(' ' + colorText, '')

  return (
    <div className="relative group flex flex-col h-full rounded-xl transition-all duration-300 hover:scale-[1.02]">
      {/* Glow Background (Subtle radial effect behind card in dark mode) */}
      <div className={clsx(
        "absolute inset-0 bg-gradient-to-tr opacity-[0.06] dark:opacity-[0.08] filter blur-[24px] rounded-xl transition-opacity duration-300 group-hover:opacity-[0.12] dark:group-hover:opacity-[0.15] pointer-events-none",
        gradients
      )} />

      {/* Foreground Container */}
      <div className="relative z-10 flex flex-col justify-between flex-1 p-5 rounded-xl border border-border bg-surface/50 dark:bg-surface/30 backdrop-blur-md transition-all duration-300 group-hover:border-border/80 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
            {label}
          </span>
          {Icon && (
            <div className={clsx("p-1.5 rounded-lg bg-surface-2 border border-border/40", colorText)}>
              <Icon size={14} strokeWidth={2.5} />
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-col">
          <span className="text-2xl font-bold font-mono tracking-tight text-ink leading-none">
            {value ?? '—'}
          </span>
          {sub && (
            <span className="mt-2 text-[11px] text-ink-muted leading-tight font-medium">
              {sub}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

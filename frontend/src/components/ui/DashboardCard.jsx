import React from 'react'
import clsx from 'clsx'

const TONE_STYLES = {
  primary: { icon: 'text-primary',                        glow: 'bg-primary' },
  ok:      { icon: 'text-[color:var(--status-ok)]',       glow: 'bg-[color:var(--status-ok)]' },
  warn:    { icon: 'text-[color:var(--status-warn)]',      glow: 'bg-[color:var(--status-warn)]' },
  err:     { icon: 'text-[color:var(--status-err)]',       glow: 'bg-[color:var(--status-err)]' },
  neutral: { icon: 'text-ink-muted',                       glow: 'bg-ink-subtle' },
}

export default function DashboardCard({ icon: Icon, label, value, sub, tone = 'neutral' }) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.neutral

  return (
    <div className="relative group flex flex-col h-full rounded-xl transition-all duration-300 hover:-translate-y-0.5">
      {/* Soft tinted glow behind the card, tied to the card's tone rather than a rainbow of decorative hues */}
      <div className={clsx(
        "absolute inset-0 opacity-[0.05] dark:opacity-[0.07] filter blur-[24px] rounded-xl transition-opacity duration-300 group-hover:opacity-[0.10] dark:group-hover:opacity-[0.14] pointer-events-none",
        styles.glow
      )} />

      {/* Foreground Container */}
      <div className="relative z-10 flex flex-col justify-between flex-1 p-5 rounded-xl border border-border bg-surface/60 dark:bg-surface/40 backdrop-blur-md transition-all duration-300 group-hover:border-primary/30 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-bold uppercase tracking-wider text-ink-subtle">
            {label}
          </span>
          {Icon && (
            <div className={clsx("p-1.5 rounded-lg bg-surface-2 border border-border/40", styles.icon)}>
              <Icon size={14} strokeWidth={2.5} />
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-col">
          <span className="text-3xl font-bold font-mono tracking-tight text-ink leading-none tabular-nums">
            {value ?? '—'}
          </span>
          {sub && (
            <span className="mt-2 text-[13px] text-ink-muted leading-tight font-medium">
              {sub}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

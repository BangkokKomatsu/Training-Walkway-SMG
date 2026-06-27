import React from 'react'

// A metric card: icon, label, large value, optional sub-line
export default function DashboardCard({ icon: Icon, label, value, sub, accent = false }) {
  return (
    <div
      className="flex flex-col gap-3 p-5 rounded-lg border"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
          {label}
        </span>
        {Icon && (
          <Icon
            size={16}
            style={{ color: accent ? 'var(--primary)' : 'var(--ink-subtle)' }}
          />
        )}
      </div>
      <div
        className="text-3xl font-bold font-mono leading-none"
        style={{
          color: accent ? 'var(--primary)' : 'var(--ink)',
          letterSpacing: '-0.03em',
        }}
      >
        {value ?? '—'}
      </div>
      {sub && (
        <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
          {sub}
        </p>
      )}
    </div>
  )
}

import React from 'react'
import { Camera, Wifi, WifiOff, Clock } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatRelative } from '../../utils/format'

export default function CameraStatusCard({ camera }) {
  const isOnline = camera.status === 'online'

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-lg border transition-all duration-[120ms] hover:-translate-y-0.5"
      style={{
        background: 'var(--surface)',
        borderColor: isOnline ? 'var(--border)' : 'color-mix(in oklch, var(--status-err) 20%, var(--border))',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {isOnline
            ? <Wifi size={16} style={{ color: 'var(--status-ok)', flexShrink: 0 }} />
            : <WifiOff size={16} style={{ color: 'var(--status-err)', flexShrink: 0 }} />
          }
          <span className="text-sm font-medium font-mono leading-tight" style={{ color: 'var(--ink)' }}>
            {camera.camera_no}
          </span>
        </div>
        <StatusBadge
          status={isOnline ? 'ok' : 'error'}
          label={isOnline ? 'Online' : 'Offline'}
        />
      </div>

      <div className="space-y-1">
        {camera.location && (
          <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
            <span style={{ color: 'var(--ink-subtle)' }}>Location: </span>
            {camera.location}
          </p>
        )}
        {camera.company_code && (
          <p className="text-xs font-mono" style={{ color: 'var(--ink-subtle)' }}>
            {camera.company_code}
          </p>
        )}
      </div>

      {camera.last_seen && (
        <div className="flex items-center gap-1.5 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
          <Clock size={11} style={{ color: 'var(--ink-subtle)' }} />
          <span className="text-[11px] font-mono" style={{ color: 'var(--ink-subtle)' }}>
            {formatRelative(camera.last_seen)}
          </span>
        </div>
      )}
    </div>
  )
}

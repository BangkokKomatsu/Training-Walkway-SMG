import React from 'react'
import { Camera, Wifi, WifiOff, Clock } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatRelative } from '../../utils/format'
import clsx from 'clsx'

export default function CameraStatusCard({ camera }) {
  const isOnline = camera.status === 'online'

  return (
    <div
      className={clsx(
        "relative group flex flex-col justify-between p-5 rounded-xl border backdrop-blur-md transition-all duration-300 hover:scale-[1.02]",
        isOnline
          ? "border-border hover:border-emerald-500/40 bg-surface/40 hover:shadow-lg hover:shadow-emerald-500/5"
          : "border-rose-500/20 hover:border-rose-500/40 bg-rose-500/[0.02]"
      )}
    >
      {/* Absolute glow marker */}
      <div className={clsx(
        "absolute top-0 right-0 w-8 h-8 rounded-full filter blur-[10px] opacity-[0.08] pointer-events-none transition-all duration-300",
        isOnline ? "bg-emerald-500 group-hover:opacity-[0.15]" : "bg-rose-500 group-hover:opacity-[0.15]"
      )} />

      {/* Header bar */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={clsx(
            "p-2 rounded-lg border",
            isOnline ? "bg-emerald-500/10 border-emerald-500/10 text-emerald-500" : "bg-rose-500/10 border-rose-500/10 text-rose-500"
          )}>
            {isOnline ? <Wifi size={14} className="animate-pulse" /> : <WifiOff size={14} />}
          </div>
          <span className="text-xs font-bold font-mono text-ink tracking-tight">
            {camera.camera_no}
          </span>
        </div>
        <StatusBadge
          status={isOnline ? 'ok' : 'error'}
          label={isOnline ? 'Active' : 'Offline'}
        />
      </div>

      {/* Details */}
      <div className="relative z-10 my-4 space-y-1.5 pl-0.5">
        {camera.location && (
          <div className="text-[11px] text-ink-muted leading-relaxed font-semibold">
            <span className="text-[10px] text-ink-subtle uppercase tracking-wider block font-bold">INSTALL SITE:</span>
            {camera.location}
          </div>
        )}
        {camera.company_code && (
          <div className="text-[10px] font-mono text-primary font-bold inline-block bg-primary/10 px-2 py-0.2 rounded-md border border-primary/20">
            {camera.company_code}
          </div>
        )}
      </div>

      {/* Timestamp footer */}
      {camera.last_seen && (
        <div className="relative z-10 flex items-center gap-1.5 pt-3 border-t border-border/60 text-[10px] text-ink-subtle">
          <Clock size={11} className="text-ink-subtle" />
          <span>
            Heartbeat: <span className="font-mono text-ink font-semibold">{formatRelative(camera.last_seen)}</span>
          </span>
        </div>
      )}
    </div>
  )
}

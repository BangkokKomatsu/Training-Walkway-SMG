import React from 'react'
import { Camera, Wifi, WifiOff, Clock, Edit, Trash2 } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatRelative } from '../../utils/format'
import clsx from 'clsx'

export default function CameraStatusCard({ camera, onEditPolygon, onEditCamera, onDeleteCamera }) {
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
        <div className="text-[11px] text-ink-muted leading-relaxed font-semibold">
          <span className="text-[10px] text-ink-subtle uppercase tracking-wider block font-bold">CAMERA NAME:</span>
          {camera.camera_name || `Camera ${camera.camera_no}`}
        </div>
        {camera.location && (
          <div className="text-[11px] text-ink-muted leading-relaxed font-semibold">
            <span className="text-[10px] text-ink-subtle uppercase tracking-wider block font-bold">INSTALL SITE:</span>
            {camera.location}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {camera.company_code && (
            <div className="text-[10px] font-mono text-primary font-bold inline-block bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
              {camera.company_code}
            </div>
          )}
          {camera.brand && (
            <div className="text-[10px] font-mono text-ink-muted font-bold inline-block bg-surface-2 px-2 py-0.5 rounded-md border border-border">
              {camera.brand} ({camera.stream_type || 'sub'})
            </div>
          )}
        </div>
        {(() => {
          try {
            if (camera.schedule_json) {
              const rules = JSON.parse(camera.schedule_json);
              if (Array.isArray(rules) && rules.length > 0) {
                return (
                  <div className="text-[10px] text-ink-subtle flex items-center gap-1 mt-2.5 font-semibold bg-surface-2/40 px-2 py-1 rounded-md border border-border/40 w-fit">
                    <Clock size={11} className="text-primary" />
                    <span>Scheduled ({rules.length} {rules.length === 1 ? 'rule' : 'rules'})</span>
                  </div>
                );
              }
            }
          } catch (e) {}
          return null;
        })()}
      </div>

      {/* Footer controls & heartbeat */}
      <div className="relative z-10 pt-3 border-t border-border/60 flex flex-col gap-2.5">
        {camera.last_seen && (
          <div className="flex items-center gap-1.5 text-[10px] text-ink-subtle">
            <Clock size={11} className="text-ink-subtle" />
            <span>
              Heartbeat: <span className="font-mono text-ink font-semibold">{formatRelative(camera.last_seen)}</span>
            </span>
          </div>
        )}

        <div className="flex gap-2 w-full">
          <button
            onClick={() => onEditPolygon && onEditPolygon(camera)}
            className="flex-1 py-1.5 px-3 rounded-lg border border-border bg-surface-2 text-[10px] text-ink-muted font-bold hover:text-primary hover:border-primary/50 hover:bg-surface/50 transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <Camera size={11} /> Draw Zone
          </button>
          <button
            onClick={() => onEditCamera && onEditCamera(camera)}
            className="py-1.5 px-2.5 rounded-lg border border-border bg-surface-2 text-ink-muted hover:text-amber-500 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center justify-center cursor-pointer"
            title="Edit Details"
          >
            <Edit size={11} />
          </button>
          <button
            onClick={() => onDeleteCamera && onDeleteCamera(camera)}
            className="py-1.5 px-2.5 rounded-lg border border-border bg-surface-2 text-ink-muted hover:text-rose-500 hover:border-rose-500/50 hover:bg-rose-500/5 transition-all flex items-center justify-center cursor-pointer"
            title="Delete Camera"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}

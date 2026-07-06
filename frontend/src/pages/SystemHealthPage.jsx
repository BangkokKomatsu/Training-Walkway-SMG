import React from 'react'
import { Activity, Database, HardDrive, Camera, Cpu, Clock, Terminal, AlertTriangle, RefreshCw } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import StatusBadge from '../components/ui/StatusBadge'
import { SkeletonHealth } from '../components/ui/LoadingState'
import { formatDateTime, formatRelative } from '../utils/format'

function HealthRow({ icon: Icon, label, status, value, sub }) {
  const badgeStatus =
    status === 'ok' || status === 'running' || status === 'connected' ? 'ok' :
    status === 'warn' || status === 'slow'  ? 'warn' :
    status === 'error' || status === 'down' || status === 'stopped' ? 'error' :
    'offline'

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0 hover:bg-surface-2/15 transition-colors duration-150"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-2 border border-border/40 text-ink-muted flex-shrink-0"
      >
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink">{label}</p>
        {(value || sub) && (
          <p className="text-[12px] font-mono text-ink-muted mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {value}{sub ? ` · ${sub}` : ''}
          </p>
        )}
      </div>
      <StatusBadge status={badgeStatus} label={status ?? 'Unknown'} size="md" />
    </div>
  )
}

export default function SystemHealthPage() {
  const { data, loading, error, refetch } = useAsync(
    () => api.getHealth(),
    []
  )

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl animate-pulse">
        <div className="h-4 w-32 bg-border rounded-md" />
        <SkeletonHealth />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-20 text-center max-w-sm mx-auto">
        <AlertTriangle size={28} className="text-rose-500 mx-auto mb-2" />
        <p className="text-base font-bold text-ink mb-3">{error}</p>
        <button
          onClick={refetch}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-sm font-semibold"
        >
          <RefreshCw size={12} /> Retry check
        </button>
      </div>
    )
  }

  const items = Array.isArray(data) ? data : []

  const getItem = (key) => items.find(i => i.component === key) || {}

  const python  = getItem('python_service')
  const db      = getItem('database')
  const storage = getItem('storage')
  const cameras = getItem('cameras')

  return (
    <div className="space-y-5 w-full max-w-[1360px] mx-auto">
      
      {/* Last checked ribbon */}
      <div className="flex items-center gap-1.5 pl-1 text-[13px] font-bold text-ink-subtle uppercase tracking-wider">
        <Clock size={13} className="text-ink-subtle" />
        <span>
          Diagnostic check: <span className="font-mono text-ink font-bold">{items[0]?.checked_at ? formatRelative(items[0].checked_at) : '—'}</span>
        </span>
      </div>

      {/* Health Components Rack */}
      <div className="rounded-xl border border-border bg-surface/40 dark:bg-surface/20 overflow-hidden shadow-xs">
        <div
          className="px-5 py-3.5 border-b border-border text-[12px] font-bold text-ink-subtle uppercase tracking-wider bg-surface-2/40"
        >
          Server Diagnostic Nodes
        </div>

        <HealthRow
          icon={Cpu}
          label="Python Detection Service"
          status={python.status ?? 'unknown'}
          value={python.last_run ? `Last Loop: ${formatDateTime(python.last_run)}` : undefined}
          sub={python.version}
        />
        <HealthRow
          icon={Database}
          label="MSSQL Database Connection"
          status={db.status ?? 'unknown'}
          value={db.server}
          sub={db.latency_ms ? `${db.latency_ms}ms latency` : undefined}
        />
        <HealthRow
          icon={HardDrive}
          label="Image Storage Drive"
          status={storage.status ?? 'unknown'}
          value={storage.path}
          sub={storage.free_gb ? `${storage.free_gb} GB free` : undefined}
        />
        <HealthRow
          icon={Camera}
          label="CCTV Camera Connection Nodes"
          status={cameras.status ?? 'unknown'}
          value={cameras.online_count != null ? `${cameras.online_count}/${cameras.total_count} streams active` : undefined}
        />
        <HealthRow
          icon={Activity}
          label="Alert Webhook Delivery (Last 24 Hours)"
          status={items.find(i => i.component === 'alerts')?.status ?? 'unknown'}
          value={items.find(i => i.component === 'alerts')?.summary}
        />
      </div>

      {/* Raw Health JSON Terminal */}
      {items.length > 0 && (
        <details className="group border border-border/80 rounded-xl overflow-hidden bg-zinc-950">
          <summary
            className="cursor-pointer px-4 py-3 flex items-center justify-between text-[13px] font-bold tracking-wider text-zinc-400 uppercase select-none list-none bg-zinc-900/60"
          >
            <div className="flex items-center gap-2">
              <Terminal size={12} className="text-primary" />
              <span>Diagnostic Raw JSON Payload</span>
            </div>
            <span className="text-zinc-500 font-mono text-[11px] group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>
          <div className="p-4 border-t border-zinc-900 text-[12px] overflow-x-auto font-mono text-zinc-300 leading-relaxed max-h-72">
            <pre>{JSON.stringify(items, null, 2)}</pre>
          </div>
        </details>
      )}
    </div>
  )
}

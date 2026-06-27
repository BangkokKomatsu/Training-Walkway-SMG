import React from 'react'
import { Activity, Database, HardDrive, Camera, Cpu, Clock } from 'lucide-react'
import { useCompany } from '../context/CompanyContext'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import StatusBadge from '../components/ui/StatusBadge'
import { PageLoading, ErrorState } from '../components/ui/LoadingState'
import { formatDateTime, formatRelative } from '../utils/format'

function HealthRow({ icon: Icon, label, status, value, sub }) {
  const badgeStatus =
    status === 'ok' || status === 'running' || status === 'connected' ? 'ok' :
    status === 'warn' || status === 'slow'  ? 'warn' :
    status === 'error' || status === 'down' || status === 'stopped' ? 'error' :
    'offline'

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--surface-2)' }}
      >
        <Icon size={15} style={{ color: 'var(--ink-muted)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{label}</p>
        {(value || sub) && (
          <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--ink-muted)' }}>
            {value}{sub ? ` · ${sub}` : ''}
          </p>
        )}
      </div>
      <StatusBadge status={badgeStatus} label={status ?? 'Unknown'} size="md" />
    </div>
  )
}

export default function SystemHealthPage() {
  const { companyCode } = useCompany()
  const { data, loading, error, refetch } = useAsync(
    () => api.getHealth(companyCode),
    [companyCode]
  )

  if (loading) return <PageLoading />
  if (error)   return <ErrorState message={error} onRetry={refetch} />

  const items = Array.isArray(data) ? data : []

  const getItem = (key) => items.find(i => i.component === key) || {}

  const python  = getItem('python_service')
  const db      = getItem('database')
  const storage = getItem('storage')
  const cameras = getItem('cameras')

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Last updated */}
      <div className="flex items-center gap-2">
        <Clock size={13} style={{ color: 'var(--ink-subtle)' }} />
        <span className="text-xs font-mono" style={{ color: 'var(--ink-subtle)' }}>
          Checked {items[0]?.checked_at ? formatRelative(items[0].checked_at) : '—'}
        </span>
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div
          className="px-5 py-3 border-b text-xs font-medium"
          style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)', background: 'var(--surface-2)' }}
        >
          System Components
        </div>

        <HealthRow
          icon={Cpu}
          label="Python Detection Service"
          status={python.status ?? 'unknown'}
          value={python.last_run ? `Last run: ${formatDateTime(python.last_run)}` : undefined}
          sub={python.version}
        />
        <HealthRow
          icon={Database}
          label="MSSQL Database"
          status={db.status ?? 'unknown'}
          value={db.server}
          sub={db.latency_ms ? `${db.latency_ms}ms` : undefined}
        />
        <HealthRow
          icon={HardDrive}
          label="Image Storage"
          status={storage.status ?? 'unknown'}
          value={storage.path}
          sub={storage.free_gb ? `${storage.free_gb} GB free` : undefined}
        />
        <HealthRow
          icon={Camera}
          label="Camera Connections"
          status={cameras.status ?? 'unknown'}
          value={cameras.online_count != null ? `${cameras.online_count}/${cameras.total_count} online` : undefined}
        />
        <HealthRow
          icon={Activity}
          label="Alert Delivery (last 24h)"
          status={items.find(i => i.component === 'alerts')?.status ?? 'unknown'}
          value={items.find(i => i.component === 'alerts')?.summary}
        />
      </div>

      {/* Raw details */}
      {items.length > 0 && (
        <details className="text-xs">
          <summary
            className="cursor-pointer px-3 py-2 rounded-lg select-none"
            style={{ color: 'var(--ink-muted)', background: 'var(--surface-2)' }}
          >
            Raw health data ({items.length} components)
          </summary>
          <pre
            className="mt-2 p-4 rounded-lg text-xs overflow-x-auto font-mono"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-muted)' }}
          >
            {JSON.stringify(items, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

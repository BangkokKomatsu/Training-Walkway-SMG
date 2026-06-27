import React from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, Camera, Bell, AlertTriangle, CheckCircle,
  Clock, ChevronRight, Shield,
} from 'lucide-react'
import { useCompany } from '../context/CompanyContext'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import DashboardCard from '../components/ui/DashboardCard'
import StatusBadge from '../components/ui/StatusBadge'
import { PageLoading, ErrorState } from '../components/ui/LoadingState'
import { formatDateTime, formatConfidence } from '../utils/format'

export default function DashboardPage() {
  const { companyCode } = useCompany()
  const { data, loading, error, refetch } = useAsync(
    () => api.getDashboard(companyCode),
    [companyCode]
  )
  const { data: recentData, loading: recentLoading } = useAsync(
    () => api.getEvents({ company_code: companyCode, page: 1, page_size: 8 }),
    [companyCode]
  )

  if (loading) return <PageLoading />
  if (error)   return <ErrorState message={error} onRetry={refetch} />

  const d = data || {}

  return (
    <div className="space-y-6 max-w-6xl">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardCard
          icon={Shield}
          label="Events Today"
          value={d.events_today ?? 0}
          accent
        />
        <DashboardCard
          icon={Activity}
          label="Events This Month"
          value={d.events_month ?? 0}
          sub={d.events_prev_month != null ? `${d.events_prev_month} last month` : undefined}
        />
        <DashboardCard
          icon={Camera}
          label="Cameras Online"
          value={`${d.cameras_online ?? 0} / ${d.cameras_total ?? 0}`}
          sub={d.cameras_offline > 0 ? `${d.cameras_offline} offline` : 'All operational'}
        />
        <DashboardCard
          icon={Bell}
          label="Alerts Success"
          value={`${d.alerts_success ?? 0} / ${d.alerts_total ?? 0}`}
          sub={d.alerts_failed > 0 ? `${d.alerts_failed} failed` : 'No failures'}
        />
      </div>

      {/* Status summary strip */}
      <div
        className="flex flex-wrap gap-4 p-4 rounded-lg border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={d.python_service === 'running' ? 'ok' : 'error'} label="Python Service" />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={d.db_status === 'ok' ? 'ok' : 'error'} label="Database" />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={d.storage_status === 'ok' ? 'ok' : 'warn'} label="Storage" />
        </div>
        {d.last_run && (
          <div className="flex items-center gap-1.5 ml-auto">
            <Clock size={12} style={{ color: 'var(--ink-subtle)' }} />
            <span className="text-xs font-mono" style={{ color: 'var(--ink-subtle)' }}>
              Last run: {formatDateTime(d.last_run)}
            </span>
          </div>
        )}
      </div>

      {/* Recent events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Recent Events
          </h2>
          <Link
            to="/events"
            className="flex items-center gap-1 text-xs transition-colors duration-[120ms]"
            style={{ color: 'var(--accent)' }}
          >
            View all <ChevronRight size={13} />
          </Link>
        </div>

        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: 'var(--border)' }}
        >
          {recentLoading ? (
            <div className="py-10 flex justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--ink-subtle)', borderTopColor: 'transparent' }} />
            </div>
          ) : !recentData?.data?.length ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--ink-muted)' }}>
              No events recorded today
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  {['Time', 'Camera', 'Area', 'Confidence', 'Alert'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium"
                      style={{ color: 'var(--ink-muted)' }}>
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {recentData.data.map((ev, i) => (
                  <tr
                    key={ev.event_id ?? i}
                    className="transition-colors duration-[80ms] hover:bg-[var(--surface-2)]"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--ink-muted)' }}>
                      {formatDateTime(ev.detected_at)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--ink)' }}>
                      {ev.camera_no}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink-muted)' }}>
                      {ev.area_name ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--ink)' }}>
                      {formatConfidence(ev.confidence)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        status={ev.alert_sent ? 'ok' : 'warn'}
                        label={ev.alert_sent ? 'Sent' : 'Pending'}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/events/${ev.event_id}`}
                        className="text-xs transition-colors duration-[120ms]"
                        style={{ color: 'var(--accent)' }}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

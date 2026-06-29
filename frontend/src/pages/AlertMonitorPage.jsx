import React, { useState, useCallback } from 'react'
import { Bell, RefreshCw, AlertTriangle } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import FilterPanel from '../components/ui/FilterPanel'
import StatusBadge from '../components/ui/StatusBadge'
import { SkeletonTable } from '../components/ui/LoadingState'
import { formatDateTime } from '../utils/format'

const FILTERS = [
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'sent',   label: 'Sent' },
    { value: 'failed', label: 'Failed' },
  ]},
  { key: 'date_from', label: 'From', type: 'date' },
  { key: 'date_to',   label: 'To',   type: 'date' },
]

const PAGE_SIZE = 50

export default function AlertMonitorPage() {
  const [filters, setFilters] = useState({})
  const [page, setPage] = useState(1)

  const { data, loading, error, refetch } = useAsync(
    () => api.getAlerts({ ...filters, page, page_size: PAGE_SIZE }),
    [filters, page]
  )

  const handleFilterChange = useCallback((key, value) => {
    setFilters(f => ({ ...f, [key]: value || undefined }))
    setPage(1)
  }, [])

  const alerts = data?.data ?? []
  const total  = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4 w-full max-w-[1360px] mx-auto">
      
      {/* Filter widgets */}
      <FilterPanel filters={FILTERS} values={filters} onChange={handleFilterChange} />

      {/* Main Alert Log Box */}
      <div className="border border-border rounded-xl bg-surface/40 overflow-hidden shadow-xs">
        
        {/* Table Header Section */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-2/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              Alert Delivery Tracking
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface text-ink-muted border border-border">
              {total.toLocaleString()} total alerts
            </span>
          </div>
          {loading && (
            <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          )}
        </div>

        {error ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <AlertTriangle size={28} className="text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-ink mb-3">{error}</p>
            <button
              onClick={refetch}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-xs font-semibold"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : loading && !alerts.length ? (
          <SkeletonTable rows={10} cols={6} />
        ) : !alerts.length ? (
          <div className="p-12 text-center">
            <Bell size={28} className="text-ink-subtle mx-auto mb-2" />
            <p className="text-xs font-semibold text-ink-muted">No alert logs found in this date range</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-surface-2/30 border-b border-border text-[10px] font-bold text-ink-subtle uppercase tracking-wider">
                  <th className="px-5 py-3">Event ID</th>
                  <th className="px-5 py-3">Sent Timestamp</th>
                  <th className="px-5 py-3">Notification Type</th>
                  <th className="px-5 py-3">MS Teams Status</th>
                  <th className="px-5 py-3">Email Status</th>
                  <th className="px-5 py-3">Error Logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {alerts.map((al, i) => (
                  <tr
                    key={al.alert_id ?? i}
                    className="hover:bg-surface-2/40 transition-colors duration-150"
                  >
                    <td className="px-5 py-3 font-mono font-bold text-ink-subtle">
                      #{al.event_id}
                    </td>
                    <td className="px-5 py-3 font-mono text-ink-muted whitespace-nowrap">
                      {formatDateTime(al.sent_at)}
                    </td>
                    <td className="px-5 py-3 text-ink font-semibold">
                      {al.alert_type ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={al.teams_sent ? 'ok' : 'error'}
                        label={al.teams_sent ? 'Sent' : 'Failed'}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={al.email_sent ? 'ok' : 'error'}
                        label={al.email_sent ? 'Sent' : 'Failed'}
                      />
                    </td>
                    <td className="px-5 py-3 max-w-xs truncate text-rose-500 font-mono text-[11px]" title={al.error_message}>
                      {al.error_message || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-surface-2/20">
            <span className="text-[11px] text-ink-muted font-medium">
              Showing page <strong className="text-ink font-bold font-mono">{page}</strong> of <strong className="text-ink font-bold font-mono">{totalPages}</strong>
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-2 disabled:opacity-40 disabled:pointer-events-none transition-all font-semibold cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-2 disabled:opacity-40 disabled:pointer-events-none transition-all font-semibold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

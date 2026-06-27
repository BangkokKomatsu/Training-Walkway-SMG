import React, { useState, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { useCompany } from '../context/CompanyContext'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import FilterPanel from '../components/ui/FilterPanel'
import StatusBadge from '../components/ui/StatusBadge'
import { PageLoading, ErrorState, EmptyState } from '../components/ui/LoadingState'
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
  const { companyCode } = useCompany()
  const [filters, setFilters] = useState({})
  const [page, setPage] = useState(1)

  const { data, loading, error, refetch } = useAsync(
    () => api.getAlerts({ company_code: companyCode, ...filters, page, page_size: PAGE_SIZE }),
    [companyCode, filters, page]
  )

  const handleFilterChange = useCallback((key, value) => {
    setFilters(f => ({ ...f, [key]: value || undefined }))
    setPage(1)
  }, [])

  const alerts = data?.data ?? []
  const total  = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-0 max-w-5xl">
      <FilterPanel filters={FILTERS} values={filters} onChange={handleFilterChange} />

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--ink-muted)' }}>
            {total > 0 ? `${total.toLocaleString()} alerts` : 'Alerts'}
          </span>
          {loading && (
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--ink-subtle)', borderTopColor: 'transparent' }} />
          )}
        </div>

        {error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : loading && !alerts.length ? (
          <PageLoading />
        ) : !alerts.length ? (
          <EmptyState message="No alerts in this range" icon={Bell} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[640px]">
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  {['Event ID', 'Time', 'Type', 'Teams', 'Email', 'Error'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium"
                      style={{ color: 'var(--ink-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.map((al, i) => (
                  <tr
                    key={al.alert_id ?? i}
                    className="transition-colors duration-[80ms] hover:bg-[var(--surface-2)]"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--ink-subtle)' }}>
                      #{al.event_id}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap" style={{ color: 'var(--ink-muted)' }}>
                      {formatDateTime(al.sent_at)}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink)' }}>
                      {al.alert_type ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        status={al.teams_sent ? 'ok' : 'error'}
                        label={al.teams_sent ? 'Sent' : 'Failed'}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        status={al.email_sent ? 'ok' : 'error'}
                        label={al.email_sent ? 'Sent' : 'Failed'}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-xs max-w-xs truncate" style={{ color: 'var(--status-err)' }}>
                      {al.error_message || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs rounded border transition-colors disabled:opacity-40"
                style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)', background: 'var(--surface-2)' }}>
                Prev
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs rounded border transition-colors disabled:opacity-40"
                style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)', background: 'var(--surface-2)' }}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

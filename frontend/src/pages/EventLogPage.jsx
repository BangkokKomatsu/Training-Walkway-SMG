import React, { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ListChecks } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import FilterPanel from '../components/ui/FilterPanel'
import StatusBadge from '../components/ui/StatusBadge'
import { PageLoading, ErrorState, EmptyState } from '../components/ui/LoadingState'
import { formatDateTime, formatConfidence } from '../utils/format'

const FILTERS = [
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'alert', label: 'Alert' }, { value: 'normal', label: 'Normal' },
  ]},
  { key: 'date_from', label: 'From', type: 'date' },
  { key: 'date_to',   label: 'To',   type: 'date' },
]

const PAGE_SIZE = 50

export default function EventLogPage() {
  const [filters, setFilters] = useState({})
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, loading, error, refetch } = useAsync(
    () => api.getEvents({
      ...filters,
      search: search || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [filters, search, page]
  )

  const handleFilterChange = useCallback((key, value) => {
    setFilters(f => ({ ...f, [key]: value || undefined }))
    setPage(1)
  }, [])

  const handleSearch = useCallback((val) => {
    setSearch(val)
    setPage(1)
  }, [])

  const events = data?.data ?? []
  const total  = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-0 max-w-6xl">
      <FilterPanel
        filters={FILTERS}
        values={filters}
        onChange={handleFilterChange}
        searchValue={search}
        onSearchChange={handleSearch}
      />

      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--ink-muted)' }}>
            {total > 0 ? `${total.toLocaleString()} events` : 'Events'}
          </span>
          {loading && (
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--ink-subtle)', borderTopColor: 'transparent' }} />
          )}
        </div>

        {error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : loading && !events.length ? (
          <PageLoading />
        ) : !events.length ? (
          <EmptyState message="No events found — adjust filters or date range" icon={ListChecks} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  {['ID', 'Time', 'Camera', 'Company', 'Area', 'Conf.', 'Alert', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium"
                      style={{ color: 'var(--ink-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr
                    key={ev.event_id ?? i}
                    className="transition-colors duration-[80ms] hover:bg-[var(--surface-2)]"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--ink-subtle)' }}>
                      #{ev.event_id}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap" style={{ color: 'var(--ink-muted)' }}>
                      {formatDateTime(ev.detected_at)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--ink)' }}>
                      {ev.camera_no}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--ink-subtle)' }}>
                      {ev.company_code}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink-muted)' }}>
                      {ev.area_name ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--ink)' }}>
                      {formatConfidence(ev.confidence)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        status={ev.alert_sent ? 'ok' : ev.alert_failed ? 'error' : 'warn'}
                        label={ev.alert_sent ? 'Sent' : ev.alert_failed ? 'Failed' : 'Pending'}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/events/${ev.event_id}`}
                        className="text-xs transition-colors duration-[120ms]"
                        style={{ color: 'var(--accent)' }}
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs rounded border transition-colors disabled:opacity-40"
                style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)', background: 'var(--surface-2)' }}
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs rounded border transition-colors disabled:opacity-40"
                style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)', background: 'var(--surface-2)' }}
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

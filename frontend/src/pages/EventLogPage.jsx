import React, { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ListChecks, AlertCircle, RefreshCw } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import FilterPanel from '../components/ui/FilterPanel'
import StatusBadge from '../components/ui/StatusBadge'
import { SkeletonTable } from '../components/ui/LoadingState'
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
    <div className="space-y-4 w-full max-w-[1360px] mx-auto">
      
      {/* Filters block */}
      <FilterPanel
        filters={FILTERS}
        values={filters}
        onChange={handleFilterChange}
        searchValue={search}
        onSearchChange={handleSearch}
      />

      {/* Main logs box */}
      <div className="border border-border rounded-xl bg-surface/40 overflow-hidden shadow-xs">
        
        {/* Table Header Section */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-2/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              Recorded Safety Events
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface text-ink-muted border border-border">
              {total.toLocaleString()} total
            </span>
          </div>
          {loading && (
            <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          )}
        </div>

        {error ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <AlertCircle size={28} className="text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-ink mb-3">{error}</p>
            <button
              onClick={refetch}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-xs font-semibold"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : loading && !events.length ? (
          <SkeletonTable rows={10} cols={7} />
        ) : !events.length ? (
          <div className="p-12 text-center">
            <ListChecks size={28} className="text-ink-subtle mx-auto mb-2" />
            <p className="text-xs font-semibold text-ink-muted">No safety events found matching the filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-2/30 border-b border-border text-[10px] font-bold text-ink-subtle uppercase tracking-wider">
                  <th className="px-5 py-3">Event ID</th>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Camera</th>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Area Name</th>
                  <th className="px-5 py-3">AI Confidence</th>
                  <th className="px-5 py-3">Delivery Status</th>
                  <th className="px-5 py-3 text-right">View Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {events.map((ev, i) => (
                  <tr
                    key={ev.event_id ?? i}
                    className="hover:bg-surface-2/40 transition-colors duration-150"
                  >
                    <td className="px-5 py-3 font-mono font-bold text-ink-subtle">
                      #{ev.event_id}
                    </td>
                    <td className="px-5 py-3 font-mono text-ink-muted">
                      {formatDateTime(ev.detected_at)}
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-ink">
                      {ev.camera_no}
                    </td>
                    <td className="px-5 py-3 font-mono text-ink-subtle">
                      {ev.company_code}
                    </td>
                    <td className="px-5 py-3 text-ink-muted font-medium">
                      {ev.area_name ?? '—'}
                    </td>
                    <td className="px-5 py-3 font-mono text-ink">
                      {formatConfidence(ev.confidence)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={ev.alert_sent ? 'ok' : ev.alert_failed ? 'error' : 'warn'}
                        label={ev.alert_sent ? 'Sent' : ev.alert_failed ? 'Failed' : 'Pending'}
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/events/${ev.event_id}`}
                        className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all font-semibold"
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

        {/* Pagination Bar */}
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

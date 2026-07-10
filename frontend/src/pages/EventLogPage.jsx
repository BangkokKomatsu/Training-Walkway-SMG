import React, { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ListChecks, AlertCircle, RefreshCw, CheckCircle, XCircle, Camera, CheckSquare, Square } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { useImageSrc } from '../hooks/useImageSrc'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import FilterPanel from '../components/ui/FilterPanel'
import StatusBadge from '../components/ui/StatusBadge'
import { SkeletonTable } from '../components/ui/LoadingState'
import { formatDateTime } from '../utils/format'

const FILTERS = [
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'NEW', label: 'New' },
    { value: 'CLOSED', label: 'Resolved' },
    { value: 'DISMISSED', label: 'Rejected' },
  ]},
  { key: 'date_from', label: 'From', type: 'date' },
  { key: 'date_to',   label: 'To',   type: 'date' },
]

const PAGE_SIZE = 30

// Thumbnail that resolves an event image_url (absolute BKC URL or auth-protected
// local path) into a displayable source; falls back to a camera glyph.
function EventThumb({ src }) {
  const resolved = useImageSrc(src)
  if (!src || resolved === false) return <Camera size={14} className="text-ink-subtle" />
  if (!resolved) return <div className="w-full h-full bg-surface-2 animate-pulse" />
  return <img src={resolved} className="w-full h-full object-cover" alt="Event capture" />
}

export default function EventLogPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState({})
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Selection states for bulk actions
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkUpdating, setBulkUpdating] = useState(false)

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
    setSelectedIds([])
  }, [])

  const handleSearch = useCallback((val) => {
    setSearch(val)
    setPage(1)
    setSelectedIds([])
  }, [])

  const handleBulkUpdate = async (status) => {
    if (selectedIds.length === 0) return
    setBulkUpdating(true)
    try {
      const resolvedBy = user?.full_name || user?.username || 'system'
      const resolutionDesc = status === 'CLOSED'
        ? 'Closed in batch resolution run.'
        : 'Closed as AI false positive / rejected.'
      
      await api.bulkUpdateEvents({
        ids: selectedIds,
        status,
        resolved_by: resolvedBy,
        resolution_desc: resolutionDesc
      })
      
      setSelectedIds([])
      refetch()
    } catch (err) {
      alert(err.message || 'Failed to update safety events')
    } finally {
      setBulkUpdating(false)
    }
  }

  const events = data?.data ?? []
  const total  = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const toggleSelectAll = () => {
    if (events.length > 0 && selectedIds.length === events.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(events.map(ev => ev.event_id))
    }
  }

  const toggleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-4 w-full max-w-[1600px] mx-auto">
      
      {/* Filters block */}
      <FilterPanel
        filters={FILTERS}
        values={filters}
        onChange={handleFilterChange}
        searchValue={search}
        onSearchChange={handleSearch}
      />

      {/* Main logs box */}
      <div className="border border-border rounded-xl bg-surface/40 overflow-hidden shadow-xs relative">
        
        {/* Table Header Section */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2/40">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink uppercase tracking-wider">
              Recorded Safety Events
            </span>
            <span className="text-[12px] font-mono px-2 py-0.5 rounded-full bg-surface text-ink-muted border border-border">
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
            <p className="text-base font-bold text-ink mb-3">{error}</p>
            <button
              onClick={refetch}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-sm font-semibold"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : loading && !events.length ? (
          <SkeletonTable rows={10} cols={7} />
        ) : !events.length ? (
          <div className="p-12 text-center">
            <ListChecks size={28} className="text-ink-subtle mx-auto mb-2" />
            <p className="text-sm font-semibold text-ink-muted">No safety events found matching the filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-surface-2/30 border-b border-border text-[12px] font-bold text-ink-subtle uppercase tracking-wider">
                  <th className="px-6 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={events.length > 0 && selectedIds.length === events.length}
                      onChange={toggleSelectAll}
                      className="rounded border-border bg-surface text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer accent-primary"
                    />
                  </th>
                  <th className="px-6 py-3">Event ID</th>
                  <th className="px-6 py-3">Preview</th>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Camera</th>
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3">Area Name</th>
                  <th className="px-6 py-3">Case Status</th>
                  <th className="px-6 py-3 text-right">View Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {events.map((ev, i) => {
                  const isChecked = selectedIds.includes(ev.event_id)
                  return (
                    <tr
                      key={ev.event_id ?? i}
                      className={`transition-colors duration-150 hover:bg-surface-2/40 ${isChecked ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
                    >
                      <td className="px-6 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(ev.event_id)}
                          className="rounded border-border bg-surface text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer accent-primary"
                        />
                      </td>
                      <td className="px-6 py-3 font-mono font-bold text-ink-subtle">
                        #{ev.event_id}
                      </td>
                      <td className="px-6 py-2">
                        <div className="w-12 h-8 rounded-lg overflow-hidden border border-border bg-surface-2 flex items-center justify-center">
                          <EventThumb src={ev.image_url} />
                        </div>
                      </td>
                      <td className="px-6 py-3 font-mono text-ink-muted">
                        {formatDateTime(ev.detected_at)}
                      </td>
                      <td className="px-6 py-3 font-mono font-bold text-ink">
                        {ev.camera_no}
                      </td>
                      <td className="px-6 py-3 font-mono text-ink-subtle">
                        {ev.company_code}
                      </td>
                      <td className="px-6 py-3 text-ink-muted font-medium">
                        {ev.area_name ?? '—'}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge
                          status={
                            ev.event_status === 'CLOSED' ? 'ok' :
                            ev.event_status === 'DISMISSED' ? 'error' :
                            'warn'
                          }
                          label={
                            ev.event_status === 'CLOSED' ? 'Resolved' :
                            ev.event_status === 'DISMISSED' ? 'Rejected' :
                            ev.event_status || 'New'
                          }
                        />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          to={`/events/${ev.event_id}`}
                          className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all font-semibold"
                        >
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-surface-2/20">
            <span className="text-[13px] text-ink-muted font-medium">
              Showing page <strong className="text-ink font-bold font-mono">{page}</strong> of <strong className="text-ink font-bold font-mono">{totalPages}</strong>
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-2 disabled:opacity-40 disabled:pointer-events-none transition-all font-semibold cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-2 disabled:opacity-40 disabled:pointer-events-none transition-all font-semibold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Operations Drawer */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface-2/95 border border-border p-4 rounded-2xl flex items-center gap-6 shadow-2xl animate-fade-in backdrop-blur-md">
          <span className="text-sm font-bold text-ink font-mono">
            {selectedIds.length} incidents selected
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={bulkUpdating}
              onClick={() => handleBulkUpdate('CLOSED')}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle size={12} /> Bulk Resolve
            </button>
            <button
              disabled={bulkUpdating}
              onClick={() => handleBulkUpdate('DISMISSED')}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <XCircle size={12} /> Bulk Reject
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface text-[13px] font-bold text-ink-muted hover:text-ink transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

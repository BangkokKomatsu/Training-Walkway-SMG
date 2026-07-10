import React from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, Camera, Bell, AlertTriangle, CheckCircle,
  Clock, ChevronRight, Shield, RefreshCw
} from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { useImageSrc } from '../hooks/useImageSrc'
import { api } from '../services/api'
import DashboardCard from '../components/ui/DashboardCard'
import StatusBadge from '../components/ui/StatusBadge'
import { SkeletonMetrics, SkeletonTable } from '../components/ui/LoadingState'
import { formatDateTime, formatConfidence } from '../utils/format'

// Thumbnail that resolves an event image_url (absolute BKC URL or auth-protected
// local path) into a displayable source; falls back to a camera glyph.
function EventThumb({ src }) {
  const resolved = useImageSrc(src)
  if (!src || resolved === false) return <Camera size={14} className="text-ink-subtle" />
  if (!resolved) return <div className="w-full h-full bg-surface-2 animate-pulse" />
  return <img src={resolved} className="w-full h-full object-cover" alt="Event preview" />
}

export default function DashboardPage() {
  const { data, loading, error, refetch } = useAsync(
    () => api.getDashboard(),
    []
  )
  const { data: recentData, loading: recentLoading, refetch: refetchEvents } = useAsync(
    () => api.getEvents({ page: 1, page_size: 10 }),
    []
  )

  // Line chart interactive states
  const [selectedCamera, setSelectedCamera] = React.useState('ALL')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [manualRefreshing, setManualRefreshing] = React.useState(false)

  // Auto-refresh interval (every 30 seconds)
  React.useEffect(() => {
    const timer = setInterval(() => {
      refetch()
      refetchEvents()
    }, 30000)
    return () => clearInterval(timer)
  }, [refetch, refetchEvents])

  const handleManualRefresh = async () => {
    setManualRefreshing(true)
    try {
      await Promise.all([refetch(), refetchEvents()])
    } catch (e) {
      console.error(e)
    } finally {
      setManualRefreshing(false)
    }
  }

  // Prevent flickering: only show full page skeletons on initial load when data is empty
  const isInitialLoading = (loading && !data) || (recentLoading && !recentData)

  if (isInitialLoading) {
    return (
      <div className="space-y-6 w-full max-w-[1600px] mx-auto">
        <SkeletonMetrics />
        <div className="h-14 rounded-xl bg-surface/30 animate-pulse border border-border" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 rounded-xl bg-surface/30 animate-pulse border border-border" />
          <div className="h-72 rounded-xl bg-surface/30 animate-pulse border border-border" />
        </div>
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-20">
        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl max-w-md mx-auto text-center">
          <AlertTriangle className="text-red-500 mb-2" size={32} />
          <h3 className="text-base font-bold text-ink mb-1">Failed to fetch dashboard</h3>
          <p className="text-sm text-ink-muted mb-4">{error}</p>
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-sm font-semibold"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </div>
    )
  }

  const d = data || {}
  const events = recentData?.data || []

  // Build dynamic 7-day trend history
  const trendHistory = d.trend_data ? (() => {
    const history = []
    
    // Generate past 7 days up to today
    for (let i = 6; i >= 0; i--) {
      const dt = new Date()
      dt.setDate(dt.getDate() - i)
      const dateStr = dt.toISOString().split('T')[0] // 'YYYY-MM-DD'
      const label = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      history.push({
        date: dateStr,
        label: label,
        counts: { 'ALL': 0 }
      })
    }
    
    // Populate counts from DB trend_data
    d.trend_data.forEach(row => {
      let rowDateStr = ''
      if (row.event_date) {
        rowDateStr = typeof row.event_date === 'string'
          ? row.event_date.split('T')[0]
          : new Date(row.event_date).toISOString().split('T')[0]
      }
      
      const item = history.find(h => h.date === rowDateStr)
      if (item) {
        const cam = row.camera_no || 'Unknown'
        const count = row.event_count || 0
        item.counts[cam] = (item.counts[cam] || 0) + count
        item.counts['ALL'] = (item.counts['ALL'] || 0) + count
      }
    })
    
    return history
  })() : []

  // Filter trend data
  const filteredTrend = trendHistory.filter(item => {
    if (startDate && item.date < startDate) return false
    if (endDate && item.date > endDate) return false
    return true
  })

  // Aggregate violations by area (location_name), from the same 7-day trend_data
  // and date range filter as the Trend chart — no extra backend query needed.
  const areaChartData = (() => {
    if (!d.trend_data || !d.by_camera) return []
    const locationByCamera = {}
    d.by_camera.forEach(c => { locationByCamera[c.camera_no] = c.location_name || 'Unknown' })

    const totals = {}
    d.trend_data.forEach(row => {
      const rowDateStr = row.event_date
        ? (typeof row.event_date === 'string' ? row.event_date.split('T')[0] : new Date(row.event_date).toISOString().split('T')[0])
        : ''
      if (startDate && rowDateStr < startDate) return
      if (endDate && rowDateStr > endDate) return
      const area = locationByCamera[row.camera_no] || 'Unknown'
      totals[area] = (totals[area] || 0) + (row.event_count || 0)
    })

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  })()

  const maxAreaValue = Math.max(...areaChartData.map(item => item.value), 1)

  // Math coordinates mapping for SVG bar chart
  const trendMax = Math.max(...filteredTrend.map(item => item.counts[selectedCamera] || 0), 5)
  const lWidth = 1200
  const lHeight = 240
  const padL = 48
  const padR = 20
  const padT = 15
  const padB = 40
  const chartW = lWidth - padL - padR
  const chartH = lHeight - padT - padB

  const slotW = chartW / Math.max(filteredTrend.length, 1)
  const barW = Math.min(slotW * 0.5, 56)
  const getBarCenterX = (idx) => padL + slotW * (idx + 0.5)
  const getY = (val) => lHeight - padB - (val / trendMax) * chartH

  const isRefreshing = loading || recentLoading || manualRefreshing

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto">
      
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[12px] text-ink-muted font-bold uppercase tracking-wider">
            Live Monitoring Active (Auto-refreshes every 30s)
          </span>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface/50 text-ink-muted hover:text-ink hover:bg-surface text-sm font-semibold transition-all select-none cursor-pointer ${
            isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <RefreshCw size={12} className={`${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Now</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          icon={Shield}
          label="Events Today"
          value={d.events_today ?? 0}
          tone="primary"
        />
        <DashboardCard
          icon={Activity}
          label="Events This Month"
          value={d.events_month ?? 0}
          sub={d.events_prev_month != null ? `${d.events_prev_month} last month` : undefined}
          tone="neutral"
        />
        <DashboardCard
          icon={Camera}
          label="Cameras Online"
          value={`${d.cameras_online ?? 0} / ${d.cameras_total ?? 0}`}
          sub={d.cameras_offline > 0 ? `${d.cameras_offline} offline` : 'All systems operational'}
          tone={d.cameras_offline > 0 ? 'warn' : 'ok'}
        />
        <DashboardCard
          icon={Bell}
          label="Alerts Success"
          value={`${d.alerts_success ?? 0} / ${d.alerts_total ?? 0}`}
          sub={d.alerts_failed > 0 ? `${d.alerts_failed} notifications failed` : 'All deliveries successful'}
          tone={d.alerts_failed > 0 ? 'err' : 'ok'}
        />
      </div>

      {/* Systems status strip */}
      <div
        className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-border bg-surface/50 dark:bg-surface/30 backdrop-blur-md"
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={d.python_service === 'running' ? 'ok' : 'error'} label="Detection Engine" />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={d.db_status === 'ok' ? 'ok' : 'error'} label="MSSQL Database" />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={d.storage_status === 'ok' ? 'ok' : 'warn'} label="Image Storage" />
        </div>
        {d.last_run && (
          <div className="flex items-center gap-1.5 ml-auto text-sm text-ink-subtle">
            <Clock size={12} className="text-ink-subtle" />
            <span>
              Last detection loop: <span className="font-mono text-ink font-bold">{formatDateTime(d.last_run)}</span>
            </span>
          </div>
        )}
      </div>

      {/* Bento Grid Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Line Chart Bento Box (Daily trend) — full width */}
        <div className="md:col-span-2 lg:col-span-3 p-5 border border-border bg-surface/40 dark:bg-surface/20 rounded-2xl flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Walkway Intrusion Trend</h3>
                <span className="text-[12px] text-ink-muted">Historical event analytics</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedCamera}
                  onChange={e => setSelectedCamera(e.target.value)}
                  className="px-2.5 py-1 text-[12px] font-bold rounded-lg border border-border bg-surface-2 text-ink outline-none cursor-pointer focus:border-primary"
                >
                  <option value="ALL">All Cameras</option>
                  {d.by_camera && d.by_camera.map(cam => (
                    <option key={cam.camera_no} value={cam.camera_no}>
                      {cam.camera_name || cam.camera_no}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1 text-[12px] text-ink-subtle font-semibold">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="px-2 py-0.5 rounded border border-border bg-surface-2 text-ink outline-none"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="px-2 py-0.5 rounded border border-border bg-surface-2 text-ink outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="w-full h-80 relative">
              {filteredTrend.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-ink-subtle">
                  No trend logs match selected filters
                </div>
              ) : (
                <svg viewBox={`0 0 ${lWidth} ${lHeight}`} className="w-full h-full overflow-visible">
                  {/* Grid Lines */}
                  <line x1={padL} y1={padT} x2={lWidth - padR} y2={padT} stroke="var(--border)" strokeDasharray="3 3" className="opacity-30" />
                  <line x1={padL} y1={padT + chartH / 2} x2={lWidth - padR} y2={padT + chartH / 2} stroke="var(--border)" strokeDasharray="3 3" className="opacity-30" />
                  <line x1={padL} y1={lHeight - padB} x2={lWidth - padR} y2={lHeight - padB} stroke="var(--border)" className="opacity-60" />

                  {/* Bars */}
                  {filteredTrend.map((item, idx) => {
                    const val = item.counts[selectedCamera] ?? 0
                    const x = getBarCenterX(idx) - barW / 2
                    const y = getY(val)
                    const h = Math.max((lHeight - padB) - y, 0)
                    return (
                      <g key={idx} className="group/bar">
                        <rect
                          x={x}
                          y={y}
                          width={barW}
                          height={h}
                          rx={3}
                          fill="var(--primary)"
                          className="opacity-90 group-hover/bar:opacity-100 transition-opacity duration-150"
                        />
                        <title>{`${item.label}: ${val} events`}</title>
                      </g>
                    )
                  })}

                  {/* Y-Axis Labels */}
                  <text x={padL - 6} y={padT + 4} textAnchor="end" className="text-[11px] font-mono font-bold fill-ink-subtle">{trendMax}</text>
                  <text x={padL - 6} y={padT + chartH / 2 + 3} textAnchor="end" className="text-[11px] font-mono font-bold fill-ink-subtle">{Math.round(trendMax / 2)}</text>
                  <text x={padL - 6} y={lHeight - padB + 3} textAnchor="end" className="text-[11px] font-mono font-bold fill-ink-subtle">0</text>

                  {/* Y-Axis Title */}
                  <text
                    x={14}
                    y={padT + chartH / 2}
                    textAnchor="middle"
                    transform={`rotate(-90, 14, ${padT + chartH / 2})`}
                    className="text-[11px] font-mono font-bold fill-ink-subtle uppercase tracking-wider"
                  >
                    Events
                  </text>

                  {/* X-Axis Labels */}
                  {filteredTrend.map((item, idx) => (
                    <text
                      key={idx}
                      x={getBarCenterX(idx)}
                      y={lHeight - 22}
                      textAnchor="middle"
                      className="text-[11px] font-mono font-bold fill-ink-subtle"
                    >
                      {item.label}
                    </text>
                  ))}

                  {/* X-Axis Title */}
                  <text
                    x={padL + chartW / 2}
                    y={lHeight - 6}
                    textAnchor="middle"
                    className="text-[11px] font-mono font-bold fill-ink-subtle uppercase tracking-wider"
                  >
                    Date
                  </text>
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Safety Detection Configurations Bento Box */}
        <div className="col-span-1 p-5 border border-border bg-surface/40 dark:bg-surface/20 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider mb-3">AI Safety Engine & Breakdown</h3>
            
            {/* Event Type Breakdown Progress Bar */}
            <div className="mb-4 p-3 rounded-lg bg-surface/50 border border-border/60">
              <span className="text-[11px] font-bold text-ink-subtle uppercase block mb-1.5">Violations Breakdown</span>
              {(() => {
                const intrusionCount = d.intrusion_count ?? 0
                const dwellCount = d.dwell_count ?? 0
                const totalViolations = intrusionCount + dwellCount
                const intrusionPercent = totalViolations > 0 ? Math.round((intrusionCount / totalViolations) * 100) : 0
                const dwellPercent = totalViolations > 0 ? Math.round((dwellCount / totalViolations) * 100) : 0

                return (
                  <>
                    <div className="flex h-2 w-full rounded-full bg-border/60 overflow-hidden">
                      {totalViolations === 0 ? (
                        <div className="bg-border w-full h-full" />
                      ) : (
                        <>
                          <div className="bg-primary transition-all duration-500" style={{ width: `${intrusionPercent}%` }} title={`Intrusion: ${intrusionCount}`} />
                          <div className="bg-ink-subtle transition-all duration-500" style={{ width: `${dwellPercent}%` }} title={`Dwell: ${dwellCount}`} />
                        </>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-ink-muted mt-2">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-primary" />
                        <span>Intrusion ({intrusionCount})</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-ink-subtle" />
                        <span>Dwell ({dwellCount})</span>
                      </span>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Resolution Status — meter list (จัดการเคส 0 ได้ดีกว่า pie) */}
            <div className="mb-4 p-3.5 rounded-lg bg-surface/50 border border-border/60">
              {(() => {
                const rows = [
                  { key: 'New',       count: d.new_count ?? 0,       cls: 'bg-status-warn' },
                  { key: 'Closed',    count: d.closed_count ?? 0,    cls: 'bg-status-ok' },
                  { key: 'Dismissed', count: d.dismissed_count ?? 0, cls: 'bg-status-err' },
                ]
                const total = rows.reduce((s, r) => s + r.count, 0)
                return (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Resolution Status</span>
                      <span className="text-[11px] font-mono text-ink-muted">
                        <span className="font-bold text-ink">{total}</span> total
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {rows.map((r) => {
                        const pct = total > 0 ? Math.round((r.count / total) * 100) : 0
                        return (
                          <div key={r.key} className="flex items-center gap-3">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.cls}`} />
                            <span className="text-[12px] font-semibold text-ink-muted w-20 flex-shrink-0">{r.key}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                              <div className={`h-full rounded-full ${r.cls} transition-all duration-500`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[12px] font-mono font-bold text-ink w-8 text-right tabular-nums">{r.count}</span>
                            <span className="text-[11px] font-mono text-ink-subtle w-9 text-right tabular-nums">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Bar Chart Bento Box (Violations by area) */}
        <div className="md:col-span-2 p-5 border border-border bg-surface/40 dark:bg-surface/20 rounded-2xl flex flex-col shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Violations by Area</h3>
            <span className="text-[12px] text-ink-muted">
              Last 7 days{(startDate || endDate) ? ' · filtered by trend date range' : ''}
            </span>
          </div>

          {/* Custom SVG Bar Chart (Responsive) — fills remaining card height, with axis titles */}
          <div className="flex-1 flex items-stretch gap-2 min-h-[8rem]">
            <div className="flex items-center justify-center px-0.5">
              <span className="text-[10px] font-mono font-bold text-ink-subtle uppercase tracking-wider whitespace-nowrap [writing-mode:vertical-rl] rotate-180">
                Violations
              </span>
            </div>
            <div className="flex-1 flex flex-col">
              <div className="flex-1 w-full flex items-end justify-between pt-5 px-2 sm:px-4">
                {areaChartData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-ink-subtle">
                    No area violation data for the last 7 days
                  </div>
                ) : (
                  areaChartData.map((item, index) => {
                    const barHeightPercent = (item.value / maxAreaValue) * 75 // Max height 75%
                    return (
                      <div key={index} className="flex flex-col items-center flex-1 group h-full justify-end">
                        {/* Value (always visible) */}
                        <span className="text-ink text-[11px] font-bold mb-1 font-mono">
                          {item.value}
                        </span>
                        {/* Bar shape */}
                        <div className="w-6 sm:w-10 md:w-12 bg-surface-2 rounded-t-lg relative overflow-hidden flex items-end justify-center min-h-[4px]" style={{ height: `${barHeightPercent}%` }}>
                          <div className="absolute inset-0 bg-gradient-to-t from-primary to-accent group-hover:brightness-110 transition-all duration-300 rounded-t-lg" />
                        </div>
                        {/* Label */}
                        <span className="mt-2 text-[11px] sm:text-[12px] font-mono font-bold text-ink-muted group-hover:text-ink transition-colors truncate max-w-[70px] sm:max-w-none" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="text-center text-[10px] font-mono font-bold text-ink-subtle uppercase tracking-wider mt-2">
                Area
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Events Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
            Recent Walkway Detection Events
          </h2>
          <Link
            to="/events"
            className="flex items-center gap-1 text-sm text-primary font-bold hover:underline"
          >
            Open Complete Logs <ChevronRight size={13} />
          </Link>
        </div>

        <div className="border border-border rounded-xl bg-surface/40 overflow-hidden shadow-xs">
          {!events.length ? (
            <div className="py-12 text-center text-sm font-medium text-ink-subtle">
              No walkway violations recorded today
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-surface-2/60 border-b border-border text-[12px] font-bold text-ink-subtle uppercase tracking-wider">
                    <th className="px-6 py-3">Preview</th>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Camera ID</th>
                    <th className="px-6 py-3">Detection Area</th>
                    <th className="px-6 py-3">Webhook Delivery</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {events.map((ev, i) => (
                    <tr
                      key={ev.event_id ?? i}
                      className="hover:bg-surface-2/50 transition-colors duration-150"
                    >
                      {/* Image Thumbnail Column */}
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
                      <td className="px-6 py-3 text-ink-muted font-medium">
                        {ev.area_name ?? '—'}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge
                          status={ev.event_status === 'CLOSED' ? 'ok' : ev.alert_sent ? 'ok' : 'warn'}
                          label={ev.event_status === 'CLOSED' ? 'Resolved' : ev.alert_sent ? 'Sent' : 'Pending'}
                        />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          to={`/events/${ev.event_id}`}
                          className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all font-semibold"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

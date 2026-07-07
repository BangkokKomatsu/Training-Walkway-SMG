import React from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, Camera, Bell, AlertTriangle, CheckCircle,
  Clock, ChevronRight, Shield, RefreshCw
} from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import DashboardCard from '../components/ui/DashboardCard'
import StatusBadge from '../components/ui/StatusBadge'
import { SkeletonMetrics, SkeletonTable } from '../components/ui/LoadingState'
import { formatDateTime, formatConfidence } from '../utils/format'

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

  // Map actual camera totals for Bar Chart
  const barChartData = d.by_camera && d.by_camera.length > 0
    ? (() => {
        const hasMultipleCompanies = new Set(d.by_camera.map(c => c.company_code)).size > 1
        return d.by_camera.map(item => ({ 
          name: hasMultipleCompanies ? `${item.camera_no} (${item.company_code})` : item.camera_no, 
          value: item.event_count,
          label: item.camera_name || item.camera_no 
        })).sort((a, b) => a.name.localeCompare(b.name))
      })()
    : []

  const maxBarValue = Math.max(...barChartData.map(item => item.value), 1)

  // Calculations for Donut Chart (Alert success vs failures)
  const alertSuccess = d.alerts_success ?? 0
  const alertFailed = d.alerts_failed ?? 0
  const alertTotal = d.alerts_total ?? 1 // Prevent division by zero
  const successPercentage = Math.round((alertSuccess / alertTotal) * 100)
  
  // SVG Ring values
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const successStrokeDashoffset = circumference - (alertSuccess / alertTotal) * circumference

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

  // Math coordinates mapping for SVG line
  const trendMax = Math.max(...filteredTrend.map(item => item.counts[selectedCamera] || 0), 5)
  const lWidth = 500
  const lHeight = 150
  const padL = 35
  const padR = 20
  const padT = 15
  const padB = 25
  const chartW = lWidth - padL - padR
  const chartH = lHeight - padT - padB

  const getX = (idx) => padL + idx * (chartW / Math.max(filteredTrend.length - 1, 1))
  const getY = (val) => lHeight - padB - (val / trendMax) * chartH

  let linePathD = ''
  let fillPathD = ''
  if (filteredTrend.length > 0) {
    const pts = filteredTrend.map((item, idx) => ({
      x: getX(idx),
      y: getY(item.counts[selectedCamera] ?? 0)
    }))
    linePathD = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    if (pts.length > 0) {
      fillPathD = `${linePathD} L ${pts[pts.length - 1].x} ${lHeight - padB} L ${pts[0].x} ${lHeight - padB} Z`
    }
  }

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
        
        {/* Line Chart Bento Box (Daily trend) */}
        <div className="md:col-span-2 p-5 border border-border bg-surface/40 dark:bg-surface/20 rounded-2xl flex flex-col justify-between shadow-xs">
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

            {/* Custom SVG Line Chart */}
            <div className="w-full h-48 relative">
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

                  {/* Gradient area under the line */}
                  {fillPathD && (
                    <path
                      d={fillPathD}
                      fill="url(#trendGradient)"
                      className="opacity-25"
                    />
                  )}

                  {/* Main Line path */}
                  {linePathD && (
                    <path
                      d={linePathD}
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Circle markers */}
                  {filteredTrend.map((item, idx) => {
                    const x = getX(idx)
                    const val = item.counts[selectedCamera] ?? 0
                    const y = getY(val)
                    return (
                      <g key={idx} className="group/dot">
                        <circle cx={x} cy={y} r="8" className="fill-primary/20 opacity-0 group-hover/dot:opacity-100 transition-opacity duration-150" />
                        <circle cx={x} cy={y} r="4" className="fill-primary stroke-bg stroke-2 cursor-pointer" />
                        <title>{`${item.label}: ${val} events`}</title>
                      </g>
                    )
                  })}

                  {/* Y-Axis Labels */}
                  <text x={padL - 6} y={padT + 4} textAnchor="end" className="text-[11px] font-mono font-bold fill-ink-subtle">{trendMax}</text>
                  <text x={padL - 6} y={padT + chartH / 2 + 3} textAnchor="end" className="text-[11px] font-mono font-bold fill-ink-subtle">{Math.round(trendMax / 2)}</text>
                  <text x={padL - 6} y={lHeight - padB + 3} textAnchor="end" className="text-[11px] font-mono font-bold fill-ink-subtle">0</text>

                  {/* X-Axis Labels */}
                  {filteredTrend.map((item, idx) => (
                    <text
                      key={idx}
                      x={getX(idx)}
                      y={lHeight - 10}
                      textAnchor="middle"
                      className="text-[11px] font-mono font-bold fill-ink-subtle"
                    >
                      {item.label}
                    </text>
                  ))}

                  {/* Gradient definitions */}
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Pie/Donut Chart Bento Box (Alert Delivery) */}
        <div className="col-span-1 p-5 border border-border bg-surface/40 dark:bg-surface/20 rounded-2xl flex flex-col justify-between shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider mb-1">Alert Delivery Health</h3>
            <p className="text-[12px] text-ink-subtle">Success vs Failures (Teams & Email)</p>
          </div>

          {/* SVG Donut Chart */}
          <div className="flex items-center justify-center py-3 relative">
            <svg width="130" height="130" viewBox="0 0 120 120" className="transform -rotate-90">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke="var(--border)"
                strokeWidth="10"
                className="opacity-40"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke="#10B981"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={successStrokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
              {alertFailed > 0 && (
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke="#F43F5E"
                  strokeWidth="10.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (alertFailed / alertTotal) * circumference}
                  strokeLinecap="round"
                  className="transition-all duration-500 transform rotate-180"
                />
              )}
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-bold font-mono text-ink tracking-tighter">
                {successPercentage}%
              </span>
              <span className="text-[11px] uppercase font-bold text-ink-subtle">
                DELIVERED
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-[12px] pt-2 border-t border-border/40">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-emerald-500 flex-shrink-0" />
              <span className="text-ink-muted truncate">Success: <strong className="font-mono text-ink">{alertSuccess}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-rose-500 flex-shrink-0" />
              <span className="text-ink-muted truncate">Failed: <strong className="font-mono text-ink">{alertFailed}</strong></span>
            </div>
          </div>
        </div>

        {/* Bar Chart Bento Box (Violations by camera) */}
        <div className="md:col-span-2 p-5 border border-border bg-surface/40 dark:bg-surface/20 rounded-2xl flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Violations by Camera Feeds</h3>
              <span className="text-[12px] text-ink-muted">Reflecting total violations</span>
            </div>
            
            {/* Custom SVG Bar Chart (Responsive) */}
            <div className="w-full h-48 flex items-end justify-between pt-6 px-2 sm:px-4">
              {barChartData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-ink-subtle">
                  No camera violation events recorded
                </div>
              ) : (
                barChartData.map((item, index) => {
                  const barHeightPercent = (item.value / maxBarValue) * 75 // Max height 75%
                  return (
                    <div key={index} className="flex flex-col items-center flex-1 group h-full justify-end">
                      {/* Tooltip value */}
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-surface border border-border text-ink text-[11px] font-bold py-0.5 px-2 rounded-md mb-2 shadow-sm font-mono -translate-y-1">
                        {item.value} ev
                      </span>
                      {/* Bar shape */}
                      <div className="w-6 sm:w-10 md:w-12 bg-surface-2 rounded-t-lg relative overflow-hidden flex items-end justify-center min-h-[4px]" style={{ height: `${barHeightPercent}%` }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-primary to-accent group-hover:brightness-110 transition-all duration-300 rounded-t-lg" />
                      </div>
                      {/* Label */}
                      <span className="mt-2 text-[11px] sm:text-[12px] font-mono font-bold text-ink-muted group-hover:text-ink transition-colors truncate max-w-[50px] sm:max-w-none" title={item.label}>
                        {item.name}
                      </span>
                    </div>
                  )
                })
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

            <div className="flex flex-col gap-2">
              <div className="p-2 rounded-lg bg-surface/50 border border-border/60 flex justify-between items-center">
                <span className="text-[11px] font-bold text-ink-subtle uppercase">Scope</span>
                <strong className="text-ink font-mono text-[13px]">YOLO11 Nano</strong>
              </div>
              <div className="p-2 rounded-lg bg-surface/50 border border-border/60 flex justify-between items-center">
                <span className="text-[11px] font-bold text-ink-subtle uppercase">Hardware</span>
                <strong className="text-ink font-mono text-[13px] text-primary">CUDA GPU</strong>
              </div>
              <div className="p-2 rounded-lg bg-surface/50 border border-border/60 flex justify-between items-center">
                <span className="text-[11px] font-bold text-ink-subtle uppercase">Dwell Limit</span>
                <strong className="text-ink font-mono text-[13px]">5 Seconds</strong>
              </div>
              <div className="p-2 rounded-lg bg-surface/50 border border-border/60 flex justify-between items-center">
                <span className="text-[11px] font-bold text-ink-subtle uppercase">Cooldown</span>
                <strong className="text-ink font-mono text-[13px]">60 Seconds</strong>
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
                          {ev.image_url ? (
                            <img src={ev.image_url} className="w-full h-full object-cover" alt="Event preview" />
                          ) : (
                            <Camera size={14} className="text-ink-subtle" />
                          )}
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

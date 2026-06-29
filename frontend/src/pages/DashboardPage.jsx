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
  const { data: recentData, loading: recentLoading } = useAsync(
    () => api.getEvents({ page: 1, page_size: 8 }),
    []
  )

  // Line chart interactive states
  const [selectedCamera, setSelectedCamera] = React.useState('ALL')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')

  if (loading || recentLoading) {
    return (
      <div className="space-y-6 w-full max-w-[1360px] mx-auto">
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
          <h3 className="text-sm font-bold text-ink mb-1">Failed to fetch dashboard</h3>
          <p className="text-xs text-ink-muted mb-4">{error}</p>
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-xs font-semibold"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </div>
    )
  }

  const d = data || {}
  const events = recentData?.data || []

  // Extract dynamic values for Bar Chart (Violations per camera)
  const cameraMap = {}
  events.forEach(ev => {
    const cam = ev.camera_no || 'Unknown'
    cameraMap[cam] = (cameraMap[cam] || 0) + 1
  })
  
  // fallback chart data if empty
  const barChartData = Object.keys(cameraMap).length > 0 
    ? Object.entries(cameraMap).map(([name, value]) => ({ name, value }))
    : [
        { name: 'CAM-01', value: 14 },
        { name: 'CAM-02', value: 8 },
        { name: 'CAM-03', value: 11 },
        { name: 'CAM-04', value: 4 }
      ]

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

  // Line Chart Trend Data (Past 7 Days)
  const trendHistory = [
    { date: '2026-06-23', label: '23 Jun', counts: { 'ALL': 14, 'CAM-01': 5, 'CAM-02': 3, 'CAM-03': 4, 'CAM-04': 2 } },
    { date: '2026-06-24', label: '24 Jun', counts: { 'ALL': 18, 'CAM-01': 7, 'CAM-02': 4, 'CAM-03': 5, 'CAM-04': 2 } },
    { date: '2026-06-25', label: '25 Jun', counts: { 'ALL': 16, 'CAM-01': 6, 'CAM-02': 2, 'CAM-03': 6, 'CAM-04': 2 } },
    { date: '2026-06-26', label: '26 Jun', counts: { 'ALL': 22, 'CAM-01': 9, 'CAM-02': 5, 'CAM-03': 5, 'CAM-04': 3 } },
    { date: '2026-06-27', label: '27 Jun', counts: { 'ALL': 15, 'CAM-01': 5, 'CAM-02': 3, 'CAM-03': 4, 'CAM-04': 3 } },
    { date: '2026-06-28', label: '28 Jun', counts: { 'ALL': 25, 'CAM-01': 10, 'CAM-02': 4, 'CAM-03': 8, 'CAM-04': 3 } },
    { date: '2026-06-29', label: '29 Jun', counts: { 'ALL': 28, 'CAM-01': 12, 'CAM-02': 5, 'CAM-03': 7, 'CAM-04': 4 } },
  ]

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

  return (
    <div className="space-y-6 w-full max-w-[1360px] mx-auto">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          sub={d.cameras_offline > 0 ? `${d.cameras_offline} offline` : 'All systems operational'}
        />
        <DashboardCard
          icon={Bell}
          label="Alerts Success"
          value={`${d.alerts_success ?? 0} / ${d.alerts_total ?? 0}`}
          sub={d.alerts_failed > 0 ? `${d.alerts_failed} notifications failed` : 'All deliveries successful'}
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
          <div className="flex items-center gap-1.5 ml-auto text-xs text-ink-subtle">
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
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Walkway Intrusion Trend</h3>
                <span className="text-[10px] text-ink-muted">Historical event analytics</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedCamera}
                  onChange={e => setSelectedCamera(e.target.value)}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-border bg-surface-2 text-ink outline-none cursor-pointer focus:border-primary"
                >
                  <option value="ALL">All Cameras</option>
                  <option value="CAM-01">Camera 1</option>
                  <option value="CAM-02">Camera 2</option>
                  <option value="CAM-03">Camera 3</option>
                  <option value="CAM-04">Camera 4</option>
                </select>

                <div className="flex items-center gap-1 text-[10px] text-ink-subtle font-semibold">
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
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-ink-subtle">
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
                      stroke="var(--color-primary)"
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
                  <text x={padL - 6} y={padT + 4} textAnchor="end" className="text-[8px] font-mono font-bold fill-ink-subtle">{trendMax}</text>
                  <text x={padL - 6} y={padT + chartH / 2 + 3} textAnchor="end" className="text-[8px] font-mono font-bold fill-ink-subtle">{Math.round(trendMax / 2)}</text>
                  <text x={padL - 6} y={lHeight - padB + 3} textAnchor="end" className="text-[8px] font-mono font-bold fill-ink-subtle">0</text>

                  {/* X-Axis Labels */}
                  {filteredTrend.map((item, idx) => (
                    <text
                      key={idx}
                      x={getX(idx)}
                      y={lHeight - 10}
                      textAnchor="middle"
                      className="text-[8px] font-mono font-bold fill-ink-subtle"
                    >
                      {item.label}
                    </text>
                  ))}

                  {/* Gradient definitions */}
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
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
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-1">Alert Delivery Health</h3>
            <p className="text-[10px] text-ink-subtle">Success vs Failures (Teams & Email)</p>
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
              <span className="text-xl font-bold font-mono text-ink tracking-tighter">
                {successPercentage}%
              </span>
              <span className="text-[8px] uppercase font-bold text-ink-subtle">
                DELIVERED
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-border/40">
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
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Violations by Camera Feeds</h3>
              <span className="text-[10px] text-ink-muted">Reflecting recent detections</span>
            </div>
            
            {/* Custom SVG Bar Chart (Responsive) */}
            <div className="w-full h-48 flex items-end justify-between pt-6 px-2 sm:px-4">
              {barChartData.map((item, index) => {
                const barHeightPercent = (item.value / maxBarValue) * 75 // Max height 75%
                return (
                  <div key={index} className="flex flex-col items-center flex-1 group">
                    {/* Tooltip value */}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-surface border border-border text-ink text-[9px] font-bold py-0.5 px-2 rounded-md mb-2 shadow-sm font-mono -translate-y-1">
                      {item.value} ev
                    </span>
                    {/* Bar shape */}
                    <div className="w-6 sm:w-10 md:w-12 bg-surface-2 rounded-t-lg relative overflow-hidden flex items-end justify-center min-h-[4px]" style={{ height: `${barHeightPercent}%` }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-primary to-blue-400 group-hover:brightness-110 transition-all duration-300 rounded-t-lg" />
                    </div>
                    {/* Label */}
                    <span className="mt-2 text-[9px] sm:text-[10px] font-mono font-bold text-ink-muted group-hover:text-ink transition-colors truncate max-w-[50px] sm:max-w-none">
                      {item.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Safety Detection Configurations Bento Box */}
        <div className="col-span-1 p-5 border border-border bg-surface/40 dark:bg-surface/20 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-3">AI Safety Engine</h3>
            <div className="flex flex-col gap-2.5">
              <div className="p-2 rounded-lg bg-surface/50 border border-border/60">
                <span className="text-[8px] font-bold text-ink-subtle uppercase block">Scope</span>
                <strong className="text-ink font-mono text-[11px]">YOLO11 Nano</strong>
              </div>
              <div className="p-2 rounded-lg bg-surface/50 border border-border/60">
                <span className="text-[8px] font-bold text-ink-subtle uppercase block">Hardware</span>
                <strong className="text-ink font-mono text-[11px] text-primary">CUDA GPU</strong>
              </div>
              <div className="p-2 rounded-lg bg-surface/50 border border-border/60">
                <span className="text-[8px] font-bold text-ink-subtle uppercase block">Dwell Limit</span>
                <strong className="text-ink font-mono text-[11px]">5 Seconds</strong>
              </div>
              <div className="p-2 rounded-lg bg-surface/50 border border-border/60">
                <span className="text-[8px] font-bold text-ink-subtle uppercase block">Cooldown</span>
                <strong className="text-ink font-mono text-[11px]">60 Seconds</strong>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Events Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
            Recent Walkway Detection Events
          </h2>
          <Link
            to="/events"
            className="flex items-center gap-1 text-xs text-primary font-bold hover:underline"
          >
            Open Complete Logs <ChevronRight size={13} />
          </Link>
        </div>

        <div className="border border-border rounded-xl bg-surface/40 overflow-hidden shadow-xs">
          {!events.length ? (
            <div className="py-12 text-center text-xs font-medium text-ink-subtle">
              No walkway violations recorded today
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-surface-2/60 border-b border-border text-[10px] font-bold text-ink-subtle uppercase tracking-wider">
                    <th className="px-5 py-3">Preview</th>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Camera ID</th>
                    <th className="px-5 py-3">Detection Area</th>
                    <th className="px-5 py-3">Webhook Delivery</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {events.map((ev, i) => (
                    <tr
                      key={ev.event_id ?? i}
                      className="hover:bg-surface-2/50 transition-colors duration-150"
                    >
                      {/* Image Thumbnail Column */}
                      <td className="px-5 py-2">
                        <div className="w-12 h-8 rounded-lg overflow-hidden border border-border bg-surface-2 flex items-center justify-center">
                          {ev.image_url ? (
                            <img src={ev.image_url} className="w-full h-full object-cover" alt="Event preview" />
                          ) : (
                            <Camera size={14} className="text-ink-subtle" />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-ink-muted">
                        {formatDateTime(ev.detected_at)}
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-ink">
                        {ev.camera_no}
                      </td>
                      <td className="px-5 py-3 text-ink-muted font-medium">
                        {ev.area_name ?? '—'}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          status={ev.event_status === 'CLOSED' ? 'ok' : ev.alert_sent ? 'ok' : 'warn'}
                          label={ev.event_status === 'CLOSED' ? 'Resolved' : ev.alert_sent ? 'Sent' : 'Pending'}
                        />
                      </td>
                      <td className="px-5 py-3 text-right">
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

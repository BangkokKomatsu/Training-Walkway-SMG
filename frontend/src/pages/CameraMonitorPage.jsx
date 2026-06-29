import React, { useState, useEffect } from 'react'
import { Camera, Wifi, WifiOff, Search, RefreshCw, AlertTriangle, X, Undo, Eraser, Save } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import CameraStatusCard from '../components/ui/CameraStatusCard'
import { SkeletonGrid } from '../components/ui/LoadingState'

export default function CameraMonitorPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'online' | 'offline'

  const { data: cameras, loading, error, refetch } = useAsync(
    () => api.getCameras(),
    []
  )

  // Polygon editor states
  const [selectedCam, setSelectedCam] = useState(null)
  const [areaName, setAreaName] = useState('Restricted Area')
  const [points, setPoints] = useState([])
  const [hoverPt, setHoverPt] = useState(null)
  const [saving, setSaving] = useState(false)

  // Fetch existing polygon data when camera changes
  useEffect(() => {
    if (selectedCam) {
      api.getCameraPolygons(selectedCam.camera_no)
        .then(res => {
          if (res && res.length > 0) {
            setAreaName(res[0].area_name || 'Restricted Area')
            try {
              const pts = JSON.parse(res[0].polygon_json).map(([x, y]) => ({ x, y }))
              setPoints(pts)
            } catch {
              setPoints([])
            }
          } else {
            setAreaName('Restricted Area')
            setPoints([])
          }
        })
        .catch(() => {
          setAreaName('Restricted Area')
          setPoints([])
        })
    }
  }, [selectedCam])

  const filtered = (cameras ?? []).filter(c => {
    if (filter === 'online'  && c.status !== 'online')  return false
    if (filter === 'offline' && c.status === 'online')  return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.camera_no?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const online  = (cameras ?? []).filter(c => c.status === 'online').length
  const offline = (cameras ?? []).filter(c => c.status !== 'online').length

  const handleCanvasClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(e.clientX - rect.left)
    const y = Math.round(e.clientY - rect.top)

    // Constrain points to canvas bounds
    const safeX = Math.max(0, Math.min(x, 500))
    const safeY = Math.max(0, Math.min(y, 400))

    setPoints(pts => [...pts, { x: safeX, y: safeY }])
  }

  const handleCanvasMouseMove = (e) => {
    if (points.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(e.clientX - rect.left)
    const y = Math.round(e.clientY - rect.top)
    setHoverPt({
      x: Math.max(0, Math.min(x, 500)),
      y: Math.max(0, Math.min(y, 400))
    })
  }

  const handleSavePolygon = async () => {
    if (points.length < 3) {
      alert('Please plot at least 3 points to close a polygon.')
      return
    }
    setSaving(true)
    try {
      const jsonStr = JSON.stringify(points.map(p => [p.x, p.y]))
      await api.saveCameraPolygons(selectedCam.camera_no, {
        area_name: areaName.trim() || 'Restricted Area',
        polygon_json: jsonStr
      })
      setSelectedCam(null)
      setPoints([])
      setHoverPt(null)
    } catch (err) {
      alert(err.message || 'Failed to save zone')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 w-full max-w-[1360px] mx-auto">
      
      {/* Upper Status & Filters header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface/50 dark:bg-surface/30 backdrop-blur-md">
        
        {/* Connection counts indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
            <Wifi size={13} className="animate-pulse" />
            <span className="text-xs font-bold font-mono">{online}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Online</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/10">
            <WifiOff size={13} />
            <span className="text-xs font-bold font-mono">{offline}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Offline</span>
          </div>
        </div>

        {/* Tab Selection Controls & Search bar */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Status Tabs */}
          <div className="flex rounded-lg p-0.5 bg-surface-2 border border-border">
            {['all', 'online', 'offline'].map(v => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  filter === v
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Search Input bar */}
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
            />
            <input
              type="search"
              placeholder="Search camera..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface-2 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all w-52"
            />
          </div>
        </div>
      </div>

      {/* Main Grid display */}
      {error ? (
        <div className="p-12 text-center max-w-sm mx-auto">
          <AlertTriangle size={28} className="text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-ink mb-3">{error}</p>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-xs font-semibold"
          >
            <RefreshCw size={12} /> Retry feeds
          </button>
        </div>
      ) : loading ? (
        <SkeletonGrid count={8} />
      ) : !filtered.length ? (
        <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-surface/30">
          <Camera size={32} className="text-ink-subtle mx-auto mb-2" />
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">No Camera feeds found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map(cam => (
            <CameraStatusCard
              key={cam.camera_no}
              camera={cam}
              onEditPolygon={setSelectedCam}
            />
          ))}
        </div>
      )}

      {/* Visual Polygon Zone Editor Modal (Locked at 500x400) */}
      {selectedCam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-[850px] rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
            
            {/* Draw Area Canvas */}
            <div className="p-6 flex flex-col items-center justify-center flex-1">
              <span className="text-[10px] font-bold text-ink-subtle uppercase tracking-widest self-start mb-2 pl-0.5">
                Restricted Area Draw Canvas (500 x 400 Grid)
              </span>

              {/* Clickable Frame container */}
              <div
                style={{ width: '500px', height: '400px' }}
                className="relative border border-border rounded-xl bg-zinc-950 overflow-hidden cursor-crosshair select-none shadow-inner"
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={() => setHoverPt(null)}
              >
                {/* Visual Camera lens / grid mesh */}
                <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                <div className="absolute top-4 left-4 flex items-center gap-1.5 text-rose-500 font-mono text-[10px] font-bold tracking-widest uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>REC · {selectedCam.camera_no}</span>
                </div>

                {/* SVG lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {points.length > 0 && (
                    <polygon
                      points={points.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="rgba(244, 63, 94, 0.18)"
                      stroke="#F43F5E"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />
                  )}
                  {points.length > 0 && hoverPt && (
                    <line
                      x1={points[points.length - 1].x}
                      y1={points[points.length - 1].y}
                      x2={hoverPt.x}
                      y2={hoverPt.y}
                      stroke="#F43F5E"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                  )}
                </svg>

                {/* Node Markers */}
                {points.map((p, idx) => (
                  <div
                    key={idx}
                    style={{ left: `${p.x}px`, top: `${p.y}px` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-auto group/node"
                    onClick={(e) => {
                      e.stopPropagation() // Prevent adding point on top of node
                    }}
                  >
                    <div className="w-3 h-3 rounded-full bg-rose-500 border-2 border-white scale-100 group-hover/node:scale-125 transition-transform duration-100 shadow-md shadow-rose-500/30 cursor-pointer" />
                    <span className="absolute -top-4 bg-zinc-900 text-white font-mono text-[8px] font-bold px-1 rounded-sm opacity-0 group-hover/node:opacity-100 transition-opacity">
                      p{idx + 1} ({p.x},{p.y})
                    </span>
                  </div>
                ))}

                {points.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/40 backdrop-blur-xs select-none pointer-events-none">
                    <Camera size={28} className="text-zinc-500 mb-2" />
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Create Restricted Walkway Polygon</span>
                    <span className="text-[9px] text-zinc-600 mt-1">Click around the camera frame grid to define polygon nodes</span>
                  </div>
                )}
              </div>
            </div>

            {/* Editor Configuration Sidebar */}
            <div className="p-6 w-full md:w-72 flex flex-col justify-between bg-surface-2/30">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Polygon Settings</h4>
                    <p className="text-[9px] text-ink-subtle">Assign zone attributes</p>
                  </div>
                  <button
                    onClick={() => { setSelectedCam(null); setPoints([]); }}
                    className="p-1.5 rounded-lg border border-border hover:bg-surface text-ink-muted hover:text-ink transition-all cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-ink-subtle uppercase">Camera Code:</label>
                  <strong className="text-xs font-mono text-ink bg-surface border border-border/80 px-2.5 py-1.5 rounded-lg">
                    {selectedCam.camera_no}
                  </strong>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-ink-subtle uppercase">Area/Zone Name:</label>
                  <input
                    type="text"
                    value={areaName}
                    onChange={e => setAreaName(e.target.value)}
                    placeholder="Restricted Walkway Zone"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>

                {/* Node coordinates readout */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-ink-subtle uppercase">Coordinates ({points.length} nodes):</label>
                  <div className="max-h-36 overflow-y-auto border border-border rounded-lg bg-surface divide-y divide-border/60 p-1">
                    {points.length === 0 ? (
                      <span className="text-[10px] text-zinc-500 font-semibold p-2 block text-center">No nodes plotted yet</span>
                    ) : (
                      points.map((p, i) => (
                        <div key={i} className="flex justify-between px-2.5 py-1 text-[10px] font-mono text-ink-muted">
                          <span>Node #{i + 1}</span>
                          <span className="font-bold text-ink">X: {p.x} · Y: {p.y}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Editing Buttons */}
              <div className="space-y-2 mt-6">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={points.length === 0}
                    onClick={() => setPoints(pts => pts.slice(0, -1))}
                    className="py-2 px-3 border border-border bg-surface rounded-xl text-[10px] font-bold text-ink-muted hover:text-ink disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Undo size={11} /> Undo Point
                  </button>
                  <button
                    disabled={points.length === 0}
                    onClick={() => { setPoints([]); setHoverPt(null); }}
                    className="py-2 px-3 border border-border bg-surface rounded-xl text-[10px] font-bold text-ink-muted hover:text-ink disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eraser size={11} /> Clear
                  </button>
                </div>

                <button
                  disabled={points.length < 3 || saving}
                  onClick={handleSavePolygon}
                  className="w-full py-2.5 px-4 bg-primary text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-primary/10 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Saving Polygon Area...</span>
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Save Restricted Zone</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

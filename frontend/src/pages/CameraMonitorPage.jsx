import React, { useState, useEffect, useRef } from 'react'
import { Camera, Wifi, WifiOff, Search, RefreshCw, AlertTriangle, X, Undo, Eraser, Save, Plus, Edit, Trash2, ImageOff, Eye, EyeOff } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import CameraStatusCard from '../components/ui/CameraStatusCard'
import { SkeletonGrid } from '../components/ui/LoadingState'
import { formatRelative } from '../utils/format'

const SNAPSHOT_SYNC_POLL_MS = 1000
const SNAPSHOT_SYNC_TIMEOUT_MS = 10000

export default function CameraMonitorPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'online' | 'offline'

  const { data: cameras, loading, error, refetch } = useAsync(
    () => api.getCameras(),
    []
  )

  // Camera CRUD states
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('add') // 'add' | 'edit'
  const [formData, setFormData] = useState({
    camera_no: '',
    camera_name: '',
    location_name: '',
    brand: 'hikvision',
    ip_address: '',
    rtsp_port: 554,
    username: '',
    password: '',
    channel: 1,
    stream_type: 'sub',
    custom_rtsp_url: '',
    is_active: true
  })
  const [formSaving, setFormSaving] = useState(false)

  // Camera Scheduling States
  const [scheduleRules, setScheduleRules] = useState([])
  const [newRuleDays, setNewRuleDays] = useState([])
  const [newRuleStart, setNewRuleStart] = useState('08:00')
  const [newRuleEnd, setNewRuleEnd] = useState('17:00')

  const toggleNewRuleDay = (day) => {
    setNewRuleDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleAddRule = (e) => {
    e.preventDefault()
    if (newRuleDays.length === 0) {
      alert('Please select at least one day.')
      return
    }
    if (!newRuleStart || !newRuleEnd) {
      alert('Please select start and end times.')
      return
    }
    if (newRuleStart >= newRuleEnd) {
      alert('Start time must be before end time.')
      return
    }
    const newRule = {
      days: newRuleDays,
      start_time: newRuleStart,
      end_time: newRuleEnd
    }
    setScheduleRules(prev => [...prev, newRule])
    setNewRuleDays([])
  }

  const handleDeleteRule = (idx) => {
    setScheduleRules(prev => prev.filter((_, i) => i !== idx))
  }

  const handleAddClick = () => {
    setFormMode('add')
    setFormData({
      camera_no: '',
      camera_name: '',
      location_name: '',
      brand: 'hikvision',
      ip_address: '',
      rtsp_port: 554,
      username: '',
      password: '',
      channel: 1,
      stream_type: 'sub',
      custom_rtsp_url: '',
      is_active: true
    })
    setScheduleRules([])
    setNewRuleDays([])
    setNewRuleStart('08:00')
    setNewRuleEnd('17:00')
    setFormOpen(true)
  }

  const handleEditClick = (cam) => {
    let rules = []
    if (cam.schedule_json) {
      try {
        rules = JSON.parse(cam.schedule_json)
      } catch (e) {
        rules = []
      }
    }
    setFormMode('edit')
    setFormData({
      camera_no: cam.camera_no || '',
      camera_name: cam.camera_name || '',
      location_name: cam.location_name || '',
      brand: cam.brand || 'hikvision',
      ip_address: cam.ip_address || '',
      rtsp_port: cam.rtsp_port ?? 554,
      username: cam.username || '',
      password: cam.password || '',
      channel: cam.channel ?? 1,
      stream_type: cam.stream_type || 'sub',
      custom_rtsp_url: (cam.brand?.toLowerCase() === 'generic' ? cam.rtsp_url : ''),
      is_active: cam.is_active ?? true
    })
    setScheduleRules(rules)
    setNewRuleDays([])
    setNewRuleStart('08:00')
    setNewRuleEnd('17:00')
    setFormOpen(true)
  }

  const handleDeleteClick = async (cam) => {
    if (window.confirm(`Are you sure you want to delete camera ${cam.camera_no} (${cam.camera_name || ''})?`)) {
      try {
        await api.deleteCamera(cam.camera_no)
        refetch()
      } catch (err) {
        alert(err.message || 'Failed to delete camera')
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormSaving(true)
    try {
      const payload = {
        ...formData,
        schedule_json: scheduleRules.length > 0 ? JSON.stringify(scheduleRules) : null
      }
      if (formMode === 'add') {
        await api.createCamera(payload)
      } else {
        await api.updateCamera(formData.camera_no, payload)
      }
      setFormOpen(false)
      refetch()
    } catch (err) {
      alert(err.message || 'Failed to save camera')
    } finally {
      setFormSaving(false)
    }
  }

  // Polygon editor states
  const [selectedCam, setSelectedCam] = useState(null)
  const [areas, setAreas] = useState([])          // โซนที่บันทึก/เพิ่มไว้แล้ว: [{ area_name, points }]
  const [areaName, setAreaName] = useState('Restricted Area')
  const [points, setPoints] = useState([])        // โซนที่กำลังวาดอยู่ตอนนี้
  const [hoverPt, setHoverPt] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)   // toggle รูปลูกตาช่อง password

  // Camera snapshot preview states (Draw Polygon background)
  const [snapshotUrl, setSnapshotUrl] = useState(null)
  const [snapshotAt, setSnapshotAt] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)
  const snapshotBlobUrlRef = useRef(null)
  const syncPollRef = useRef(null)

  const revokeSnapshotBlobUrl = () => {
    if (snapshotBlobUrlRef.current) {
      URL.revokeObjectURL(snapshotBlobUrlRef.current)
      snapshotBlobUrlRef.current = null
    }
  }

  const applySnapshotInfo = async (info) => {
    revokeSnapshotBlobUrl()
    setSnapshotAt(info?.last_snapshot_at || null)
    if (info?.mode === 'bkc' && info.snapshot_url) {
      setSnapshotUrl(info.snapshot_url)
    } else if (info?.mode === 'local' && info.snapshot_url) {
      try {
        const blobUrl = await api.getCameraSnapshotBlobUrl(selectedCam.camera_no)
        snapshotBlobUrlRef.current = blobUrl
        setSnapshotUrl(blobUrl)
      } catch {
        setSnapshotUrl(null)
      }
    } else {
      setSnapshotUrl(null)
    }
  }

  // Fetch existing polygon data + snapshot preview when camera changes
  useEffect(() => {
    if (selectedCam) {
      setPoints([])
      setHoverPt(null)
      api.getCameraPolygons(selectedCam.camera_no)
        .then(res => {
          const loaded = (res || []).map(a => {
            try {
              return { area_name: a.area_name || 'Restricted Area', points: JSON.parse(a.polygon_json).map(([x, y]) => ({ x, y })) }
            } catch {
              return null
            }
          }).filter(Boolean)
          setAreas(loaded)
          setAreaName(`Restricted Area ${loaded.length + 1}`)
        })
        .catch(() => {
          setAreas([])
          setAreaName('Restricted Area 1')
        })

      setSyncError(null)
      api.getCameraSnapshot(selectedCam.camera_no)
        .then(applySnapshotInfo)
        .catch(() => applySnapshotInfo(null))
    } else {
      revokeSnapshotBlobUrl()
      setSnapshotUrl(null)
      setSnapshotAt(null)
      setSyncError(null)
      clearInterval(syncPollRef.current)
      setSyncing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCam])

  // เคลียร์ blob URL + poll timer ตอน component unmount
  useEffect(() => {
    return () => {
      revokeSnapshotBlobUrl()
      clearInterval(syncPollRef.current)
    }
  }, [])

  const handleSyncSnapshot = async () => {
    if (!selectedCam || syncing) return
    setSyncing(true)
    setSyncError(null)
    const baselineAt = snapshotAt

    try {
      await api.requestCameraSnapshotSync(selectedCam.camera_no)
    } catch (err) {
      setSyncing(false)
      setSyncError(err.message || 'Failed to request snapshot sync')
      return
    }

    const startedAt = Date.now()
    syncPollRef.current = setInterval(async () => {
      if (Date.now() - startedAt >= SNAPSHOT_SYNC_TIMEOUT_MS) {
        clearInterval(syncPollRef.current)
        setSyncing(false)
        setSyncError('ขอภาพสดไม่สำเร็จ (บริการตรวจจับอาจไม่ได้ทำงาน หรือกล้องนี้อยู่ระหว่างสลับคิว) — แสดงภาพล่าสุดที่มีอยู่แทน')
        return
      }
      try {
        const info = await api.getCameraSnapshot(selectedCam.camera_no)
        if (info?.last_snapshot_at && info.last_snapshot_at !== baselineAt) {
          clearInterval(syncPollRef.current)
          await applySnapshotInfo(info)
          setSyncing(false)
        }
      } catch {
        // ข้าม tick นี้ไป ลอง poll รอบถัดไป จนกว่าจะ timeout
      }
    }, SNAPSHOT_SYNC_POLL_MS)
  }

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

  // เพิ่มโซนที่กำลังวาดเข้า "รายการโซน" แล้วเคลียร์ canvas เพื่อวาดโซนถัดไป
  const handleAddZone = () => {
    if (points.length < 3) {
      alert('ปักอย่างน้อย 3 จุดก่อนเพิ่มเป็นโซน')
      return
    }
    const next = [...areas, { area_name: areaName.trim() || `Restricted Area ${areas.length + 1}`, points }]
    setAreas(next)
    setPoints([])
    setHoverPt(null)
    setAreaName(`Restricted Area ${next.length + 1}`)
  }

  const handleDeleteZone = (idx) => {
    setAreas(areas.filter((_, i) => i !== idx))
  }

  // บันทึกทุกโซนของกล้องนี้ (รวมโซนที่ยังวาดค้างอยู่ ถ้าครบ 3 จุด) — backend ลบของเดิมแล้วเขียนใหม่ทั้งชุด
  const handleSavePolygon = async () => {
    const pending = points.length >= 3
      ? [{ area_name: areaName.trim() || `Restricted Area ${areas.length + 1}`, points }]
      : []
    const allZones = [...areas, ...pending]
    if (allZones.length === 0) {
      alert('ต้องมีอย่างน้อย 1 โซน (ปักอย่างน้อย 3 จุด) ก่อนบันทึก')
      return
    }
    setSaving(true)
    try {
      await api.saveCameraPolygons(selectedCam.camera_no, {
        areas: allZones.map(z => ({
          area_name: z.area_name,
          polygon_json: JSON.stringify(z.points.map(p => [p.x, p.y])),
        })),
      })
      setSelectedCam(null)
      setAreas([])
      setPoints([])
      setHoverPt(null)
    } catch (err) {
      alert(err.message || 'Failed to save zones')
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
            <span className="text-sm font-bold font-mono">{online}</span>
            <span className="text-[12px] uppercase font-bold tracking-wider opacity-80">Online</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/10">
            <WifiOff size={13} />
            <span className="text-sm font-bold font-mono">{offline}</span>
            <span className="text-[12px] uppercase font-bold tracking-wider opacity-80">Offline</span>
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
                className={`px-3.5 py-1.5 rounded-md text-[13px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
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
              className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-border bg-surface-2 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all w-52"
            />
          </div>

          {/* Add Camera Button */}
          <button
            onClick={handleAddClick}
            className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-bold hover:shadow-lg hover:shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Camera</span>
          </button>
        </div>
      </div>

      {/* Main Grid display */}
      {error ? (
        <div className="p-12 text-center max-w-sm mx-auto">
          <AlertTriangle size={28} className="text-rose-500 mx-auto mb-2" />
          <p className="text-base font-bold text-ink mb-3">{error}</p>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-sm font-semibold"
          >
            <RefreshCw size={12} /> Retry feeds
          </button>
        </div>
      ) : loading ? (
        <SkeletonGrid count={8} />
      ) : !filtered.length ? (
        <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-surface/30">
          <Camera size={32} className="text-ink-subtle mx-auto mb-2" />
          <p className="text-sm font-bold text-ink-muted uppercase tracking-wider">No Camera feeds found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map(cam => (
            <CameraStatusCard
              key={`${cam.company_code}_${cam.camera_no}`}
              camera={cam}
              onEditPolygon={setSelectedCam}
              onEditCamera={handleEditClick}
              onDeleteCamera={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Visual Polygon Zone Editor Modal (Locked at 500x400) */}
      {selectedCam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-[850px] max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
            
            {/* Draw Area Canvas */}
            <div className="p-6 flex flex-col items-center justify-center flex-1">
              <span className="text-[12px] font-bold text-ink-subtle uppercase tracking-widest self-start mb-2 pl-0.5">
                Restricted Area Draw Canvas (500 x 400 Grid)
              </span>

              {/* Clickable Frame container */}
              <div
                style={{ width: '500px', height: '400px' }}
                className="relative border border-border bg-zinc-950 overflow-hidden cursor-crosshair select-none shadow-inner"
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={() => setHoverPt(null)}
              >
                {/* ภาพ snapshot จริงจากกล้อง (ถ้ามี) — ไม่ใช่ live stream แค่ภาพนิ่งที่ sync ล่าสุด */}
                {snapshotUrl && (
                  <img
                    src={snapshotUrl}
                    alt={`Snapshot ${selectedCam.camera_no}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                {/* Visual grid mesh — ช่วยกะระยะตอนปักจุด polygon */}
                <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                <div className="absolute top-4 left-4 flex items-center gap-1.5 text-[12px] font-bold tracking-widest uppercase bg-black/40 px-2 py-1 rounded-md">
                  <span className={`w-2 h-2 rounded-full ${snapshotUrl ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                  <span className="text-white font-mono">{selectedCam.camera_no}</span>
                  <span className="text-zinc-400 font-mono normal-case tracking-normal">
                    · {snapshotAt ? `อัปเดตล่าสุด ${formatRelative(snapshotAt)}` : 'ยังไม่มีภาพ'}
                  </span>
                </div>

                {/* SVG lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* โซนที่บันทึก/เพิ่มไว้แล้ว (สีเหลืองอำพัน + เลขกำกับ) */}
                  {areas.map((zone, zi) => {
                    const cx = zone.points.reduce((s, p) => s + p.x, 0) / zone.points.length
                    const cy = zone.points.reduce((s, p) => s + p.y, 0) / zone.points.length
                    return (
                      <g key={`zone-${zi}`}>
                        <polygon
                          points={zone.points.map(p => `${p.x},${p.y}`).join(' ')}
                          fill="rgba(245, 158, 11, 0.15)"
                          stroke="#F59E0B"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                        <text
                          x={cx} y={cy} fill="#FBBF24" fontSize="13" fontWeight="700"
                          textAnchor="middle" dominantBaseline="middle"
                          style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.65)', strokeWidth: 3 }}
                        >
                          {zi + 1}
                        </text>
                      </g>
                    )
                  })}
                  {/* โซนที่กำลังวาดอยู่ (สีแดง) */}
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
                    <span className="absolute -top-4 bg-zinc-900 text-white font-mono text-[11px] font-bold px-1 rounded-sm opacity-0 group-hover/node:opacity-100 transition-opacity">
                      p{idx + 1} ({p.x},{p.y})
                    </span>
                  </div>
                ))}

                {points.length === 0 && !snapshotUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/40 backdrop-blur-xs select-none pointer-events-none">
                    <ImageOff size={28} className="text-zinc-500 mb-2" />
                    <span className="text-[13px] font-bold text-zinc-400 uppercase tracking-widest">ยังไม่มีภาพจากกล้องนี้</span>
                    <span className="text-[11px] text-zinc-600 mt-1">กดปุ่ม "Sync ภาพล่าสุด" ด้านขวาเพื่อขอภาพจริงจากกล้อง</span>
                  </div>
                )}
                {points.length === 0 && snapshotUrl && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-xs select-none pointer-events-none">
                    <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-widest">คลิกบนภาพเพื่อปักจุด Polygon</span>
                  </div>
                )}
              </div>
            </div>

            {/* Editor Configuration Sidebar */}
            <div className="p-6 w-full md:w-72 flex flex-col justify-between bg-surface-2/30">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-ink uppercase tracking-wider">Polygon Settings</h4>
                    <p className="text-[11px] text-ink-subtle">Assign zone attributes</p>
                  </div>
                  <button
                    onClick={() => { setSelectedCam(null); setPoints([]); }}
                    className="p-1.5 rounded-lg border border-border hover:bg-surface text-ink-muted hover:text-ink transition-all cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-ink-subtle uppercase">Camera Code:</label>
                  <strong className="text-sm font-mono text-ink bg-surface border border-border/80 px-2.5 py-1.5 rounded-lg">
                    {selectedCam.camera_no}
                  </strong>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    disabled={syncing}
                    onClick={handleSyncSnapshot}
                    className="w-full py-2 px-3 rounded-lg border border-border bg-surface text-[12px] font-bold text-ink-muted hover:text-primary hover:border-primary/50 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                    <span>{syncing ? 'กำลังขอภาพสด...' : 'Sync ภาพล่าสุด'}</span>
                  </button>
                  {syncError && (
                    <p className="text-[11px] text-rose-500 font-semibold leading-relaxed">{syncError}</p>
                  )}
                </div>

                {/* รายการโซนที่บันทึก/เพิ่มไว้แล้วในกล้องนี้ */}
                {areas.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-ink-subtle uppercase">Saved Zones ({areas.length}):</label>
                    <div className="max-h-28 overflow-y-auto border border-border rounded-lg bg-surface divide-y divide-border/60">
                      {areas.map((zone, zi) => (
                        <div key={zi} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="flex-none w-4 h-4 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-bold flex items-center justify-center">{zi + 1}</span>
                            <span className="text-[12px] text-ink truncate">{zone.area_name}</span>
                          </span>
                          <button
                            onClick={() => handleDeleteZone(zi)}
                            className="flex-none p-1 rounded text-ink-subtle hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                            title="ลบโซนนี้"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-ink-subtle uppercase">
                    Area/Zone Name: <span className="text-primary normal-case">(กำลังวาดโซน #{areas.length + 1})</span>
                  </label>
                  <input
                    type="text"
                    value={areaName}
                    onChange={e => setAreaName(e.target.value)}
                    placeholder="Restricted Walkway Zone"
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-surface text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>

                {/* Node coordinates readout */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-ink-subtle uppercase">Coordinates ({points.length} nodes):</label>
                  <div className="max-h-36 overflow-y-auto border border-border rounded-lg bg-surface divide-y divide-border/60 p-1">
                    {points.length === 0 ? (
                      <span className="text-[12px] text-zinc-500 font-semibold p-2 block text-center">No nodes plotted yet</span>
                    ) : (
                      points.map((p, i) => (
                        <div key={i} className="flex justify-between px-2.5 py-1 text-[12px] font-mono text-ink-muted">
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
                    className="py-2 px-3 border border-border bg-surface rounded-xl text-[12px] font-bold text-ink-muted hover:text-ink disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Undo size={11} /> Undo Point
                  </button>
                  <button
                    disabled={points.length === 0}
                    onClick={() => { setPoints([]); setHoverPt(null); }}
                    className="py-2 px-3 border border-border bg-surface rounded-xl text-[12px] font-bold text-ink-muted hover:text-ink disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eraser size={11} /> Clear
                  </button>
                </div>

                <button
                  disabled={points.length < 3}
                  onClick={handleAddZone}
                  className="w-full py-2 px-4 border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-[13px] font-bold hover:bg-amber-500/20 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} /> เพิ่มเป็นโซน (วาดโซนถัดไปต่อได้)
                </button>

                <button
                  disabled={saving || (areas.length === 0 && points.length < 3)}
                  onClick={handleSavePolygon}
                  className="w-full py-2.5 px-4 bg-primary text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/10 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Save All Zones ({areas.length + (points.length >= 3 ? 1 : 0)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Sleek Camera Configuration Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-[650px] max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl flex flex-col p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h4 className="text-base font-bold text-ink uppercase tracking-wider">
                  {formMode === 'add' ? 'Add New Camera' : 'Edit Camera Configuration'}
                </h4>
                <p className="text-[12px] text-ink-subtle">Configure connection credentials and details</p>
              </div>
              <button
                onClick={() => setFormOpen(false)}
                className="p-1.5 rounded-lg border border-border hover:bg-surface-2 text-ink-muted hover:text-ink transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Camera ID / Code */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-ink-subtle uppercase">Camera Code / No (e.g. CAM-04):</label>
                  <input
                    type="text"
                    required
                    disabled={formMode === 'edit'}
                    value={formData.camera_no}
                    onChange={e => setFormData({ ...formData, camera_no: e.target.value.toUpperCase() })}
                    placeholder="CAM-04"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-50 transition-all font-mono"
                  />
                </div>

                {/* Camera Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-ink-subtle uppercase">Camera Name:</label>
                  <input
                    type="text"
                    required
                    value={formData.camera_name}
                    onChange={e => setFormData({ ...formData, camera_name: e.target.value })}
                    placeholder="กล้องอาคาร 3 ทางเข้า"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>

                {/* Location / Site */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[12px] font-bold text-ink-subtle uppercase">Install Location:</label>
                  <input
                    type="text"
                    required
                    value={formData.location_name}
                    onChange={e => setFormData({ ...formData, location_name: e.target.value })}
                    placeholder="อาคาร 3 ทางเดิน A ฝั่งเหนือ"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>

                {/* Brand */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-ink-subtle uppercase">Brand / Manufacturer:</label>
                  <select
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface-2 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer transition-all font-semibold"
                  >
                    <option value="hikvision">Hikvision</option>
                    <option value="dahua">Dahua</option>
                    <option value="panasonic">Panasonic</option>
                    <option value="generic">Generic / Other</option>
                  </select>
                </div>

                {/* Stream Type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-ink-subtle uppercase">Stream Type:</label>
                  <select
                    value={formData.stream_type}
                    onChange={e => setFormData({ ...formData, stream_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface-2 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer transition-all font-semibold"
                  >
                    <option value="sub">Sub Stream (Recommended for Detection)</option>
                    <option value="main">Main Stream (High Quality)</option>
                  </select>
                </div>

                {/* Only render fields if NOT Generic, or if Generic we can let them type custom rtsp URL */}
                {formData.brand !== 'generic' ? (
                  <>
                    {/* IP Address */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-bold text-ink-subtle uppercase">IP Address:</label>
                      <input
                        type="text"
                        required
                        value={formData.ip_address}
                        onChange={e => setFormData({ ...formData, ip_address: e.target.value })}
                        placeholder="192.168.1.100"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                      />
                    </div>

                    {/* RTSP Port */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-bold text-ink-subtle uppercase">RTSP Port (Default 554):</label>
                      <input
                        type="number"
                        required
                        value={formData.rtsp_port}
                        onChange={e => setFormData({ ...formData, rtsp_port: parseInt(e.target.value) || 554 })}
                        placeholder="554"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                      />
                    </div>

                    {/* Username */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-bold text-ink-subtle uppercase">Username:</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                        placeholder="admin"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                      />
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-bold text-ink-subtle uppercase">Password:</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-surface text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                          title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-subtle hover:text-ink hover:bg-surface-2 transition-all cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Channel */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-bold text-ink-subtle uppercase">Channel Number (1, 2, 3...):</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.channel}
                        onChange={e => setFormData({ ...formData, channel: parseInt(e.target.value) || 1 })}
                        placeholder="1"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[12px] font-bold text-ink-subtle uppercase">Custom RTSP URL:</label>
                    <input
                      type="text"
                      required
                      value={formData.custom_rtsp_url}
                      onChange={e => setFormData({ ...formData, custom_rtsp_url: e.target.value })}
                      placeholder="rtsp://admin:password@192.168.1.100:554/live/path"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                    />
                  </div>
                )}

                {/* Detection Schedules */}
                <div className="md:col-span-2 border-t border-border/60 pt-4 space-y-4">
                  <div>
                    <h5 className="text-[13px] font-bold text-ink uppercase tracking-wider">Detection Schedules</h5>
                    <p className="text-[12px] text-ink-subtle">Set active days and hours. Leave empty for 24/7 detection.</p>
                  </div>

                  {/* List of active rules */}
                  {scheduleRules.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {scheduleRules.map((rule, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2/40 text-[13px]">
                          <div className="flex flex-col gap-1 pr-2">
                            <span className="font-bold text-ink">
                              {rule.days.map(d => d.substring(0, 3)).join(', ')}
                            </span>
                            <span className="text-ink-muted font-mono text-[12px]">
                              {rule.start_time} - {rule.end_time}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(idx)}
                            className="p-1.5 rounded-lg border border-border hover:bg-rose-500/10 hover:border-rose-500/20 text-rose-500 hover:text-rose-600 transition-all cursor-pointer flex-shrink-0"
                            title="Delete Schedule Rule"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 text-center border border-dashed border-border rounded-xl bg-surface-2/10 text-ink-subtle text-[13px] font-semibold tracking-wide">
                      ⚡ 24/7 Continuous Detection (No scheduling limits)
                    </div>
                  )}

                  {/* Add rule sub-form */}
                  <div className="p-4 rounded-xl border border-border bg-surface-2/20 space-y-3">
                    <span className="text-[12px] font-bold text-ink uppercase tracking-wider block">Add New Schedule Rule</span>
                    
                    {/* Days selector */}
                    <div className="space-y-1.5">
                      <label className="text-[12px] text-ink-subtle font-bold uppercase tracking-wide">Select Days:</label>
                      <div className="flex flex-wrap gap-1">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => {
                          const isSel = newRuleDays.includes(d);
                          const short = d.substring(0, 3);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => toggleNewRuleDay(d)}
                              className={`px-3 py-1.5 rounded-lg border text-[12px] font-bold tracking-wider transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-primary border-primary text-white shadow-xs'
                                  : 'bg-surface border-border text-ink-muted hover:text-ink'
                              }`}
                            >
                              {short}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Time range */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[12px] text-ink-subtle font-bold uppercase tracking-wide">Start Time:</label>
                        <input
                          type="time"
                          value={newRuleStart}
                          onChange={e => setNewRuleStart(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[12px] text-ink-subtle font-bold uppercase tracking-wide">End Time:</label>
                        <input
                          type="time"
                          value={newRuleEnd}
                          onChange={e => setNewRuleEnd(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Add Button */}
                    <button
                      type="button"
                      onClick={handleAddRule}
                      className="w-full py-2 px-3 border border-dashed border-primary/30 hover:border-primary text-primary hover:bg-primary/5 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} /> Add Rule to Schedule
                    </button>
                  </div>
                </div>

                {/* Enabled Status Switch */}
                <div className="flex items-center gap-3 pt-4 md:col-span-2">
                  <input
                    type="checkbox"
                    id="camera_is_active"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary bg-surface border-border rounded-sm focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="camera_is_active" className="text-sm font-bold text-ink select-none cursor-pointer">
                    Enable camera detection pipeline (Active)
                  </label>
                </div>

              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 border border-border hover:bg-surface-2 text-ink-muted hover:text-ink rounded-xl text-sm font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-5 py-2 bg-primary text-white hover:brightness-110 active:scale-[0.98] rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  {formSaving ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Save Camera</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

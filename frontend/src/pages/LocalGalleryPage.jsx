import React, { useState, useMemo } from 'react'
import { Images, FolderOpen, RefreshCw, AlertCircle, ChevronDown, ChevronRight, Camera, Calendar, ZoomIn, Filter } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { useImageSrc } from '../hooks/useImageSrc'
import { api } from '../services/api'
import { formatDateTime } from '../utils/format'

function rawUrl(p) {
  return `/api/local-images/raw?path=${encodeURIComponent(p)}`
}

// thumbnail เล็กในแต่ละแถว — คลิกเพื่อดูภาพใหญ่
function RowThumb({ path, name, onClick }) {
  const resolved = useImageSrc(rawUrl(path))
  return (
    <button
      type="button"
      onClick={onClick}
      title="คลิกดูภาพใหญ่"
      className="relative w-[72px] h-[54px] flex-shrink-0 rounded-md overflow-hidden border border-border bg-surface-2 flex items-center justify-center group cursor-zoom-in"
    >
      {resolved === false ? (
        <Images size={16} className="text-ink-subtle opacity-60" />
      ) : !resolved ? (
        <div className="w-full h-full animate-pulse bg-surface-2" />
      ) : (
        <img src={resolved} alt={name} className="w-full h-full object-cover" loading="lazy" />
      )}
      {resolved && resolved !== false && (
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <ZoomIn size={14} className="text-white" />
        </div>
      )}
    </button>
  )
}

// Lightbox ภาพใหญ่ — คลิกที่ใดก็ได้เพื่อปิด (pattern เดียวกับ ImagePreview)
function Lightbox({ image, onClose }) {
  const resolved = useImageSrc(rawUrl(image.path))
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer animate-fade-in"
    >
      <div className="relative max-w-5xl max-h-[85vh] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 p-1 flex items-center justify-center">
        {resolved && resolved !== false ? (
          <img src={resolved} alt={image.name} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
        ) : (
          <div className="w-[60vw] h-[40vh] max-w-[520px] flex items-center justify-center">
            {resolved === false ? (
              <span className="text-zinc-400 text-sm">โหลดรูปไม่สำเร็จ</span>
            ) : (
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            )}
          </div>
        )}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1.5 rounded-full text-[12px] font-mono text-white pointer-events-none max-w-[90%] truncate">
          {image.name} · คลิกเพื่อปิด
        </div>
      </div>
    </div>
  )
}

// โฟลเดอร์ย่อยของไฟล์ = ทุกส่วนของ path ยกเว้นชื่อไฟล์ (เช่น "1/20260710")
function folderOf(p) {
  const parts = p.split('/')
  parts.pop()
  return parts.join('/') || '(root)'
}

// YYYYMMDD → YYYY-MM-DD
function fmtDate(d) {
  return /^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d
}

export default function LocalGalleryPage() {
  const { data, loading, error, refetch } = useAsync(() => api.getLocalImages(), [])
  const images = data?.images ?? []
  const baseFolder = data?.base_folder
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [preview, setPreview] = useState(null)
  const [filterCamera, setFilterCamera] = useState('')
  const [filterDate, setFilterDate] = useState('')

  const toggle = (folder) =>
    setCollapsed((s) => {
      const n = new Set(s)
      n.has(folder) ? n.delete(folder) : n.add(folder)
      return n
    })

  // รายการกล้อง/วันที่ที่มีอยู่จริง (ดึงจาก path ของรูป) — ไว้ทำ dropdown ตัวกรอง
  const { cameras, dates } = useMemo(() => {
    const cams = new Set()
    const dts = new Set()
    for (const img of images) {
      const [c, d] = folderOf(img.path).split('/')
      if (c && c !== '(root)') cams.add(c)
      if (d) dts.add(d)
    }
    return { cameras: [...cams].sort(), dates: [...dts].sort().reverse() } // วันที่ใหม่→เก่า
  }, [images])

  // group ตามโฟลเดอร์ย่อยโดยรักษาลำดับ (images เรียงใหม่→เก่ามาแล้ว) + ใช้ตัวกรอง
  const groups = useMemo(() => {
    const map = new Map()
    for (const img of images) {
      const [c, d] = folderOf(img.path).split('/')
      if (filterCamera && c !== filterCamera) continue
      if (filterDate && d !== filterDate) continue
      const key = folderOf(img.path)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(img)
    }
    return [...map.entries()].map(([folder, imgs]) => ({ folder, imgs }))
  }, [images, filterCamera, filterDate])

  const visibleCount = groups.reduce((n, g) => n + g.imgs.length, 0)
  const isFiltered = !!(filterCamera || filterDate)

  return (
    <div className="space-y-4 w-full max-w-[1360px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface/50 dark:bg-surface/30 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <Images size={16} className="text-primary flex-shrink-0" />
          <span className="text-base font-bold text-ink">Local Image Gallery</span>
          <span className="text-sm font-mono px-2 py-0.5 rounded-full bg-surface text-ink-muted border border-border">
            {isFiltered ? `${visibleCount}/${images.length}` : images.length} รูป · {groups.length} โฟลเดอร์
          </span>
        </div>
        <button
          onClick={refetch}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-sm font-semibold cursor-pointer transition-all"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* โฟลเดอร์ที่กำลังอ่าน */}
      {baseFolder && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-surface-2/40 text-[13px] text-ink-muted font-mono break-all">
          <FolderOpen size={13} className="text-ink-subtle flex-shrink-0" />
          <span>{baseFolder}</span>
        </div>
      )}

      {/* ตัวกรอง กล้อง / วันที่ */}
      {images.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg border border-border bg-surface/40">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-ink-subtle uppercase tracking-wider">
            <Filter size={12} /> กรอง
          </div>
          <label className="flex items-center gap-1.5">
            <Camera size={13} className="text-ink-subtle" />
            <select
              value={filterCamera}
              onChange={(e) => setFilterCamera(e.target.value)}
              className="px-2 py-1 rounded-md border border-border bg-surface-2 text-ink text-sm font-mono cursor-pointer outline-none focus:border-primary"
            >
              <option value="">ทุกกล้อง</option>
              {cameras.map((c) => (
                <option key={c} value={c}>กล้อง {c}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <Calendar size={13} className="text-ink-subtle" />
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-2 py-1 rounded-md border border-border bg-surface-2 text-ink text-sm font-mono cursor-pointer outline-none focus:border-primary"
            >
              <option value="">ทุกวันที่</option>
              {dates.map((d) => (
                <option key={d} value={d}>{fmtDate(d)}</option>
              ))}
            </select>
          </label>
          {isFiltered && (
            <button
              onClick={() => { setFilterCamera(''); setFilterDate('') }}
              className="text-[12px] font-semibold text-ink-muted hover:text-ink underline cursor-pointer"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      )}

      {error ? (
        <div className="p-12 text-center">
          <AlertCircle size={28} className="text-rose-500 mx-auto mb-2" />
          <p className="text-base font-bold text-ink mb-3">{error}</p>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-sm font-semibold"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[70px] rounded-lg bg-surface-2 animate-pulse" />
          ))}
        </div>
      ) : !images.length ? (
        <div className="p-12 text-center border border-border rounded-xl bg-surface/40">
          <Images size={28} className="text-ink-subtle mx-auto mb-2" />
          <p className="text-sm font-semibold text-ink-muted">ยังไม่มีรูปในโฟลเดอร์นี้</p>
          <p className="text-[13px] text-ink-subtle mt-1">
            วางไฟล์ <span className="font-mono">.jpg / .png</span> ไว้ใน{' '}
            <span className="font-mono">{baseFolder || 'IMAGE_SHARED_DRIVE/<COMPANY_CODE>'}</span> แล้วกด Refresh
          </p>
        </div>
      ) : !groups.length ? (
        <div className="p-10 text-center border border-border rounded-xl bg-surface/40">
          <Filter size={24} className="text-ink-subtle mx-auto mb-2" />
          <p className="text-sm font-semibold text-ink-muted">ไม่มีรูปตรงกับตัวกรอง</p>
          <button
            onClick={() => { setFilterCamera(''); setFilterDate('') }}
            className="mt-2 text-[13px] font-semibold text-primary hover:underline cursor-pointer"
          >
            ล้างตัวกรอง
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(({ folder, imgs }) => {
            const isCollapsed = collapsed.has(folder)
            const [camera, date] = folder === '(root)' ? [null, null] : folder.split('/')
            return (
              <div key={folder} className="border border-border rounded-xl bg-surface/40 overflow-hidden">
                {/* Folder header — คลิกเปิด/ปิด */}
                <button
                  onClick={() => toggle(folder)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 bg-surface-2/40 hover:bg-surface-2/70 transition-colors text-left cursor-pointer"
                >
                  {isCollapsed ? (
                    <ChevronRight size={15} className="text-ink-subtle flex-shrink-0" />
                  ) : (
                    <ChevronDown size={15} className="text-ink-subtle flex-shrink-0" />
                  )}
                  <FolderOpen size={14} className="text-primary flex-shrink-0" />
                  {camera && (
                    <span className="inline-flex items-center gap-1 text-[12px] font-mono font-bold text-ink px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                      <Camera size={11} /> {camera}
                    </span>
                  )}
                  {date && (
                    <span className="inline-flex items-center gap-1 text-[12px] font-mono text-ink-muted px-1.5 py-0.5 rounded bg-surface border border-border">
                      <Calendar size={11} /> {fmtDate(date)}
                    </span>
                  )}
                  {!camera && !date && <span className="text-[13px] font-mono text-ink-muted">{folder}</span>}
                  <span className="ml-auto text-[12px] font-mono text-ink-subtle">{imgs.length} รูป</span>
                </button>

                {/* Rows — thumbnail เล็ก + ชื่อ + เวลา (ใหม่→เก่า) · คลิกรูป/ชื่อ เพื่อดูภาพใหญ่ */}
                {!isCollapsed && (
                  <div className="divide-y divide-border/60">
                    {imgs.map((img) => (
                      <div key={img.path} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-2/30 transition-colors">
                        <RowThumb path={img.path} name={img.name} onClick={() => setPreview(img)} />
                        <button
                          type="button"
                          onClick={() => setPreview(img)}
                          className="min-w-0 flex-1 text-left cursor-zoom-in"
                        >
                          <p className="text-[13px] font-mono font-semibold text-ink truncate hover:text-primary transition-colors" title={img.path}>
                            {img.name}
                          </p>
                          <p className="text-[11px] text-ink-subtle font-mono">{(img.size / 1024).toFixed(1)} KB</p>
                        </button>
                        <span className="text-[12px] font-mono text-ink-muted flex-shrink-0 hidden sm:block">
                          {formatDateTime(img.modified)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox ภาพใหญ่ */}
      {preview && <Lightbox image={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

import React, { useEffect, useRef, useState } from 'react'
import { Camera, Video, VideoOff, MapPin, Clock, Pencil, Trash2 } from 'lucide-react'
import { api } from '../../services/api'
import { formatRelative } from '../../utils/format'
import clsx from 'clsx'

export default function CameraStatusCard({ camera, onEditPolygon, onEditCamera, onDeleteCamera }) {
  const isOnline = camera.status === 'online'

  // นับจำนวน schedule rule (ถ้ามี) — โชว์เป็นป้าย meta
  let ruleCount = 0
  try {
    const rules = camera.schedule_json ? JSON.parse(camera.schedule_json) : null
    if (Array.isArray(rules)) ruleCount = rules.length
  } catch { /* schedule_json ไม่ valid — ข้าม */ }

  // ดึง snapshot ล่าสุดมาแปะเป็น thumbnail แทนพื้นดำ (เงียบๆ ถ้าไม่มี — ไม่กระทบ card อื่น)
  const [thumbUrl, setThumbUrl] = useState(null)
  const [thumbAt, setThumbAt] = useState(null)
  const blobUrlRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    api.getCameraSnapshot(camera.camera_no)
      .then(async info => {
        if (cancelled || !info) return
        setThumbAt(info.last_snapshot_at || null)
        if (info.mode === 'bkc' && info.snapshot_url) {
          setThumbUrl(info.snapshot_url)
        } else if (info.mode === 'local' && info.snapshot_url) {
          const blobUrl = await api.getCameraSnapshotBlobUrl(camera.camera_no)
          if (cancelled) { URL.revokeObjectURL(blobUrl); return }
          blobUrlRef.current = blobUrl
          setThumbUrl(blobUrl)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [camera.camera_no])

  return (
    <article
      className={clsx(
        'group relative flex flex-col overflow-hidden rounded-xl border bg-surface shadow-sm',
        'transition-[transform,box-shadow,border-color] duration-300 ease-out',
        'hover:-translate-y-1 focus-within:-translate-y-1',
        isOnline
          ? 'border-border hover:border-emerald-500/40 hover:shadow-[0_18px_40px_-16px_oklch(0.50_0.15_150_/_0.28)]'
          : 'border-rose-500/25 hover:border-rose-500/45 hover:shadow-[0_18px_40px_-16px_oklch(0.55_0.20_25_/_0.24)]'
      )}
    >
      {/* ── พื้นที่ภาพจากกล้อง (snapshot จริงถ้ามี, ไม่งั้น fallback เป็น placeholder) ── */}
      <div
        className="relative grid aspect-[16/10] place-items-center overflow-hidden bg-zinc-950"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0 13px, rgba(255,255,255,.025) 13px 14px), radial-gradient(120% 80% at 50% 20%, #26272f, #15161b)',
        }}
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={`ภาพล่าสุดจากกล้อง ${camera.camera_name || camera.camera_no}`}
            onError={() => setThumbUrl(null)}
            className="absolute inset-0 h-full w-full animate-fade-in object-cover"
            loading="lazy"
          />
        ) : (
          <>
            {isOnline
              ? <Video size={32} className="text-zinc-500/60" strokeWidth={1.75} aria-hidden />
              : <VideoOff size={32} className="text-rose-400/50" strokeWidth={1.75} aria-hidden />}
            <span className={clsx('absolute bottom-2.5 left-3 text-[11px] font-medium', isOnline ? 'text-zinc-300/60' : 'text-rose-200/70')}>
              {isOnline ? 'ยังไม่มีภาพ · กด Draw เพื่อ Sync' : 'กล้องออฟไลน์ · ตรวจสอบการเชื่อมต่อ'}
            </span>
          </>
        )}

        {/* เงาไล่สีด้านล่าง — กันตัวหนังสือ/ป้ายจมไปกับภาพที่สว่าง */}
        {thumbUrl && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/60 to-transparent" />
        )}

        {/* ป้ายสถานะซ้อนบนภาพ */}
        <div className="absolute left-2.5 top-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-white backdrop-blur-sm">
            {isOnline ? (
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden />
            )}
            {isOnline ? 'Live' : 'Offline'}
          </span>
        </div>

        {thumbUrl && thumbAt && (
          <span className="absolute bottom-2.5 left-3 text-[11px] font-medium text-zinc-200/85">
            อัปเดต {formatRelative(thumbAt)}
          </span>
        )}

        {/* รหัสกล้องซ้อนมุมขวาล่าง */}
        <span className="absolute bottom-2.5 right-3 font-mono text-xs font-semibold tracking-wide text-white/85">
          CAM {camera.camera_no}
        </span>
      </div>

      {/* ── เนื้อหาการ์ด ── */}
      <div className="flex flex-1 flex-col gap-3.5 p-4">
        <div>
          <h3 className="text-[15px] font-semibold leading-snug text-ink text-balance">
            {camera.camera_name || `Camera ${camera.camera_no}`}
          </h3>
          {camera.location && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-snug text-ink-muted">
              <MapPin size={13} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden />
              <span className="min-w-0">{camera.location}</span>
            </p>
          )}
        </div>

        {/* ป้าย meta: บริษัท / ยี่ห้อ / schedule */}
        <div className="flex flex-wrap items-center gap-1.5">
          {camera.company_code && (
            <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide text-primary">
              {camera.company_code}
            </span>
          )}
          {camera.brand && (
            <span className="rounded-md border border-border bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-muted">
              {camera.brand} · {camera.stream_type || 'sub'}
            </span>
          )}
          {ruleCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
              <Clock size={11} className="text-primary" aria-hidden />
              {ruleCount} {ruleCount === 1 ? 'rule' : 'rules'}
            </span>
          )}
        </div>

        {camera.last_seen && (
          <div className="flex items-center gap-1.5 text-[12px] text-ink-subtle">
            <span className={clsx('h-1.5 w-1.5 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-rose-500')} aria-hidden />
            Heartbeat
            <span className="font-mono font-semibold text-ink-muted tabular-nums">{formatRelative(camera.last_seen)}</span>
          </div>
        )}

        {/* ── ปุ่มควบคุม (ปักขอบล่างเสมอ) ── */}
        <div className="mt-auto flex gap-2 pt-1">
          <button
            onClick={() => onEditPolygon?.(camera)}
            className={clsx(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2',
              'border-primary/30 bg-primary/10 text-[12.5px] font-bold text-primary',
              'transition-colors duration-200 hover:border-primary hover:bg-primary hover:text-primary-fg',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              'active:translate-y-px cursor-pointer'
            )}
          >
            <Camera size={13} strokeWidth={2.25} aria-hidden /> Draw Zone
          </button>
          <button
            onClick={() => onEditCamera?.(camera)}
            aria-label="แก้ไขรายละเอียดกล้อง"
            title="Edit details"
            className="flex items-center justify-center rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-ink-subtle transition-colors duration-200 hover:border-ink/25 hover:bg-surface hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:translate-y-px cursor-pointer"
          >
            <Pencil size={13} strokeWidth={2.25} aria-hidden />
          </button>
          <button
            onClick={() => onDeleteCamera?.(camera)}
            aria-label="ลบกล้อง"
            title="Delete camera"
            className="flex items-center justify-center rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-ink-subtle transition-colors duration-200 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 active:translate-y-px cursor-pointer"
          >
            <Trash2 size={13} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  )
}

import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Camera, Clock, MapPin, Shield, Bell, HardDrive, Activity, HelpCircle, CheckCircle, XCircle, FileCheck2, User, RefreshCw, Upload, Eye, AlertTriangle } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import ImagePreview from '../components/ui/ImagePreview'
import StatusBadge from '../components/ui/StatusBadge'
import { formatDateTime, formatConfidence } from '../utils/format'

function DetailRow({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/60">
      <div className="flex items-center gap-2 text-ink-muted text-[13px] font-semibold uppercase">
        <Icon size={12} className="text-ink-subtle" />
        <span>{label}</span>
      </div>
      <span
        className={`text-sm font-bold text-ink ${mono ? 'font-mono' : ''}`}
      >
        {value ?? '—'}
      </span>
    </div>
  )
}

export default function EventDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const closeCaseMode = import.meta.env.VITE_CLOSE_CASE_MODE === 'true'

  const { data: ev, loading, error, refetch } = useAsync(
    () => api.getEventDetail(id),
    [id]
  )

  // Case closing form states
  const [closedBy, setClosedBy] = useState('')
  const [closeReason, setCloseReason] = useState('')
  const [closeImage, setCloseImage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showFullResImage, setShowFullResImage] = useState(false)

  // Default Closed By field to logged-in user name
  useEffect(() => {
    if (user) {
      setClosedBy(user.full_name || user.username || '')
    }
  }, [user])

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCloseImage(reader.result) // Base64 encoding
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpdateStatus = async (statusVal) => {
    if (!closedBy.trim() || !closeReason.trim()) {
      setSubmitError('Please fill out all fields')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      await api.closeEvent(id, {
        resolved_by: closedBy.trim(),
        resolution_desc: closeReason.trim(),
        resolution_image: closeImage || null,
        status: statusVal
      })
      refetch() // Reload event details from server
    } catch (err) {
      setSubmitError(err.message || 'Failed to update case status')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1360px] mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-border rounded-md" />
        <div className="flex justify-between items-center h-12 bg-surface/30 rounded-xl border border-border" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 aspect-video bg-surface/30 rounded-xl border border-border" />
          <div className="lg:col-span-5 h-64 bg-surface/30 rounded-xl border border-border" />
        </div>
      </div>
    )
  }

  if (error || !ev) {
    return (
      <div className="py-20 text-center max-w-sm mx-auto">
        <HelpCircle size={32} className="text-rose-500 mx-auto mb-2" />
        <p className="text-base font-bold text-ink mb-3">{error || 'Event not found'}</p>
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-sm font-semibold"
        >
          <ArrowLeft size={12} /> Back to Logs
        </Link>
      </div>
    )
  }

  const isClosed = ev.event_status === 'CLOSED'
  const isRejected = ev.event_status === 'DISMISSED'
  const hasStatusReport = isClosed || isRejected

  return (
    <div className="max-w-[1360px] mx-auto space-y-6">
      
      {/* Navigation Return & PDF Print Row */}
      <div className="flex items-center justify-between no-print">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors font-bold uppercase tracking-wider"
        >
          <ArrowLeft size={13} /> Back to Event Log
        </Link>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-sm font-bold cursor-pointer transition-all shadow-xs hover:border-primary/40 hover:bg-surface-2"
        >
          <Camera size={12} /> Print PDF Report
        </button>
      </div>

      {/* Title & Status Banner */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface/50 dark:bg-surface/30 backdrop-blur-md">
        <div>
          <h2 className="text-base font-bold text-ink uppercase tracking-wider">
            Event Incident Report #{ev.event_id}
          </h2>
          <p className="text-sm font-mono text-ink-muted mt-0.5">
            Detected: {formatDateTime(ev.detected_at)}
          </p>
        </div>
        <StatusBadge
          size="md"
          status={isClosed ? 'ok' : isRejected ? 'error' : 'warn'}
          label={isClosed ? 'Resolved & Closed' : isRejected ? 'Rejected (False Alarm)' : 'Processing'}
        />
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Camera capture view */}
        <div className="lg:col-span-7 space-y-3">
          <div className="text-[12px] font-bold text-ink-subtle uppercase tracking-widest pl-1 no-print">
            Camera Capture feed Frame
          </div>
          <ImagePreview
            src={ev.image_url || null}
            alt={`Safety breach on camera ${ev.camera_no}`}
            className="w-full shadow-lg"
          />
          {ev.image_path && (
            <div className="p-3 rounded-lg border border-border bg-surface-2/40 text-[12px] text-ink-subtle font-mono break-all">
              <span className="font-bold text-ink block mb-0.5">IMAGE FILEPATH:</span>
              {ev.image_path}
            </div>
          )}
        </div>

        {/* Right: Technical stats, Webhook logs, and Case Closure */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Metadata detail block */}
          <div className="rounded-xl border border-border bg-surface/40 dark:bg-surface/20 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider mb-3">Incident Metadata</h3>
            <div className="flex flex-col">
              <DetailRow icon={Camera}   label="Camera Source"   value={ev.camera_no} mono />
              <DetailRow icon={Shield}   label="Company ID"      value={ev.company_code} mono />
              <DetailRow icon={MapPin}   label="Restricted Area" value={ev.area_name} />
              <DetailRow icon={Clock}    label="Timestamp"       value={formatDateTime(ev.detected_at)} mono />
              <DetailRow icon={Activity} label="AI Confidence"   value={formatConfidence(ev.confidence)} mono />
            </div>
          </div>

          {/* Case Closure Panel */}
          {closeCaseMode && (
            <div className="rounded-xl border border-border bg-surface/40 dark:bg-surface/20 p-5 shadow-xs">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-4">
                <FileCheck2 size={16} className={hasStatusReport ? 'text-emerald-500' : 'text-primary'} />
                <h3 className="text-sm font-bold text-ink uppercase tracking-wider">
                  Case Resolution System
                </h3>
              </div>

              {hasStatusReport ? (
                /* CASE IS RESOLVED / CLOSED STATE */
                <div className="space-y-4">
                  {isClosed ? (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                      <CheckCircle size={14} />
                      <span>TICKET STATUS: RESOLVED & CLOSED</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-bold">
                      <XCircle size={14} />
                      <span>TICKET STATUS: REJECTED & DISMISSED</span>
                    </div>
                  )}

                  <div className="text-sm space-y-3">
                    <div>
                      <span className="text-[12px] text-ink-subtle uppercase tracking-wider font-bold block mb-1">Closed By:</span>
                      <div className="flex items-center gap-1.5 text-ink font-semibold">
                        <User size={12} className="text-ink-subtle" />
                        <span>{ev.resolved_by}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[12px] text-ink-subtle uppercase tracking-wider font-bold block mb-1">Closed Timestamp:</span>
                      <span className="font-mono text-ink-muted font-medium">{formatDateTime(ev.resolved_at)}</span>
                    </div>

                    <div>
                      <span className="text-[12px] text-ink-subtle uppercase tracking-wider font-bold block mb-1">Resolution Details:</span>
                      <p className="p-3 rounded-lg bg-surface border border-border text-ink leading-relaxed">
                        {ev.resolution_desc}
                      </p>
                    </div>

                    {ev.resolution_image && (
                      <div className="no-print">
                        <span className="text-[12px] text-ink-subtle uppercase tracking-wider font-bold block mb-1">Resolution Verification Image:</span>
                        <div className="relative rounded-lg overflow-hidden border border-border aspect-video bg-surface-2 group">
                          <img
                            src={ev.resolution_image}
                            alt="Resolution evidence"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => setShowFullResImage(true)}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-bold gap-1 cursor-pointer"
                          >
                            <Eye size={14} /> View Full Image
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* CASE IS OPEN (SHOW SUBMIT FORM) */
                <form onSubmit={e => e.preventDefault()} className="space-y-4">
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-bold">
                    <AlertTriangle size={14} />
                    <span>TICKET STATUS: ACTIVE INTENT</span>
                  </div>

                  {/* Closed By Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-ink-muted uppercase">Closed By (Operator):</label>
                    <input
                      type="text"
                      required
                      value={closedBy}
                      onChange={e => setClosedBy(e.target.value)}
                      placeholder="Operator Name"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface-2 text-ink text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-xs"
                    />
                  </div>

                  {/* Resolution Text */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-ink-muted uppercase">Resolution / Reject Explanation:</label>
                    <textarea
                      required
                      rows={3}
                      value={closeReason}
                      onChange={e => setCloseReason(e.target.value)}
                      placeholder="Describe the action taken (e.g., Worker guided back to path) or reason for rejection (e.g., False Alarm / Object detection mistake)..."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface-2 text-ink text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-xs resize-none"
                    />
                  </div>

                  {/* Resolution Image Upload */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-ink-muted uppercase">Attach Verification Photo (Optional):</label>
                    <div className="relative border border-dashed border-border/80 hover:border-primary rounded-xl p-4 bg-surface-2/30 hover:bg-surface-2/50 transition-all text-center flex flex-col items-center justify-center cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {closeImage ? (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border">
                          <img src={closeImage} className="w-full h-full object-cover" alt="Closed case preview" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[12px] font-bold">
                            Click / Drag to change image
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload size={18} className="text-ink-subtle mb-1" />
                          <span className="text-[12px] font-bold text-ink-muted">Drag or click to attach image</span>
                          <span className="text-[11px] text-ink-subtle">PNG, JPG, or WEBP</span>
                        </>
                      )}
                    </div>
                  </div>

                  {submitError && (
                    <div className="text-[12px] text-rose-500 font-bold p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      {submitError}
                    </div>
                  )}

                  {/* Double Actions Button Layout */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleUpdateStatus('CLOSED')}
                      className="py-2.5 px-3 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle size={13} />
                      <span>Resolve & Close</span>
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleUpdateStatus('DISMISSED')}
                      className="py-2.5 px-3 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle size={13} />
                      <span>Reject (False Alarm)</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Webhook logs */}
          {(ev.teams_sent != null || ev.email_sent != null || ev.alert_error) && (
            <div className="rounded-xl border border-border bg-surface/40 dark:bg-surface/20 p-5 shadow-xs no-print">
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider mb-4">Notification Webhook Logs</h3>
              
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="p-3 rounded-lg border border-border bg-surface/50 dark:bg-surface/30 flex items-center justify-between">
                  <span className="text-[13px] font-bold text-ink-muted">MS Teams:</span>
                  <StatusBadge status={ev.teams_sent ? 'ok' : 'error'} label={ev.teams_sent ? 'Success' : 'Failed'} />
                </div>
                <div className="p-3 rounded-lg border border-border bg-surface/50 dark:bg-surface/30 flex items-center justify-between">
                  <span className="text-[13px] font-bold text-ink-muted">Email Alert:</span>
                  <StatusBadge status={ev.email_sent ? 'ok' : 'error'} label={ev.email_sent ? 'Success' : 'Failed'} />
                </div>
              </div>

              {ev.alert_error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex gap-2">
                  <XCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
                  <div className="text-[12px] font-medium text-rose-500 leading-normal">
                    <span className="font-bold uppercase block mb-0.5">Webhook Error message:</span>
                    {ev.alert_error}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full-resolution verification image overlay modal */}
      {showFullResImage && (
        <div
          onClick={() => setShowFullResImage(false)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 p-1 flex items-center justify-center">
            <img
              src={ev.resolution_image}
              alt="Verification full size"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1.5 rounded-full text-[12px] font-bold text-white uppercase pointer-events-none">
              Click anywhere to close
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

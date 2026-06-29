import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Camera, Clock, MapPin, Shield, Bell, HardDrive, Activity } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import ImagePreview from '../components/ui/ImagePreview'
import StatusBadge from '../components/ui/StatusBadge'
import { PageLoading, ErrorState } from '../components/ui/LoadingState'
import { formatDateTime, formatConfidence } from '../utils/format'

function DetailRow({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
      <Icon size={14} style={{ color: 'var(--ink-subtle)', marginTop: 2, flexShrink: 0 }} />
      <span className="text-xs w-28 flex-shrink-0" style={{ color: 'var(--ink-muted)' }}>{label}</span>
      <span
        className={`text-sm flex-1 ${mono ? 'font-mono' : ''}`}
        style={{ color: 'var(--ink)' }}
      >
        {value ?? '—'}
      </span>
    </div>
  )
}

export default function EventDetailPage() {
  const { id } = useParams()
  const { data: ev, loading, error, refetch } = useAsync(
    () => api.getEventDetail(id),
    [id]
  )

  if (loading) return <PageLoading />
  if (error)   return <ErrorState message={error} onRetry={refetch} />
  if (!ev)     return <ErrorState message="Event not found" />

  return (
    <div className="max-w-3xl space-y-5">
      {/* Back */}
      <Link
        to="/events"
        className="inline-flex items-center gap-1.5 text-xs transition-colors"
        style={{ color: 'var(--ink-muted)' }}
      >
        <ArrowLeft size={13} /> Back to Event Log
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--ink)', letterSpacing: '-0.025em' }}>
            Event #{ev.event_id}
          </h2>
          <p className="text-sm font-mono mt-0.5" style={{ color: 'var(--ink-muted)' }}>
            {formatDateTime(ev.detected_at)}
          </p>
        </div>
        <StatusBadge
          size="md"
          status={ev.alert_sent ? 'ok' : ev.alert_failed ? 'error' : 'warn'}
          label={ev.alert_sent ? 'Alert Sent' : ev.alert_failed ? 'Alert Failed' : 'Alert Pending'}
        />
      </div>

      {/* Image */}
      <ImagePreview
        src={ev.image_url || null}
        alt={`Detection event ${ev.event_id}`}
        className="w-full"
      />

      {/* Details */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div
          className="px-4 py-3 border-b text-xs font-medium"
          style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)', background: 'var(--surface-2)' }}
        >
          Detection Details
        </div>
        <div className="px-4">
          <DetailRow icon={Camera}   label="Camera"      value={ev.camera_no}             mono />
          <DetailRow icon={Shield}   label="Company"     value={ev.company_code}           mono />
          <DetailRow icon={MapPin}   label="Area"        value={ev.area_name} />
          <DetailRow icon={Clock}    label="Detected at" value={formatDateTime(ev.detected_at)} mono />
          <DetailRow icon={Activity} label="Confidence"  value={formatConfidence(ev.confidence)} mono />
          {ev.image_path && (
            <DetailRow icon={HardDrive} label="Image path" value={ev.image_path} mono />
          )}
          {ev.alert_error && (
            <DetailRow icon={Bell} label="Alert error" value={ev.alert_error} />
          )}
        </div>
      </div>

      {/* Alert details */}
      {(ev.teams_sent != null || ev.email_sent != null) && (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <div
            className="px-4 py-3 border-b text-xs font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)', background: 'var(--surface-2)' }}
          >
            Alert Delivery
          </div>
          <div className="px-4 py-3 flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>Teams:</span>
              <StatusBadge status={ev.teams_sent ? 'ok' : 'error'} label={ev.teams_sent ? 'Sent' : 'Failed'} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>Email:</span>
              <StatusBadge status={ev.email_sent ? 'ok' : 'error'} label={ev.email_sent ? 'Sent' : 'Failed'} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

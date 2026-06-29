import React, { useState } from 'react'
import { Camera, Wifi, WifiOff, Search } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import CameraStatusCard from '../components/ui/CameraStatusCard'
import { PageLoading, ErrorState, EmptyState } from '../components/ui/LoadingState'

export default function CameraMonitorPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'online' | 'offline'

  const { data: cameras, loading, error, refetch } = useAsync(
    () => api.getCameras(),
    []
  )

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

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Summary strip */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Wifi size={14} style={{ color: 'var(--status-ok)' }} />
          <span className="text-sm font-mono font-medium" style={{ color: 'var(--status-ok)' }}>{online}</span>
          <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>online</span>
        </div>
        <div className="flex items-center gap-2">
          <WifiOff size={14} style={{ color: 'var(--status-err)' }} />
          <span className="text-sm font-mono font-medium" style={{ color: 'var(--status-err)' }}>{offline}</span>
          <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>offline</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter tabs */}
        <div
          className="flex rounded-lg p-0.5 gap-0.5"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          {['all', 'online', 'offline'].map(v => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className="px-3 py-1.5 rounded text-xs font-medium transition-all duration-[120ms]"
              style={filter === v
                ? { background: 'var(--surface)', color: 'var(--ink)' }
                : { color: 'var(--ink-muted)' }
              }
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-subtle)', pointerEvents: 'none' }} />
          <input
            type="search"
            placeholder="Search camera / location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 text-xs rounded-lg"
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--ink)', height: 34, outline: 'none', width: 220,
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
      </div>

      {/* Grid */}
      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : loading ? (
        <PageLoading />
      ) : !filtered.length ? (
        <EmptyState message="No cameras found" icon={Camera} />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {filtered.map(cam => (
            <CameraStatusCard key={cam.camera_no} camera={cam} />
          ))}
        </div>
      )}
    </div>
  )
}

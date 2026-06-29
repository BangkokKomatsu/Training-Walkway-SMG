import React, { useState } from 'react'
import { Camera, Wifi, WifiOff, Search, RefreshCw, AlertTriangle } from 'lucide-react'
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
              placeholder="Search camera or location..."
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
            <CameraStatusCard key={cam.camera_no} camera={cam} />
          ))}
        </div>
      )}
    </div>
  )
}

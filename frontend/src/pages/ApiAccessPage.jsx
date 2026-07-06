import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { KeyRound, RefreshCw, Copy, Check, AlertTriangle, ShieldCheck, BarChart3, Building } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/ui/StatusBadge'
import { SkeletonTable } from '../components/ui/LoadingState'
import { formatDateTime } from '../utils/format'

function ApiKeyModal({ apiKey, onClose }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable — the key is still visible to select/copy manually
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-[480px] rounded-2xl border border-border bg-surface shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={16} className="text-primary" />
          </div>
          <div>
            <h4 className="text-base font-bold text-ink">New API Key</h4>
            <p className="text-sm text-ink-subtle">for external read-only integration</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-surface-2">
          <code className="flex-1 text-sm font-mono font-bold text-ink tracking-wide break-all select-all">{apiKey}</code>
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg border border-border bg-surface text-ink-muted hover:text-primary hover:border-primary/40 transition-all cursor-pointer flex-shrink-0"
            title="Copy to clipboard"
          >
            {copied ? <Check size={14} className="text-[color:var(--status-ok)]" /> : <Copy size={14} />}
          </button>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-status-warn/10 border border-status-warn/20">
          <AlertTriangle size={14} className="text-status-warn flex-shrink-0 mt-0.5" />
          <p className="text-sm text-ink leading-relaxed">
            This key is shown once and replaces any previous key immediately. Store it securely —
            it grants read-only access to <code>/api/public/v1/*</code> for this company.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl font-bold text-base bg-primary text-primary-fg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  )
}

function ApiKeyCard() {
  const { data: keyInfo, loading, refetch } = useAsync(() => api.getCompanyApiKey(), [])
  const [newKey, setNewKey] = useState(null)
  const [working, setWorking] = useState(false)

  const handleRegenerate = async () => {
    const message = keyInfo?.api_key_is_active
      ? 'Regenerate the API key? The current key will stop working immediately.'
      : 'Generate an API key for this company?'
    if (!window.confirm(message)) return
    setWorking(true)
    try {
      const res = await api.regenerateApiKey()
      setNewKey(res.api_key)
      refetch()
    } catch (err) {
      alert(err.message || 'Failed to generate API key')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="border border-border rounded-xl bg-surface/40 p-5 space-y-4 shadow-xs">
      <div className="flex items-center gap-2.5">
        <KeyRound size={16} className="text-primary" />
        <span className="text-base font-bold text-ink">External API Key</span>
      </div>
      <p className="text-sm text-ink-muted leading-relaxed">
        Used by your systems to call <code className="font-mono">/api/public/v1/*</code> (read-only
        events, cameras, dashboard summary, alerts) via the <code className="font-mono">x-api-key</code> header.
      </p>

      {loading ? (
        <div className="h-10 rounded-lg bg-surface-2 animate-pulse" />
      ) : (
        <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border bg-surface-2">
          <div className="flex items-center gap-3">
            <StatusBadge
              status={keyInfo?.api_key_is_active ? 'ok' : 'offline'}
              label={keyInfo?.api_key_is_active ? 'Active' : 'Not generated'}
            />
            {keyInfo?.api_key_created_at && (
              <span className="text-sm text-ink-subtle">Created {formatDateTime(keyInfo.api_key_created_at)}</span>
            )}
          </div>
          <button
            onClick={handleRegenerate}
            disabled={working}
            className="px-3.5 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-primary hover:border-primary/40 text-sm font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={working ? 'animate-spin' : ''} />
            {keyInfo?.api_key_is_active ? 'Regenerate' : 'Generate Key'}
          </button>
        </div>
      )}

      {newKey && <ApiKeyModal apiKey={newKey} onClose={() => setNewKey(null)} />}
    </div>
  )
}

function UsageCard() {
  const { data: usage, loading, error, refetch } = useAsync(() => api.getCompanyUsage(), [])
  const rows = usage || []

  return (
    <div className="border border-border rounded-xl bg-surface/40 overflow-hidden shadow-xs">
      <div className="flex items-center gap-2.5 p-5 pb-3">
        <BarChart3 size={16} className="text-primary" />
        <span className="text-base font-bold text-ink">API Usage (last 180 days)</span>
      </div>
      {error ? (
        <div className="p-8 text-center">
          <AlertTriangle size={24} className="text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-ink mb-2">{error}</p>
          <button onClick={refetch} className="text-sm font-semibold text-primary">Retry</button>
        </div>
      ) : loading ? (
        <SkeletonTable rows={3} cols={3} />
      ) : !rows.length ? (
        <div className="p-8 text-center">
          <p className="text-sm font-semibold text-ink-muted">No API calls logged yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-surface-2/30 border-b border-border text-[12px] font-bold text-ink-subtle uppercase tracking-wider">
                <th className="px-5 py-3">Endpoint</th>
                <th className="px-5 py-3">Call Count</th>
                <th className="px-5 py-3">Last Called</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map(r => (
                <tr key={r.endpoint} className="hover:bg-surface-2/40 transition-colors duration-150">
                  <td className="px-5 py-3 font-mono text-ink">{r.endpoint}</td>
                  <td className="px-5 py-3 text-ink-muted">{r.call_count}</td>
                  <td className="px-5 py-3 text-ink-subtle">{formatDateTime(r.last_called_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function BillingOverviewCard() {
  const { data: rows, loading, error, refetch } = useAsync(() => api.getBillingOverview(), [])
  const companies = rows || []

  return (
    <div className="border border-border rounded-xl bg-surface/40 overflow-hidden shadow-xs">
      <div className="flex items-center gap-2.5 p-5 pb-3">
        <Building size={16} className="text-primary" />
        <span className="text-base font-bold text-ink">Billing Overview — all companies</span>
        <span className="text-sm text-ink-subtle">(active camera count as of today)</span>
      </div>
      {error ? (
        <div className="p-8 text-center">
          <AlertTriangle size={24} className="text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-ink mb-2">{error}</p>
          <button onClick={refetch} className="text-sm font-semibold text-primary">Retry</button>
        </div>
      ) : loading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-surface-2/30 border-b border-border text-[12px] font-bold text-ink-subtle uppercase tracking-wider">
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">API Key</th>
                <th className="px-5 py-3">Active Cameras</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {companies.map(c => (
                <tr key={c.company_code} className="hover:bg-surface-2/40 transition-colors duration-150">
                  <td className="px-5 py-3 font-mono font-bold text-ink">{c.company_code} <span className="text-ink-subtle font-sans font-normal">— {c.company_name}</span></td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.is_active ? 'ok' : 'offline'} label={c.is_active ? 'Active' : 'Disabled'} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.api_key_is_active ? 'ok' : 'offline'} label={c.api_key_is_active ? 'Issued' : 'None'} />
                  </td>
                  <td className="px-5 py-3 text-ink-muted font-mono">{c.active_camera_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function ApiAccessPage() {
  const { user } = useAuth()
  const isAdmin = user?.is_super_admin || user?.role_name === 'admin'
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return (
    <div className="space-y-4 w-full max-w-[1360px] mx-auto">
      <div className="flex items-center gap-2.5 p-4 rounded-xl border border-border bg-surface/50 dark:bg-surface/30 backdrop-blur-md">
        <KeyRound size={16} className="text-primary" />
        <span className="text-base font-bold text-ink">API Access & Billing</span>
      </div>

      <ApiKeyCard />
      <UsageCard />
      {user?.is_super_admin && <BillingOverviewCard />}
    </div>
  )
}

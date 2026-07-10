import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Users, Plus, KeyRound, Edit, Copy, Check, X,
  AlertTriangle, RefreshCw, ShieldCheck
} from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/ui/StatusBadge'
import { SkeletonTable } from '../components/ui/LoadingState'

function TempPasswordModal({ username, password, onClose }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable — the password is still visible to select/copy manually
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-surface shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={16} className="text-primary" />
          </div>
          <div>
            <h4 className="text-base font-bold text-ink">Temporary password</h4>
            <p className="text-sm text-ink-subtle">for <strong className="text-ink">{username}</strong></p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-surface-2">
          <code className="flex-1 text-base font-mono font-bold text-ink tracking-wide select-all">{password}</code>
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
            This password is shown once. Copy it and share it with the user through a secure channel.
            They will be required to change it on first sign in.
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

function UserFormModal({ mode, initial, roles, companyCode, onClose, onSubmit }) {
  const [username, setUsername]   = useState(initial?.username || '')
  const [fullName, setFullName]   = useState(initial?.full_name || '')
  const [roleId,   setRoleId]     = useState(initial?.role_id ?? roles[0]?.role_id ?? '')
  const [isActive,  setIsActive]  = useState(initial?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (mode === 'add') {
        await onSubmit({ username, full_name: fullName, role_id: roleId })
      } else {
        await onSubmit({ full_name: fullName, role_id: roleId, is_active: isActive })
      }
    } catch (err) {
      setError(err.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-surface shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h4 className="text-base font-bold text-ink">{mode === 'add' ? 'Add User' : 'Edit User'}</h4>
          <button onClick={onClose} className="p-1.5 rounded-lg border border-border hover:bg-surface-2 text-ink-muted hover:text-ink transition-all cursor-pointer">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'add' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-ink-muted">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value.trim())}
                placeholder="e.g. gs_admin"
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface-2 text-ink font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-ink-muted">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Full name"
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface-2 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          {mode === 'add' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-ink-muted">Company</label>
              <div className="px-3 py-2 rounded-lg border border-border bg-surface-2/60 text-ink-muted font-mono">{companyCode}</div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-ink-muted">Role</label>
            <select
              value={roleId}
              onChange={e => setRoleId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface-2 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer transition-all"
            >
              {roles.map(r => (
                <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
              ))}
            </select>
          </div>

          {mode === 'edit' && (
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="w-4 h-4 text-primary bg-surface border-border rounded-sm cursor-pointer"
              />
              <span className="text-sm font-semibold text-ink">Account active</span>
            </label>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-status-err/10 border border-status-err/20">
              <AlertTriangle size={14} className="text-status-err flex-shrink-0" />
              <span className="text-sm text-status-err font-semibold">{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border hover:bg-surface-2 text-ink-muted hover:text-ink rounded-xl text-sm font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-primary text-primary-fg hover:brightness-110 active:scale-[0.98] rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : mode === 'add' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UserManagementPage() {
  const { user } = useAuth()
  const isAdmin = user?.role_name === 'admin'

  const { data: users, loading, error, refetch } = useAsync(() => api.getUsers(), [])
  const [roles, setRoles] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('add')
  const [editingUser, setEditingUser] = useState(null)
  const [tempPasswordInfo, setTempPasswordInfo] = useState(null)

  useEffect(() => {
    api.getRoles().then(setRoles).catch(() => {})
  }, [])

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  const handleAddClick = () => {
    setFormMode('add')
    setEditingUser(null)
    setFormOpen(true)
  }

  const handleEditClick = (u) => {
    setFormMode('edit')
    setEditingUser(u)
    setFormOpen(true)
  }

  const handleFormSubmit = async (payload) => {
    if (formMode === 'add') {
      const res = await api.createUser(payload)
      setFormOpen(false)
      setTempPasswordInfo({ username: res.username, password: res.temp_password })
    } else {
      await api.updateUser(editingUser.user_id, payload)
      setFormOpen(false)
    }
    refetch()
  }

  const handleResetPassword = async (u) => {
    if (!window.confirm(`Generate a new temporary password for ${u.username}? They will need to change it on next sign in.`)) return
    try {
      const res = await api.resetUserPassword(u.user_id)
      setTempPasswordInfo({ username: res.username, password: res.temp_password })
    } catch (err) {
      alert(err.message || 'Failed to reset password')
    }
  }

  const rows = users || []

  return (
    <div className="space-y-4 w-full max-w-[1360px] mx-auto">
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface/50 dark:bg-surface/30 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Users size={16} className="text-primary" />
          <span className="text-base font-bold text-ink">User Management</span>
          <span className="text-sm font-mono px-2 py-0.5 rounded-full bg-surface text-ink-muted border border-border">
            {rows.length} accounts
          </span>
        </div>
        <button
          onClick={handleAddClick}
          className="px-4 py-1.5 rounded-lg bg-primary text-primary-fg text-sm font-bold hover:shadow-lg hover:shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} />
          <span>Add User</span>
        </button>
      </div>

      <div className="border border-border rounded-xl bg-surface/40 overflow-hidden shadow-xs">
        {error ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <AlertTriangle size={28} className="text-rose-500 mx-auto mb-2" />
            <p className="text-base font-bold text-ink mb-3">{error}</p>
            <button
              onClick={refetch}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-sm font-semibold"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : loading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : !rows.length ? (
          <div className="p-12 text-center">
            <Users size={28} className="text-ink-subtle mx-auto mb-2" />
            <p className="text-sm font-semibold text-ink-muted">No user accounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="bg-surface-2/30 border-b border-border text-[12px] font-bold text-ink-subtle uppercase tracking-wider">
                  <th className="px-5 py-3">Username</th>
                  <th className="px-5 py-3">Full Name</th>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Password</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map(u => (
                  <tr key={u.user_id} className="hover:bg-surface-2/40 transition-colors duration-150">
                    <td className="px-5 py-3 font-mono font-bold text-ink">
                      {u.username}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{u.full_name || '—'}</td>
                    <td className="px-5 py-3 font-mono text-ink-subtle">{u.company_code}</td>
                    <td className="px-5 py-3 text-ink-muted capitalize">{u.role_name}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={u.is_active ? 'ok' : 'offline'} label={u.is_active ? 'Active' : 'Disabled'} />
                    </td>
                    <td className="px-5 py-3">
                      {u.must_change_password
                        ? <StatusBadge status="warn" label="Change required" />
                        : <span className="text-ink-subtle text-[13px]">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="p-1.5 rounded-lg border border-border bg-surface-2 text-ink-muted hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
                          title="Reset password"
                        >
                          <KeyRound size={13} />
                        </button>
                        <button
                          onClick={() => handleEditClick(u)}
                          className="p-1.5 rounded-lg border border-border bg-surface-2 text-ink-muted hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
                          title="Edit user"
                        >
                          <Edit size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <UserFormModal
          mode={formMode}
          initial={editingUser}
          roles={roles}
          companyCode={user?.company_code}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
        />
      )}

      {tempPasswordInfo && (
        <TempPasswordModal
          username={tempPasswordInfo.username}
          password={tempPasswordInfo.password}
          onClose={() => setTempPasswordInfo(null)}
        />
      )}
    </div>
  )
}

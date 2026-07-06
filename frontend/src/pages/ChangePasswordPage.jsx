import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Eye, EyeOff, AlertCircle, Check, X, ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import clsx from 'clsx'

const RULES = [
  { key: 'length', label: 'At least 8 characters',       test: v => v.length >= 8 },
  { key: 'upper',  label: 'One uppercase letter (A-Z)',   test: v => /[A-Z]/.test(v) },
  { key: 'lower',  label: 'One lowercase letter (a-z)',   test: v => /[a-z]/.test(v) },
  { key: 'number', label: 'One number (0-9)',             test: v => /[0-9]/.test(v) },
  { key: 'special',label: 'One special character (!@#$...)', test: v => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v) },
]

export default function ChangePasswordPage() {
  const { user, applyNewToken } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const ruleResults = useMemo(
    () => RULES.map(r => ({ ...r, passed: r.test(newPassword) })),
    [newPassword]
  )
  const allRulesPassed = ruleResults.every(r => r.passed)
  const confirmMatches = confirmPassword.length > 0 && confirmPassword === newPassword

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!allRulesPassed) {
      setError('New password does not meet all the requirements below')
      return
    }
    if (!confirmMatches) {
      setError('New password and confirmation do not match')
      return
    }
    setLoading(true)
    try {
      const res = await api.changePassword({ current_password: currentPassword, new_password: newPassword })
      applyNewToken(res.token)
      setSuccess(true)
      setTimeout(() => navigate('/dashboard', { replace: true }), 900)
    } catch (err) {
      setError(err.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[440px] mx-auto">
      {user?.must_change_password && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-status-warn/10 border border-status-warn/20 mb-6">
          <ShieldAlert size={18} className="text-status-warn flex-shrink-0 mt-0.5" />
          <p className="text-sm text-ink leading-relaxed">
            Your password was set by an administrator. Please choose a new password before continuing.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20 flex-shrink-0">
          <KeyRound size={18} className="text-primary-fg" />
        </div>
        <h1 className="text-2xl font-bold tracking-tightest text-ink">
          Change Password
        </h1>
      </div>
      <p className="text-base text-ink-muted mb-8">
        Choose a strong password you have not used before.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-ink">Current password</label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              autoFocus
              value={currentPassword}
              onChange={e => { setCurrentPassword(e.target.value); setError('') }}
              placeholder=""
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-border bg-surface-2/60 text-ink text-base placeholder-ink-subtle focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(v => !v)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink transition-colors"
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-ink">New password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setError('') }}
              placeholder=""
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-border bg-surface-2/60 text-ink text-base placeholder-ink-subtle focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowNew(v => !v)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink transition-colors"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-ink">Confirm new password</label>
          <input
            type={showNew ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); setError('') }}
            placeholder=""
            className={clsx(
              'w-full px-3.5 py-2.5 rounded-xl border bg-surface-2/60 text-ink text-base placeholder-ink-subtle focus:ring-1 outline-none transition-all',
              confirmPassword.length === 0
                ? 'border-border focus:border-primary focus:ring-primary/20'
                : confirmMatches
                  ? 'border-status-ok focus:ring-status-ok/20'
                  : 'border-status-err focus:ring-status-err/20'
            )}
          />
        </div>

        {/* Live policy checklist */}
        <div className="p-3.5 rounded-xl border border-border bg-surface-2/40 flex flex-col gap-1.5">
          {ruleResults.map(r => (
            <div key={r.key} className="flex items-center gap-2 text-sm">
              {r.passed ? (
                <Check size={14} className="text-[color:var(--status-ok)] flex-shrink-0" />
              ) : (
                <X size={14} className="text-ink-subtle flex-shrink-0" />
              )}
              <span className={r.passed ? 'text-ink' : 'text-ink-muted'}>{r.label}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-status-err/10 border border-status-err/20">
            <AlertCircle size={15} className="text-status-err flex-shrink-0" />
            <span className="text-sm text-status-err font-semibold">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-status-ok/10 border border-status-ok/20">
            <Check size={15} className="text-status-ok flex-shrink-0" />
            <span className="text-sm text-status-ok font-semibold">Password changed. Redirecting...</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || success || !currentPassword || !allRulesPassed || !confirmMatches}
          className="mt-2 py-2.5 px-4 rounded-xl font-bold text-base bg-primary text-primary-fg hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {loading ? 'Changing password...' : 'Change Password'}
        </button>
      </form>
    </div>
  )
}

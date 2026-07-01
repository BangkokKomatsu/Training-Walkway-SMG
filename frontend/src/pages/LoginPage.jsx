import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setError('')
    setLoading(true)
    try {
      await login(username.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ / Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-bg text-ink flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden transition-colors duration-300">
      
      {/* Decorative ambient light leaks (Glowing effect in the background) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-primary/15 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[200px] h-[200px] bg-accent/10 rounded-full filter blur-[80px] pointer-events-none" />

      <div className="w-full max-w-[380px] relative z-10 group">
        
        {/* Glow behind the login box */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-2xl filter blur-[12px] opacity-20 group-hover:opacity-30 transition-all duration-700 pointer-events-none" />

        {/* Brand header */}
        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-accent mb-4 shadow-xl shadow-primary/30 relative">
            <div className="absolute inset-0 rounded-2xl bg-white/20 animate-ping opacity-20 pointer-events-none" />
            <Shield size={26} className="text-primary-fg" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink mb-1">
            WalkWay Monitor
          </h1>
          <p className="text-xs text-ink-muted font-semibold uppercase tracking-wider">
            Safety Management System
          </p>
        </div>

        {/* Foreground card */}
        <div className="p-7 rounded-2xl border border-border bg-surface/90 backdrop-blur-xl shadow-2xl">
          <p className="text-[10px] font-bold tracking-widest text-ink-subtle uppercase mb-5">
            AUTHENTICATION REQUIRED
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Username Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-ink-muted tracking-wider">
                USERNAME
              </label>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                placeholder="Enter safety ID or username"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-2/60 text-ink text-sm placeholder-ink-subtle focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-ink-muted tracking-wider">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-border bg-surface-2/60 text-ink text-sm placeholder-ink-subtle focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-status-err/10 border border-status-err/20 mt-1">
                <AlertCircle size={15} className="text-status-err flex-shrink-0" />
                <span className="text-[11px] text-status-err font-semibold">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="mt-2 py-2.5 px-4 rounded-xl font-bold text-sm bg-primary text-primary-fg hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                'Secure Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center mt-6 text-[10px] text-ink-subtle uppercase tracking-widest font-bold">
          © {new Date().getFullYear()} SMG · SECURE CONTROL PANEL
        </p>
      </div>
    </div>
  )
}

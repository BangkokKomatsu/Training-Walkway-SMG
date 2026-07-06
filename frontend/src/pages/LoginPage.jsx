import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Eye, EyeOff, AlertCircle, Loader2,
  User, Lock, ArrowRight, Camera, Bell, LayoutDashboard
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import loginHeroImage from '../assets/login-hero.png'

const FEATURES = [
  { icon: Camera,          title: 'Live Camera Monitoring', desc: 'RTSP feeds analyzed by YOLO11 detection' },
  { icon: Bell,            title: 'Instant Alerts',         desc: 'Microsoft Teams and email notifications' },
  { icon: LayoutDashboard, title: 'Safety Dashboard',        desc: 'Event history, trends and camera health' },
]

const PUBLISH_DATE = new Date().toLocaleString('en-GB', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
}).replace(',', '')

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
    <div className="min-h-[100dvh] w-full flex bg-bg text-ink font-sans">

      {/* Left: photographic brand panel, hidden below lg */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[44%] relative overflow-hidden flex-shrink-0">
        <img
          src={loginHeroImage}
          alt="Industrial warehouse floor monitored by the walkway safety system"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/60 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14">
          {/* Brand + description */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
                <Shield size={22} className="text-primary-fg" />
              </div>
              <span className="text-2xl font-bold tracking-tightest text-white">
                WalkWay Monitor
              </span>
            </div>

            <p className="text-base text-white/75 leading-relaxed max-w-[46ch] mb-10">
              Real-time walkway safety monitoring for industrial sites. AI-powered person
              detection identifies restricted-area intrusions, logs every incident, and
              alerts your team instantly.
            </p>

            <div className="flex flex-col gap-5">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-white leading-tight">{title}</p>
                    <p className="text-sm text-white/60 leading-tight mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom-left legal / build info */}
          <div className="text-sm text-white/50 leading-relaxed">
            <p>© {new Date().getFullYear()} Bangkok Komatsu Co., Ltd.</p>
            <p>Publish date : {PUBLISH_DATE}</p>
          </div>
        </div>
      </div>

      {/* Right: sign-in form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[380px]">

          {/* Compact brand header, mobile only */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
              <Shield size={22} className="text-primary-fg" />
            </div>
            <span className="text-2xl font-bold tracking-tightest text-ink">
              WalkWay Monitor
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tightest text-ink mb-1.5">
            Sign In
          </h1>
          <p className="text-base text-ink-muted mb-8">
            Enter your credentials to access the safety monitor.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Username Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-ink">
                Username
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
                <input
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError('') }}
                  placeholder="username"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-surface-2/60 text-ink text-base placeholder-ink-subtle focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-ink">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-surface-2/60 text-ink text-base placeholder-ink-subtle focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
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
              <div className="flex items-center gap-2 p-3 rounded-xl bg-status-err/10 border border-status-err/20">
                <AlertCircle size={15} className="text-status-err flex-shrink-0" />
                <span className="text-sm text-status-err font-semibold">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="mt-2 py-2.5 px-4 rounded-xl font-bold text-base bg-primary text-primary-fg hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-sm text-ink-subtle">
            Access is provisioned by your system administrator.
          </p>
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react'
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
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
      }}
    >
      {/* Top accent stripe */}
      <div style={{ height: 3, background: 'var(--primary)', flexShrink: 0 }} />

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
        }}
      >
        <div style={{ width: '100%', maxWidth: 360 }}>

          {/* Brand mark */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'var(--primary)',
                marginBottom: '0.75rem',
              }}
            >
              <Shield size={24} color="#fff" />
            </div>
            <h1
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--ink)',
                letterSpacing: '-0.025em',
                margin: 0,
              }}
            >
              WalkWay Monitor
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: 4, margin: '4px 0 0' }}>
              Safety Management System
            </p>
          </div>

          {/* Login card */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '1.75rem',
            }}
          >
            <p
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--ink-subtle)',
                marginBottom: '1.25rem',
              }}
            >
              Sign in to continue
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {/* Username */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--ink-muted)', letterSpacing: '0.04em' }}>
                  USERNAME
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError('') }}
                  placeholder="username"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 8,
                    border: `1px solid ${error ? 'var(--status-err)' : 'var(--border)'}`,
                    background: 'var(--surface-2)',
                    color: 'var(--ink)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.target.style.borderColor = error ? 'var(--status-err)' : 'var(--border)')}
                />
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--ink-muted)', letterSpacing: '0.04em' }}>
                  PASSWORD
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '0.625rem 2.25rem 0.625rem 0.75rem',
                      borderRadius: 8,
                      border: `1px solid ${error ? 'var(--status-err)' : 'var(--border)'}`,
                      background: 'var(--surface-2)',
                      color: 'var(--ink)',
                      fontSize: '0.875rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                    onBlur={e => (e.target.style.borderColor = error ? 'var(--status-err)' : 'var(--border)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      right: 9,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: 'var(--ink-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error banner */}
              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.5rem 0.75rem',
                    borderRadius: 8,
                    background: 'color-mix(in srgb, var(--status-err) 10%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--status-err) 25%, transparent)',
                  }}
                >
                  <AlertCircle size={13} style={{ color: 'var(--status-err)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--status-err)' }}>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username.trim() || !password}
                style={{
                  marginTop: '0.25rem',
                  padding: '0.625rem',
                  borderRadius: 8,
                  border: 'none',
                  background: loading || !username.trim() || !password
                    ? 'var(--surface-2)'
                    : 'var(--primary)',
                  color: loading || !username.trim() || !password
                    ? 'var(--ink-subtle)'
                    : '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: loading || !username.trim() || !password ? 'not-allowed' : 'pointer',
                  transition: 'background 120ms, color 120ms',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontFamily: 'inherit',
                  letterSpacing: '0.01em',
                }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        border: '2px solid currentColor',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p
            style={{
              textAlign: 'center',
              marginTop: '1.5rem',
              fontSize: '0.68rem',
              color: 'var(--ink-subtle)',
              letterSpacing: '0.02em',
            }}
          >
            © {new Date().getFullYear()} SMG · Authorized access only
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

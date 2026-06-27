import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, ChevronRight, AlertCircle } from 'lucide-react'
import { useCompany } from '../context/CompanyContext'

const DEMO_COMPANIES = [
  { code: 'DEMO-TH',  name: 'Demo Thailand' },
  { code: 'SITE-A',   name: 'Site Alpha' },
  { code: 'SITE-B',   name: 'Site Beta' },
]

export default function LoginPage() {
  const { selectCompany } = useCompany()
  const navigate = useNavigate()
  const [selected, setSelected] = useState('')
  const [manual, setManual] = useState('')
  const [error, setError] = useState('')

  const handleSelect = (code) => {
    setSelected(code)
    setManual('')
    setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const code = manual.trim() || selected
    if (!code) {
      setError('Please select or enter a company code.')
      return
    }
    selectCompany(code)
    navigate('/dashboard')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--primary)', flexShrink: 0 }}
          >
            <Shield size={20} style={{ color: 'var(--primary-fg)' }} />
          </div>
          <div>
            <p className="text-base font-semibold leading-tight" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              WalkWay Monitor
            </p>
            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              Safety Detection System
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--ink)', letterSpacing: '-0.025em' }}>
            Select your site
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>
            Intranet access only. No credentials required.
          </p>

          {/* Company list */}
          <div className="space-y-2 mb-4">
            {DEMO_COMPANIES.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => handleSelect(c.code)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all duration-[120ms]"
                style={{
                  background: selected === c.code ? 'color-mix(in oklch, var(--primary) 10%, var(--surface))' : 'var(--surface)',
                  borderColor: selected === c.code ? 'var(--primary)' : 'var(--border)',
                  color: 'var(--ink)',
                }}
              >
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs font-mono" style={{ color: 'var(--ink-muted)' }}>{c.code}</p>
                </div>
                {selected === c.code && (
                  <ChevronRight size={16} style={{ color: 'var(--primary)' }} />
                )}
              </button>
            ))}
          </div>

          {/* Manual entry */}
          <div className="mb-5">
            <label className="block text-xs mb-1.5" style={{ color: 'var(--ink-muted)' }}>
              Or enter company code manually
            </label>
            <input
              type="text"
              value={manual}
              onChange={e => { setManual(e.target.value); setSelected(''); setError('') }}
              placeholder="e.g. FACTORY-01"
              className="w-full px-3 py-2 rounded-lg text-sm font-mono"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--ink)',
                outline: 'none',
                transition: 'border-color 120ms',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 mb-4 text-xs" style={{ color: 'var(--status-err)' }}>
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity duration-[120ms] hover:opacity-90 active:opacity-80"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            Enter Dashboard
          </button>
        </form>

        <p className="mt-6 text-center text-[11px]" style={{ color: 'var(--ink-subtle)' }}>
          No authentication — intranet deployment only. Add SSO/LDAP as needed.
        </p>
      </div>
    </div>
  )
}

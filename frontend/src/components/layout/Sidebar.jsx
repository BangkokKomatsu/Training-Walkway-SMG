import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ListChecks,
  Camera,
  Bell,
  Activity,
  Shield,
  LogOut,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/events',    icon: ListChecks,       label: 'Event Log' },
  { to: '/cameras',   icon: Camera,           label: 'Cameras' },
  { to: '/alerts',    icon: Bell,             label: 'Alerts' },
  { to: '/health',    icon: Activity,         label: 'System Health' },
]

function CompanySwitcher({ activeCompanyCode, switchCompany }) {
  const [companies, setCompanies] = useState([])

  useEffect(() => {
    api.getCompanies().then(setCompanies).catch(() => {})
  }, [])

  return (
    <div className="px-5 pt-4 pb-2">
      <div className="text-[10px] font-sans mb-1" style={{ color: 'var(--ink-subtle)' }}>VIEW COMPANY</div>
      <select
        value={activeCompanyCode || ''}
        onChange={e => switchCompany(e.target.value || null)}
        style={{
          width: '100%',
          padding: '0.35rem 0.5rem',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--surface-2)',
          color: activeCompanyCode ? 'var(--primary)' : 'var(--ink-muted)',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono, monospace)',
          fontWeight: 500,
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        <option value="">All Companies</option>
        {companies.map(c => (
          <option key={c.company_code} value={c.company_code}>
            {c.company_code} — {c.company_name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function Sidebar({ open, onClose }) {
  const { user, activeCompanyCode, logout, switchCompany } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={clsx(
        'fixed top-0 left-0 h-full w-60 flex flex-col transition-transform duration-[220ms]',
        'border-r lg:translate-x-0 lg:relative lg:flex-shrink-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        zIndex: 'var(--z-sidebar)',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Logo / brand */}
      <div
        className="flex items-center justify-between px-5 h-14 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <Shield size={18} style={{ color: 'var(--primary)' }} />
          <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
            WalkWay Monitor
          </span>
        </div>
        <button
          className="lg:hidden p-1 rounded"
          onClick={onClose}
          aria-label="Close sidebar"
          style={{ color: 'var(--ink-muted)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* User info */}
      <div className="px-5 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {(user?.username?.[0] ?? '?').toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="text-xs font-medium truncate" style={{ color: 'var(--ink)' }}>
              {user?.full_name || user?.username || '—'}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'var(--ink-subtle)' }}>
              {user?.is_super_admin ? 'Super Admin' : (user?.role_name || 'viewer')}
            </p>
          </div>
        </div>
      </div>

      {/* Company badge / switcher */}
      {user?.is_super_admin ? (
        <CompanySwitcher activeCompanyCode={activeCompanyCode} switchCompany={switchCompany} />
      ) : (
        activeCompanyCode && (
          <div className="px-5 pt-2 pb-2">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--primary)',
                border: '1px solid var(--border)',
              }}
            >
              <span className="text-[10px] font-sans" style={{ color: 'var(--ink-subtle)' }}>COMPANY</span>
              <span className="font-medium">{activeCompanyCode}</span>
            </div>
          </div>
        )
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors duration-[120ms]',
                isActive
                  ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
                  : 'text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-5 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded text-sm font-medium transition-colors duration-[120ms] hover:bg-[var(--surface-2)]"
          style={{ color: 'var(--ink-muted)' }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}

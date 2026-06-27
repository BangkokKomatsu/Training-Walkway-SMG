import React from 'react'
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
import { useCompany } from '../../context/CompanyContext'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/events',    icon: ListChecks,       label: 'Event Log' },
  { to: '/cameras',   icon: Camera,           label: 'Cameras' },
  { to: '/alerts',    icon: Bell,             label: 'Alerts' },
  { to: '/health',    icon: Activity,         label: 'System Health' },
]

export default function Sidebar({ open, onClose }) {
  const { companyCode, clearCompany } = useCompany()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearCompany()
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

      {/* Company badge */}
      {companyCode && (
        <div className="px-5 pt-4 pb-2">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono"
            style={{
              background: 'var(--surface-2)',
              color: 'var(--primary)',
              border: '1px solid var(--border)',
            }}
          >
            <span className="text-[10px] font-sans" style={{ color: 'var(--ink-muted)' }}>COMPANY</span>
            <span className="font-medium">{companyCode}</span>
          </div>
        </div>
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

      {/* Logout */}
      <div className="px-3 pb-5 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded text-sm font-medium transition-colors duration-[120ms] hover:bg-[var(--surface-2)]"
          style={{ color: 'var(--ink-muted)' }}
        >
          <LogOut size={16} />
          Change Company
        </button>
      </div>
    </aside>
  )
}

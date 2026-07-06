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
  ChevronLeft,
  ChevronRight,
  Building
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

function CompanySwitcher({ activeCompanyCode, switchCompany, collapsed }) {
  const [companies, setCompanies] = useState([])

  useEffect(() => {
    api.getCompanies().then(setCompanies).catch(() => {})
  }, [])

  if (collapsed) {
    return (
      <div className="flex justify-center py-2" title="Switch Company">
        <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-[12px] font-mono font-bold text-primary">
          {activeCompanyCode || 'ALL'}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-3 pb-2 transition-all">
      <div className="text-[12px] font-semibold mb-1 text-ink-subtle tracking-wider flex items-center gap-1">
        <Building size={10} />
        VIEW COMPANY
      </div>
      <select
        value={activeCompanyCode || ''}
        onChange={e => switchCompany(e.target.value || null)}
        className="w-full px-2 py-1.5 rounded-md border border-border bg-surface-2 text-ink text-sm font-mono font-medium cursor-pointer outline-none focus:border-primary transition-all"
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

export default function Sidebar({ mobileOpen, onCloseMobile, collapsed, onToggleCollapse }) {
  const { user, activeCompanyCode, logout, switchCompany } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={clsx(
        'fixed lg:relative lg:flex-shrink-0 top-0 left-0 h-full flex flex-col transition-all duration-300 ease-in-out border-r border-border bg-surface/90 backdrop-blur-md',
        mobileOpen ? 'translate-x-0 w-60 z-50' : '-translate-x-full lg:translate-x-0 z-30',
        collapsed ? 'lg:w-16' : 'lg:w-60'
      )}
    >
      {/* Brand logo bar */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/25">
            <Shield size={16} className="text-white" />
          </div>
          {(!collapsed || mobileOpen) && (
            <span className="text-base font-bold tracking-tight text-ink whitespace-nowrap animate-fade-in">
              WalkWay Monitor
            </span>
          )}
        </div>
        
        {/* Mobile close button */}
        <button
          className="lg:hidden p-1 rounded-md text-ink-muted hover:bg-surface-2"
          onClick={onCloseMobile}
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>

        {/* Desktop collapse toggle button */}
        {(!mobileOpen) && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md border border-border bg-surface-2 text-ink-muted hover:text-ink absolute -right-3 top-4 shadow-sm z-40 hover:bg-surface"
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        )}
      </div>

      {/* User profile section */}
      <div className="p-3 border-b border-border flex-shrink-0">
        <div className={clsx("flex items-center gap-2", collapsed && !mobileOpen ? "justify-center" : "px-1")}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-bold text-primary-fg text-sm shadow-md shadow-primary/20 flex-shrink-0">
            {(user?.username?.[0] ?? '?').toUpperCase()}
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="min-w-0 animate-fade-in">
              <p className="text-sm font-bold text-ink truncate leading-tight">
                {user?.full_name || user?.username || '—'}
              </p>
              <span className="inline-block mt-0.5 text-[11px] px-1.5 py-0.2 bg-primary/10 text-primary rounded-full font-semibold border border-primary/20">
                {user?.is_super_admin ? 'Super Admin' : (user?.role_name || 'viewer')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Company Switcher / Details */}
      {user?.is_super_admin ? (
        <CompanySwitcher
          activeCompanyCode={activeCompanyCode}
          switchCompany={switchCompany}
          collapsed={collapsed && !mobileOpen}
        />
      ) : (
        activeCompanyCode && (
          <div className={clsx("p-3", collapsed && !mobileOpen ? "flex justify-center" : "")}>
            <div
              className={clsx(
                "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-mono border border-border bg-surface-2 text-primary",
                collapsed && !mobileOpen ? "w-8 h-8 justify-center p-0" : "w-full"
              )}
              title={`Active Company: ${activeCompanyCode}`}
            >
              {collapsed && !mobileOpen ? (
                <span className="font-bold">{activeCompanyCode.slice(0, 3)}</span>
              ) : (
                <>
                  <span className="text-[11px] text-ink-subtle font-sans font-normal">COMP:</span>
                  <span className="font-semibold">{activeCompanyCode}</span>
                </>
              )}
            </div>
          </div>
        )
      )}

      {/* Navigation menu */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onCloseMobile}
            title={collapsed && !mobileOpen ? label : undefined}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                collapsed && !mobileOpen ? 'justify-center px-0' : ''
              )
            }
          >
            <Icon size={16} className="flex-shrink-0" />
            {(!collapsed || mobileOpen) && <span className="animate-fade-in">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Sign out bar */}
      <div className="p-2 border-t border-border flex-shrink-0">
        <button
          onClick={handleLogout}
          title={collapsed && !mobileOpen ? "Sign Out" : undefined}
          className={clsx(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-muted hover:bg-red-500/10 hover:text-red-500 transition-all duration-200",
            collapsed && !mobileOpen ? "justify-center px-0" : ""
          )}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {(!collapsed || mobileOpen) && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}

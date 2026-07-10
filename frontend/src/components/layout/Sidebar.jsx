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
  Menu,
  Building,
  KeyRound,
  Users
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/events',    icon: ListChecks,       label: 'Event Log' },
  { to: '/cameras',   icon: Camera,           label: 'Cameras' },
  { to: '/alerts',    icon: Bell,             label: 'Alerts' },
  { to: '/health',    icon: Activity,         label: 'System Health' },
]

const ADMIN_NAV = [
  { to: '/users', icon: Users, label: 'User Management' },
]

export default function Sidebar({ mobileOpen, onCloseMobile, collapsed, onToggleCollapse }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role_name === 'admin'
  const navItems = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV

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
        {(!collapsed || mobileOpen) && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/25">
              <Shield size={16} className="text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-ink whitespace-nowrap animate-fade-in">
              WalkWay Monitor
            </span>
          </div>
        )}

        {/* Desktop collapse/expand toggle — hamburger */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={clsx(
            'hidden lg:flex items-center justify-center w-9 h-9 rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors duration-150 cursor-pointer flex-shrink-0',
            collapsed && !mobileOpen && 'mx-auto'
          )}
        >
          <Menu size={18} />
        </button>

        {/* Mobile close button */}
        <button
          className="lg:hidden p-2 rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors"
          onClick={onCloseMobile}
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>
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
                {user?.role_name || 'viewer'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Company badge (single-tenant — this deployment's company) */}
      {user?.company_code && (
        <div className={clsx("p-3", collapsed && !mobileOpen ? "flex justify-center" : "")}>
          <div
            className={clsx(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-mono border border-border bg-surface-2 text-primary",
              collapsed && !mobileOpen ? "w-8 h-8 justify-center p-0" : "w-full"
            )}
            title={`Company: ${user.company_code}`}
          >
            {collapsed && !mobileOpen ? (
              <span className="font-bold">{user.company_code.slice(0, 3)}</span>
            ) : (
              <>
                <Building size={11} className="text-ink-subtle" />
                <span className="font-semibold">{user.company_code}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Navigation menu */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
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

      {/* Account actions */}
      <div className="p-2 border-t border-border flex-shrink-0 space-y-1">
        <NavLink
          to="/change-password"
          onClick={onCloseMobile}
          title={collapsed && !mobileOpen ? 'Change Password' : undefined}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200',
              isActive
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
              collapsed && !mobileOpen ? 'justify-center px-0' : ''
            )
          }
        >
          <KeyRound size={16} className="flex-shrink-0" />
          {(!collapsed || mobileOpen) && <span>Change Password</span>}
        </NavLink>
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

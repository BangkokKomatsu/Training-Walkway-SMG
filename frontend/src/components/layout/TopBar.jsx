import React from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Sun, Moon, Shield, Building } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard Overview',
  '/events':    'Safety Event Log',
  '/cameras':   'Camera Monitor Feeds',
  '/alerts':    'Notification Alerts',
  '/health':    'System Health Diagnostics',
}

export default function TopBar({ onMenuClick }) {
  const { theme, toggle } = useTheme()
  const { user, activeCompanyCode } = useAuth()
  const location = useLocation()

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] ?? 'Walkway Monitor'

  return (
    <header
      className="flex items-center justify-between px-6 h-14 border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-30"
    >
      {/* Title & Hamburger */}
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 rounded-md hover:bg-surface-2 text-ink-muted hover:text-ink transition-colors duration-150"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-sm font-bold tracking-tight text-ink">
          {title}
        </h1>
      </div>

      {/* Utilities / Actions & User Profile */}
      <div className="flex items-center gap-4">
        {/* Company indicator */}
        {activeCompanyCode && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono border border-border bg-surface-2 text-primary font-bold">
            <Building size={11} />
            <span>{activeCompanyCode}</span>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="p-2 rounded-md hover:bg-surface-2 text-ink-muted hover:text-ink transition-colors duration-150"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun size={15} className="text-amber-400" />
          ) : (
            <Moon size={15} className="text-indigo-500" />
          )}
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* User preview */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-ink leading-none">
              {user?.full_name || user?.username || 'Operator'}
            </p>
            <span className="text-[9px] text-ink-subtle leading-none mt-0.5">
              {user?.is_super_admin ? 'System Admin' : (user?.role_name || 'operator')}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-primary/10">
            {(user?.username?.[0] ?? '?').toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}

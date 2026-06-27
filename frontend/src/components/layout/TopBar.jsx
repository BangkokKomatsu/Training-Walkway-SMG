import React from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/events':    'Event Log',
  '/cameras':   'Camera Monitor',
  '/alerts':    'Alert Monitor',
  '/health':    'System Health',
}

export default function TopBar({ onMenuClick }) {
  const { theme, toggle } = useTheme()
  const location = useLocation()

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] ?? 'Walkway Monitor'

  return (
    <header
      className="flex items-center justify-between px-5 h-14 border-b flex-shrink-0"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        zIndex: 'var(--z-sticky)',
      }}
    >
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-1.5 rounded hover:bg-[var(--surface-2)] transition-colors duration-[120ms]"
          onClick={onMenuClick}
          aria-label="Open navigation"
          style={{ color: 'var(--ink-muted)' }}
        >
          <Menu size={18} />
        </button>
        <h1 className="text-sm font-semibold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
      </div>

      <button
        onClick={toggle}
        className="p-2 rounded hover:bg-[var(--surface-2)] transition-colors duration-[120ms]"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        style={{ color: 'var(--ink-muted)' }}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  )
}

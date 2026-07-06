import React, { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-ink">
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs lg:hidden z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          onMenuClick={() => setMobileOpen(true)}
          collapsed={collapsed}
        />
        
        {/* Main Content Area */}
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-bg transition-all duration-300"
        >
          {children}
        </main>

        {/* Footer */}
        <footer className="py-2.5 px-6 border-t border-border bg-surface text-ink-subtle text-[13px] flex items-center justify-between flex-shrink-0">
          <div>
            © {new Date().getFullYear()} WalkWay Safety Monitor · Bangkok Komatsu
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Monitor Connected
            </span>
            <span className="font-mono opacity-60">v1.2.0</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

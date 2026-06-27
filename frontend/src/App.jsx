import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { CompanyProvider, useCompany } from './context/CompanyContext'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EventLogPage from './pages/EventLogPage'
import EventDetailPage from './pages/EventDetailPage'
import CameraMonitorPage from './pages/CameraMonitorPage'
import AlertMonitorPage from './pages/AlertMonitorPage'
import SystemHealthPage from './pages/SystemHealthPage'

function ProtectedRoutes() {
  const { companyCode } = useCompany()
  if (!companyCode) return <Navigate to="/login" replace />
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/events" element={<EventLogPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/cameras" element={<CameraMonitorPage />} />
        <Route path="/alerts" element={<AlertMonitorPage />} />
        <Route path="/health" element={<SystemHealthPage />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <CompanyProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </CompanyProvider>
    </ThemeProvider>
  )
}

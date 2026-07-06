import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import DashboardPage from './pages/DashboardPage'
import EventLogPage from './pages/EventLogPage'
import EventDetailPage from './pages/EventDetailPage'
import CameraMonitorPage from './pages/CameraMonitorPage'
import AlertMonitorPage from './pages/AlertMonitorPage'
import SystemHealthPage from './pages/SystemHealthPage'
import UserManagementPage from './pages/UserManagementPage'
import ApiAccessPage from './pages/ApiAccessPage'

function ProtectedRoutes() {
  const { token, user } = useAuth()
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace />

  // Force the password-change gate before any other page is reachable
  if (user?.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/events" element={<EventLogPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/cameras" element={<CameraMonitorPage />} />
        <Route path="/alerts" element={<AlertMonitorPage />} />
        <Route path="/health" element={<SystemHealthPage />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/api-access" element={<ApiAccessPage />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

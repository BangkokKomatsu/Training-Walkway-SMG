import React, { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const TOKEN_KEY   = 'smg-ww-token'
const COMPANY_KEY = 'smg-ww-company'

function decodeJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

function isTokenExpired(token) {
  const payload = decodeJwt(token)
  if (!payload?.exp) return true
  return Date.now() >= payload.exp * 1000
}

function getStoredToken() {
  const t = localStorage.getItem(TOKEN_KEY)
  if (!t || isTokenExpired(t)) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(COMPANY_KEY)
    return null
  }
  return t
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken)
  const [user,  setUser]  = useState(() => {
    const t = getStoredToken()
    return t ? decodeJwt(t) : null
  })
  const [activeCompanyCode, setActiveCompanyCodeState] = useState(
    () => localStorage.getItem(COMPANY_KEY) || null
  )

  const login = useCallback(async (username, password) => {
    const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
    const res = await fetch(`${BASE}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Login failed')

    const { token: newToken, user: userData } = body
    localStorage.setItem(TOKEN_KEY,   newToken)
    localStorage.setItem(COMPANY_KEY, userData.company_code)
    setToken(newToken)
    setUser(userData)
    setActiveCompanyCodeState(userData.company_code)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(COMPANY_KEY)
    setToken(null)
    setUser(null)
    setActiveCompanyCodeState(null)
  }, [])

  // Super admin only — switch the "active" company without changing the JWT
  const switchCompany = useCallback((code) => {
    if (!user?.is_super_admin) return
    const cleaned = code.trim().toUpperCase()
    localStorage.setItem(COMPANY_KEY, cleaned)
    setActiveCompanyCodeState(cleaned)
  }, [user])

  return (
    <AuthContext.Provider value={{ token, user, activeCompanyCode, login, logout, switchCompany }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

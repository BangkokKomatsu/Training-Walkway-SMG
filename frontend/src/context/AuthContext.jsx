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
    // Super Admin: default = ทุกบริษัท (null) — Regular user: บริษัทตัวเอง
    const initialCompany = userData.is_super_admin ? null : userData.company_code
    localStorage.setItem(TOKEN_KEY, newToken)
    if (initialCompany) localStorage.setItem(COMPANY_KEY, initialCompany)
    else localStorage.removeItem(COMPANY_KEY)
    setToken(newToken)
    setUser(userData)
    setActiveCompanyCodeState(initialCompany)
    return userData
  }, [])

  // Called after a successful password change — server re-signs the JWT with
  // must_change_password cleared, so the forced-change gate lifts immediately.
  const applyNewToken = useCallback((newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
    setUser(decodeJwt(newToken))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(COMPANY_KEY)
    setToken(null)
    setUser(null)
    setActiveCompanyCodeState(null)
  }, [])

  // Super admin only — null = ทุกบริษัท, 'DEMO' = กรองเฉพาะบริษัทนั้น
  const switchCompany = useCallback((code) => {
    if (!user?.is_super_admin) return
    if (code) {
      localStorage.setItem(COMPANY_KEY, code)
      setActiveCompanyCodeState(code)
    } else {
      localStorage.removeItem(COMPANY_KEY)
      setActiveCompanyCodeState(null)
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ token, user, activeCompanyCode, login, logout, switchCompany, applyNewToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

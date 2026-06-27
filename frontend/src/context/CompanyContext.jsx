import React, { createContext, useContext, useState } from 'react'

const CompanyContext = createContext(null)

export function CompanyProvider({ children }) {
  const [companyCode, setCompanyCode] = useState(
    () => localStorage.getItem('ww-company') || null
  )

  const selectCompany = (code) => {
    localStorage.setItem('ww-company', code)
    setCompanyCode(code)
  }

  const clearCompany = () => {
    localStorage.removeItem('ww-company')
    setCompanyCode(null)
  }

  return (
    <CompanyContext.Provider value={{ companyCode, selectCompany, clearCompany }}>
      {children}
    </CompanyContext.Provider>
  )
}

export const useCompany = () => useContext(CompanyContext)

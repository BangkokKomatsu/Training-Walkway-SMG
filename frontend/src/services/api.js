const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

async function get(path, params = {}) {
  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, v)
  })
  const res = await fetch(url.toString())
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  getDashboard:   (companyCode)          => get('/api/dashboard',    { company_code: companyCode }),
  getEvents:      (params)               => get('/api/events',       params),
  getEventDetail: (id, companyCode)      => get(`/api/events/${id}`, { company_code: companyCode }),
  getCameras:     (companyCode)          => get('/api/cameras',      { company_code: companyCode }),
  getAlerts:      (params)               => get('/api/alerts',       params),
  getHealth:      (companyCode)          => get('/api/health',       { company_code: companyCode }),
}

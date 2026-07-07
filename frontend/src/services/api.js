const BASE      = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
const TOKEN_KEY  = 'smg-ww-token'
const COMPANY_KEY = 'smg-ww-company'

function authHeaders() {
  const token   = localStorage.getItem(TOKEN_KEY)
  const company = localStorage.getItem(COMPANY_KEY)
  const h = {}
  if (token)   h['Authorization'] = `Bearer ${token}`
  if (company) h['x-company']     = company
  return h
}

async function get(path, params = {}) {
  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, v)
  })
  const res = await fetch(url.toString(), { headers: authHeaders() })
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(COMPANY_KEY)
    window.location.href = '/login'
    return
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

async function post(path, body = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  })
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(COMPANY_KEY)
    window.location.href = '/login'
    return
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  changePassword: (payload)     => post('/api/auth/change-password', payload),
  getDashboard:   (params = {}) => get('/api/dashboard', params),
  getEvents:      (params = {}) => get('/api/events',    params),
  getEventDetail: (id)          => get(`/api/events/${id}`),
  getCameras:     (params = {}) => get('/api/cameras',   params),
  getAlerts:      (params = {}) => get('/api/alerts',    params),
  getHealth:      (params = {}) => get('/api/health',    params),
  getCompanies:   ()            => get('/api/companies'),
  closeEvent:     (id, payload) => post(`/api/events/${id}/close`, payload),
  bulkUpdateEvents:  (payload)  => post('/api/events/bulk-update', payload),
  getCameraPolygons: (camera_no) => get(`/api/cameras/${camera_no}/polygons`),
  saveCameraPolygons:(camera_no, payload) => post(`/api/cameras/${camera_no}/polygons`, payload),
  getCameraSnapshot: (camera_no) => get(`/api/cameras/${camera_no}/snapshot`),
  requestCameraSnapshotSync: (camera_no) => post(`/api/cameras/${camera_no}/snapshot/sync`),
  // mode: 'local' ต้องแนบ bearer token เอง ใช้ <img src> ตรงๆ ไม่ได้ — คืน blob object URL แทน
  getCameraSnapshotBlobUrl: async (camera_no) => {
    const res = await fetch(`${BASE}/api/cameras/${camera_no}/snapshot/raw`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  },
  createCamera:      (payload)  => post('/api/cameras', payload),
  updateCamera:      (camera_no, payload) => post(`/api/cameras/${camera_no}/update`, payload),
  deleteCamera:      (camera_no) => post(`/api/cameras/${camera_no}/delete`),
  getRoles:          ()          => get('/api/roles'),
  getUsers:          (params = {}) => get('/api/users', params),
  createUser:        (payload)  => post('/api/users', payload),
  updateUser:        (id, payload) => post(`/api/users/${id}/update`, payload),
  resetUserPassword: (id, payload = {}) => post(`/api/users/${id}/reset-password`, payload),
  getCompanyApiKey:  ()          => get('/api/company/api-key'),
  regenerateApiKey:  ()          => post('/api/company/api-key/regenerate'),
  getCompanyUsage:   (params = {}) => get('/api/company/usage', params),
  getBillingOverview: ()         => get('/api/admin/billing-overview'),
}

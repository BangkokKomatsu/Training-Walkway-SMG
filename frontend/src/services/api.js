const BASE      = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
const TOKEN_KEY = 'smg-ww-token'

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function onUnauthorized() {
  localStorage.removeItem(TOKEN_KEY)
  window.location.href = '/login'
}

async function get(path, params = {}) {
  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, v)
  })
  const res = await fetch(url.toString(), { headers: authHeaders() })
  if (res.status === 401) return onUnauthorized()
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

async function post(path, body = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  if (res.status === 401) return onUnauthorized()
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// Fetch a bearer-protected binary path and return an object URL usable in <img src>.
async function blobUrl(path) {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return URL.createObjectURL(await res.blob())
}

export const api = {
  changePassword: (payload)     => post('/api/auth/change-password', payload),
  getDashboard:   (params = {}) => get('/api/dashboard', params),
  getEvents:      (params = {}) => get('/api/events',    params),
  getEventDetail: (id)          => get(`/api/events/${id}`),
  getCameras:     (params = {}) => get('/api/cameras',   params),
  getAlerts:      (params = {}) => get('/api/alerts',    params),
  getHealth:      (params = {}) => get('/api/health',    params),
  getLocalImages: ()            => get('/api/local-images'),
  closeEvent:     (id, payload) => post(`/api/events/${id}/close`, payload),
  bulkUpdateEvents:  (payload)  => post('/api/events/bulk-update', payload),
  getCameraPolygons: (camera_no) => get(`/api/cameras/${camera_no}/polygons`),
  saveCameraPolygons:(camera_no, payload) => post(`/api/cameras/${camera_no}/polygons`, payload),
  getCameraSnapshot: (camera_no) => get(`/api/cameras/${camera_no}/snapshot`),
  requestCameraSnapshotSync: (camera_no) => post(`/api/cameras/${camera_no}/snapshot/sync`),
  // Auth-protected image paths (camera snapshot 'local' mode, event detection image) can't
  // go in a bare <img src> — fetch with the bearer token and return a blob object URL.
  authBlobUrl: (path) => blobUrl(path),
  getCameraSnapshotBlobUrl: (camera_no) => blobUrl(`/api/cameras/${camera_no}/snapshot/raw`),
  createCamera:      (payload)  => post('/api/cameras', payload),
  updateCamera:      (camera_no, payload) => post(`/api/cameras/${camera_no}/update`, payload),
  deleteCamera:      (camera_no) => post(`/api/cameras/${camera_no}/delete`),
  getRoles:          ()          => get('/api/roles'),
  getUsers:          (params = {}) => get('/api/users', params),
  createUser:        (payload)  => post('/api/users', payload),
  updateUser:        (id, payload) => post(`/api/users/${id}/update`, payload),
  resetUserPassword: (id, payload = {}) => post(`/api/users/${id}/reset-password`, payload),
}

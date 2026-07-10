# Module 10 — React + Vite + Tailwind Frontend

> **ระดับ:** กลาง | **เวลาโดยประมาณ:** 150–180 นาที

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- รัน frontend development server ได้
- เข้าใจโครงสร้างโปรเจกต์ React+Vite+Tailwind
- เรียกข้อมูลจาก data-api ผ่าน `api.js`
- เข้าใจ component หลัก: AppShell, Sidebar, Pages
- เข้าใจกลไก **Authentication & Authorization** ทั้งระบบ — bcrypt hashing, JWT issuance/verification, และการโหลดรูปภาพแบบแนบ token (bearer)
- ดู Dashboard, Event Log, Event Detail, Camera Monitor บนเว็บได้
- Build เป็น `dist/` สำหรับ deploy

---

## ส่วนที่ 2 — สิ่งที่ต้องเตรียม

- ผ่าน Module 01–09
- Node.js ≥ 18 (ดาวน์โหลดจาก nodejs.org)
- npm ≥ 9
- data-api รันอยู่ (หรือ mock data สำหรับทดสอบ frontend เพียงอย่างเดียว)

---

## ส่วนที่ 3 — คำอธิบายเข้าใจง่าย

### React คืออะไร?

**React** คือ JavaScript library สำหรับสร้าง UI แบบ component-based แต่ละส่วนหน้าเว็บเป็น "component" ที่มี logic + UI อยู่ด้วยกัน

```text
App
├── AppShell (layout)
│   ├── Sidebar (เมนู + badge บริษัท)
│   └── TopBar (header + theme toggle)
└── Pages
    ├── DashboardPage
    ├── EventLogPage
    ├── EventDetailPage
    ├── CameraMonitorPage
    ├── AlertMonitorPage
    └── SystemHealthPage
```
### Vite คืออะไร?

**Vite** คือ build tool สำหรับโปรเจกต์ JavaScript สมัยใหม่ เร็วกว่า Webpack มาก ใช้สำหรับ:
- `npm run dev` → dev server ที่ hot-reload
- `npm run build` → build เป็น static files พร้อม deploy

### Tailwind CSS คืออะไร?

**Tailwind** คือ CSS framework แบบ utility-first เขียน style ตรงใน HTML/JSX โดยใช้ class names:

```jsx
// แทนที่จะเขียน CSS แยก
<div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
  <span className="text-red-400 font-bold">ALERT</span>
</div>
```
> โปรเจกต์นี้ยังใช้ [`clsx`](https://www.npmjs.com/package/clsx) ควบคู่กับ Tailwind เพื่อสลับ class แบบมีเงื่อนไข (conditional className) เช่นใน `Sidebar.jsx` ที่ต้องสลับ style ตอน collapsed/expanded หรือ active/inactive route — ดูตัวอย่างจริงในหัวข้อ 5.3

### Data Flow ใน Frontend

```text
ผู้ใช้เปิดเว็บ
    ↓
Login หน้าเว็บ (username + password) → POST /api/auth/login → ได้รับ JWT Token (เก็บใน localStorage)
    ↓
React component mount
    ↓
api.js ส่ง Request พร้อม `Authorization: Bearer <token>`
    ↓
data-api (Node/Express) ตรวจสอบ Token → เรียก MSSQL SP → คืน JSON
    ↓
React แสดงผลข้อมูล
```
**สำคัญ:** Frontend ไม่ต่อ MSSQL ตรง ๆ — ผ่าน data-api เสมอ และทุก API Endpoint (ยกเว้น Login) ต้องใช้ JWT Token กลไกเบื้องหลังทั้งหมดนี้ (bcrypt, JWT, การโหลดรูปภาพแบบแนบ token) อธิบายละเอียดในหัวข้อ **5.6 — Authentication & Authorization** ด้านล่าง

---

## ส่วนที่ 4 — Flow การทำงาน

```text
npm install (ครั้งแรก)
        ↓
ตั้งค่า frontend/.env.local
        ↓
npm run dev → เปิดเว็บ http://localhost:5173
        ↓
Login ด้วย username + password (ไม่มีช่อง company_code — บริษัทถูกกำหนดจาก JWT ฝั่ง server)
        ↓
ดู Dashboard / Event Log / Event Detail / Camera Monitor
        ↓
npm run build → ได้ dist/ → ทีม admin deploy IIS HTTPS
```
---

## ส่วนที่ 5 — ตัวอย่าง Code

ดูไฟล์จริงใน [frontend/src/](../../frontend/src/)

### 5.1 ติดตั้งและรัน

```bash
# ไปยัง folder frontend
cd frontend

# ติดตั้ง dependencies (ครั้งแรก หรือหลัง npm package เปลี่ยน)
npm install

# รัน dev server
npm run dev

# จะเห็น:
#   VITE v6.x.x  ready in 300ms
#   ➜  Local:   http://localhost:5173/
#   ➜  Network: http://192.168.x.x:5173/
```
### 5.2 ตั้งค่า `.env.local`

```bash
# frontend/.env.local
VITE_API_BASE_URL=http://localhost:3001
```
> ถ้าไม่มีไฟล์นี้ จะใช้ `http://localhost:3001` เป็น default (ตั้งไว้ใน `api.js` แล้ว)

### 5.3 โครงสร้าง frontend/

```text
frontend/
├── index.html              ← entry HTML
├── vite.config.js          ← Vite config
├── tailwind.config.js      ← Tailwind config
├── package.json
├── .env.example
└── src/
    ├── main.jsx            ← entry JS (render App)
    ├── App.jsx             ← routing + auth guard
    ├── index.css           ← global styles + Tailwind directives
    │
    ├── context/
    │   ├── AuthContext.jsx     ← token, user, login(), logout(), applyNewToken() — ตัวจริงที่ใช้งานทั้งระบบ
    │   └── ThemeContext.jsx    ← light/dark mode (theme, toggle)
    │
    ├── services/
    │   └── api.js              ← ฟังก์ชัน fetch ทุกอย่าง (~24 methods)
    │
    ├── hooks/
    │   ├── useAsync.js         ← custom hook มาตรฐานสำหรับดึงข้อมูล async (loading/error/refetch)
    │   └── useImageSrc.js      ← แปลง image_url เป็น src ให้ <img> — ถ้าเป็น path `/api/...` จะ fetch พร้อม token แล้วคืน blob URL
    │
    ├── utils/
    │   └── format.js           ← formatDateTime, formatConfidence, formatRelative
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.jsx   ← layout หลัก (sidebar + topbar + main + footer)
    │   │   ├── Sidebar.jsx    ← เมนูด้านซ้าย + badge บริษัท (read-only) + collapse/mobile drawer
    │   │   └── TopBar.jsx     ← header + theme toggle (sun/moon)
    │   └── ui/
    │       ├── StatusBadge.jsx    ← badge แสดงสถานะ
    │       ├── DashboardCard.jsx  ← card สรุปตัวเลข
    │       ├── ImagePreview.jsx   ← แสดงรูป detection (มี placeholder ถ้าไม่มีรูป)
    │       ├── FilterPanel.jsx    ← filter panel
    │       ├── LoadingState.jsx   ← **ไม่มี default export** — export เป็น named เท่านั้น: LoadingSpinner, PageLoading, ErrorState, EmptyState, SkeletonMetrics, SkeletonTable, SkeletonGrid, SkeletonHealth
    │       └── CameraStatusCard.jsx
    │
    └── pages/
        ├── LoginPage.jsx          ← หน้า login (username + password เท่านั้น — ไม่มี company_code)
        ├── DashboardPage.jsx      ← สรุปตัวเลข + กราฟ
        ├── EventLogPage.jsx       ← รายการ event ทั้งหมด + bulk actions
        ├── EventDetailPage.jsx    ← รายละเอียด event เดียว + รูป + ปิดเคส (route /events/:id)
        ├── CameraMonitorPage.jsx  ← สถานะกล้อง + CRUD + polygon editor
        ├── AlertMonitorPage.jsx   ← ประวัติการแจ้งเตือน
        └── SystemHealthPage.jsx   ← health check ระบบ
```
> **หมายเหตุ:** ระบบ auth ทั้งหมดอยู่ที่ `AuthContext.jsx`/`useAuth()` เท่านั้น (เดิมเคยมี `CompanyContext.jsx`/`useCompany()` ไว้ตอนระบบยังรองรับหลายบริษัทในเว็บเดียว — ตอนนี้ถูกลบออกแล้ว เพราะแต่ละ deployment ให้บริการบริษัทเดียว)
### 5.4 `api.js` — ฟังก์ชัน Fetch ทั้งหมด

โค้ดจาก [frontend/src/services/api.js](../../frontend/src/services/api.js):

```javascript
const BASE      = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
const TOKEN_KEY = 'smg-ww-token'

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function onUnauthorized() {
  // Token หมดอายุหรือไม่ถูกต้อง → เคลียร์ localStorage แล้วเด้งกลับ /login
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
  // เหมือน get() แต่ส่ง method: 'POST' + Content-Type + JSON body
  // และมี 401-redirect เหมือนกัน (ดูไฟล์จริงสำหรับโค้ดเต็ม)
}

// ดึงไฟล์รูป (bearer-protected) แล้วคืนเป็น object URL ให้ <img src> ใช้ได้
async function blobUrl(path) {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return URL.createObjectURL(await res.blob())
}

export const api = {
  changePassword:     (payload)     => post('/api/auth/change-password', payload),
  getDashboard:       (params = {}) => get('/api/dashboard', params),
  getEvents:          (params = {}) => get('/api/events',    params),
  getEventDetail:     (id)          => get(`/api/events/${id}`),
  getCameras:         (params = {}) => get('/api/cameras',   params),
  getAlerts:          (params = {}) => get('/api/alerts',    params),
  getHealth:          (params = {}) => get('/api/health',    params),
  closeEvent:         (id, payload) => post(`/api/events/${id}/close`, payload),
  bulkUpdateEvents:   (payload)     => post('/api/events/bulk-update', payload),
  getCameraPolygons:  (camera_no)   => get(`/api/cameras/${camera_no}/polygons`),
  saveCameraPolygons: (camera_no, payload) => post(`/api/cameras/${camera_no}/polygons`, payload),
  getCameraSnapshot:  (camera_no)   => get(`/api/cameras/${camera_no}/snapshot`),
  requestCameraSnapshotSync: (camera_no) => post(`/api/cameras/${camera_no}/snapshot/sync`),
  // รูปที่ต้องแนบ token (event detection image, camera snapshot โหมด local) ใส่ใน <img src> ตรง ๆ ไม่ได้
  // → ต้อง fetch พร้อม bearer token แล้วคืน blob object URL
  authBlobUrl:        (path)        => blobUrl(path),
  getCameraSnapshotBlobUrl: (camera_no) => blobUrl(`/api/cameras/${camera_no}/snapshot/raw`),
  createCamera:       (payload)     => post('/api/cameras', payload),
  updateCamera:       (camera_no, payload) => post(`/api/cameras/${camera_no}/update`, payload),
  deleteCamera:       (camera_no)   => post(`/api/cameras/${camera_no}/delete`),
  getRoles:           ()            => get('/api/roles'),
  getUsers:           (params = {}) => get('/api/users', params),
  createUser:         (payload)     => post('/api/users', payload),
  updateUser:         (id, payload) => post(`/api/users/${id}/update`, payload),
  resetUserPassword:  (id, payload = {}) => post(`/api/users/${id}/reset-password`, payload),
}
```
methods ทั้งหมดครอบคลุม 4 กลุ่ม: **dashboard/events/alerts/health** (อ่านอย่างเดียว), **cameras/polygons/snapshot** (CRUD เต็มรูปแบบ + ขอ snapshot ล่าสุด — ดูรายละเอียดกลไก camera CRUD + polygon editor ใน Module 06), **รูปภาพ** (`authBlobUrl`/`getCameraSnapshotBlobUrl` — fetch รูปพร้อม token แล้วคืน blob URL ให้ `<img>` ใช้), และ **user management** (`getRoles`/`getUsers`/`createUser`/`updateUser`/`resetUserPassword` — สำหรับหน้า `UserManagementPage.jsx`)

> **หมายเหตุ:** ระบบนี้เป็น **single-tenant** — หนึ่ง deployment ให้บริการบริษัทเดียว บริษัทของผู้ใช้ถูกกำหนดจาก JWT ฝั่ง server เท่านั้น `api.js` จึงไม่มีการส่ง header `x-company` และไม่มี method `getCompanies()`/API-key/billing อีกต่อไป (เดิมเคยมีตอนระบบยังรองรับหลายบริษัทในเว็บเดียว)
### 5.5 `App.jsx` — Routing

โค้ดจาก [frontend/src/App.jsx](../../frontend/src/App.jsx) (ของจริงทั้งไฟล์ — ไฟล์นี้สั้นมาก):

```jsx
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

function ProtectedRoutes() {
  const { token, user } = useAuth()
  const location = useLocation()
  // ถ้าไม่มี JWT token (ยังไม่ login หรือ token หมดอายุ) → redirect ไป /login
  if (!token) return <Navigate to="/login" replace />

  // บังคับให้เปลี่ยนรหัสผ่านก่อน ถ้า user ยังไม่เคยเปลี่ยน (must_change_password = true ใน JWT)
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
```
**Route table:**

| Path | Component | ต้อง login ไหม |
|------|-----------|----------------|
| `/login` | `LoginPage` | ไม่ต้อง |
| `/change-password` | `ChangePasswordPage` | ต้อง (บังคับถ้า `must_change_password = true`) |
| `/dashboard` | `DashboardPage` | ต้อง |
| `/events` | `EventLogPage` | ต้อง |
| `/events/:id` | `EventDetailPage` | ต้อง |
| `/cameras` | `CameraMonitorPage` | ต้อง |
| `/alerts` | `AlertMonitorPage` | ต้อง |
| `/health` | `SystemHealthPage` | ต้อง |
| `/users` | `UserManagementPage` | ต้อง (admin) |

**จุดสำคัญ:** guard ใช้ `const { token } = useAuth()` ตรง ๆ ไม่ใช่ `companyCode` — เพราะการมี/ไม่มี token คือตัวบอกว่า login แล้วหรือยัง ส่วนบริษัทของผู้ใช้เป็นเรื่องที่ server ตัดสินจาก JWT (อ่านต่อหัวข้อ 5.6) นอกจากนี้ guard ยังเช็ค `user?.must_change_password` เพื่อบังคับเปลี่ยนรหัสผ่านครั้งแรกก่อนเข้าหน้าอื่นได้ (ดู `ChangePasswordPage.jsx`)

---

### 5.6 Authentication & Authorization

หัวข้อนี้อธิบายกลไกทั้งหมดที่อยู่เบื้องหลัง "ระบบ login" ของเว็บ — ตั้งแต่รหัสผ่านถูกเก็บยังไง ไปจนถึง JWT ทำงานยังไง และทำไมรูปภาพถึงต้องโหลดผ่าน data-api พร้อมแนบ token

#### 5.6.1 Password Hashing ด้วย bcrypt (rounds = 10)

รหัสผ่านของผู้ใช้**ไม่เคยถูกเก็บเป็น plain text** ใน MSSQL — คอลัมน์ `smg.mst_user.password_hash` เก็บค่าที่ผ่านการ hash ด้วย [bcrypt](https://www.npmjs.com/package/bcryptjs) (package จริงที่ใช้คือ `bcryptjs` — bcrypt เวอร์ชัน pure-JS ใช้แทน `bcrypt` native เพื่อไม่ต้อง compile บน Windows)

**ทำไมต้อง bcrypt ไม่ใช่ SHA-256?**
- bcrypt ใส่ **salt** แบบสุ่มให้อัตโนมัติทุกครั้งที่ hash → รหัสผ่านเดียวกันจาก 2 คน จะได้ hash คนละค่า ป้องกัน rainbow table attack
- bcrypt ถูกออกแบบให้ **ช้าโดยตั้งใจ** (คุมด้วยค่า *rounds*) ทำให้ brute-force ยากขึ้นมาก ต่างจาก SHA-256 ที่เร็วมากและถูกออกแบบมาสำหรับ integrity check ไม่ใช่เก็บรหัสผ่าน
- ค่า **rounds = 10** ที่โปรเจกต์นี้ใช้ คือ cost factor มาตรฐานที่สมดุลระหว่างความปลอดภัยกับความเร็วที่ยอมรับได้

สร้าง hash สำหรับ user ใหม่ผ่านสคริปต์ `gen-hash` ใน `data-api/package.json`:

```json
"gen-hash": "node -e \"import('bcryptjs').then(m=>m.default.hash(process.argv[1]||'Walkway@2024',10).then(h=>console.log(h)))\" --"
```
```bash
cd data-api
npm run gen-hash MyNewPassword123
# ได้ hash string ยาว ๆ เช่น $2a$10$abcdef...
# เอาไปใส่คอลัมน์ password_hash ตอน insert user ใหม่ (ดู Module 07/08)
```
ตอน login ฝั่ง `data-api/server.js` จะเปรียบเทียบรหัสผ่านที่ผู้ใช้กรอกกับ hash ที่เก็บไว้ด้วย `bcrypt.compare()` — **ไม่มีการถอด hash กลับเป็น plain text ได้เลย**:

```javascript
const match = await bcrypt.compare(password, user.password_hash)
if (!match) {
  return res.status(401).json({ error: 'Invalid username or password' })
}
```
#### 5.6.2 JWT: ออก Token, ตรวจสอบ Token, และการหมดอายุ

เมื่อ username/password ถูกต้อง `POST /api/auth/login` จะ**เซ็น (sign)** JWT ที่มี payload ดังนี้ (จากโค้ดจริงใน `server.js`):

```javascript
const payload = {
  user_id:       user.user_id,
  username:      user.username,
  full_name:     user.full_name,
  company_code:  user.company_code,
  role_id:       user.role_id,
  role_name:     user.role_name,
  must_change_password: user.must_change_password === true || user.must_change_password === 1,
}
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })
res.json({ token, user: payload })
```
> `company_code` ใน payload คือบริษัทเดียวของ deployment นี้ — server จะใช้ค่านี้ทุก query โดยไม่เชื่อค่าใด ๆ ที่ client ส่งมา
ค่า `JWT_SECRET` และ `JWT_EXPIRES` (ค่า default `8h`) มาจาก `.env` ของ `data-api` เท่านั้น — **ห้ามฮาร์ดโค้ด** และห้ามใช้ secret ตัวอย่างในไฟล์ตอน deploy จริง

ทุก request (ยกเว้น `/api/auth/login`) ต้องผ่าน middleware `requireAuth`:

```javascript
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — token required' })
  }
  try {
    req.user = jwt.verify(authHeader.slice(7), JWT_SECRET)
    // Single-tenant: หนึ่ง deployment = หนึ่งบริษัท — company_code มาจาก JWT เท่านั้น
    // server ไม่เชื่อค่าบริษัทที่ client ส่งมา
    req.companyCode = req.user.company_code
    next()
  } catch {
    res.status(401).json({ error: 'Token invalid or expired — please log in again' })
  }
}
```
**เมื่อ token หมดอายุเกิดอะไรขึ้น** — มี 2 ชั้นตรวจสอบ:
1. **ฝั่ง client** — `AuthContext.jsx` มีฟังก์ชัน `isTokenExpired(token)` ที่ decode JWT payload ออกมาดู field `exp` แล้วเทียบกับเวลาปัจจุบัน ถ้าหมดอายุแล้ว จะไม่โหลด token นั้นมาใช้ตอนเปิดเว็บ (เคลียร์ localStorage ทิ้งทันที)
2. **ฝั่ง server** — ถ้า token หมดอายุจริง (หรือปลอมมา) `jwt.verify()` จะ throw → middleware ตอบ `401` → `api.js` (ทั้งใน `get()` และ `post()`) เช็ค `res.status === 401` แล้วเคลียร์ `localStorage` + `window.location.href = '/login'` ทันที (auto-logout pattern)

#### 5.6.3 การโหลดรูป detection ผ่าน data-api (พร้อมแนบ token)

รูป detection ถูกเซฟลง **Shared Drive/UNC path** (`\\SERVER\...`) หรือ local path ที่เครื่อง data-api เข้าถึงได้ — **แต่ browser อ่านไฟล์เหล่านี้ตรง ๆ ไม่ได้** (เปิดหน้าเว็บผ่าน http แล้ววาง `file://...` ใน `<img>` จะโดน browser บล็อก) ดังนั้น **data-api ต้องเป็นคนอ่านไฟล์แล้วส่งกลับมาเป็นรูป** ให้ frontend fetch เอาไป

**ค่า default ของทุก deployment (รวมตอนเรียนคอร์ส):** data-api อ่านไฟล์จาก `IMAGE_SHARED_DRIVE` แล้ว stream กลับมาผ่าน endpoint ที่ต้องแนบ token:

- รูป event: `GET /api/events/:id/image`
- snapshot กล้อง: `GET /api/cameras/:no/snapshot/raw`

ฝั่ง `GET /api/events/:id` (รายละเอียด event) จะคำนวณ field `image_url` ให้เป็น path แบบ relative `/api/events/:id/image` เมื่อไฟล์มีอยู่จริงใน drive:

```javascript
async function resolveEventImageUrl(row) {
  if (process.env.BKC_IMAGE_API_KEY) {
    return getBkcSignedUrl(row.image_path, row.image_name)   // BKC เท่านั้น (optional)
  }
  // default: path แบบ relative — frontend จะ fetch พร้อม bearer token เอง
  return localImageFile(row.image_path) ? `/api/events/${row.event_id}/image` : null
}
```

เนื่องจาก endpoint รูปถูก guard ด้วย token เหมือนทุก route ใส่ URL ตรง ๆ ใน `<img src>` ไม่ได้ (เพราะ browser จะไม่แนบ header `Authorization` ให้) frontend จึงใช้ hook **`useImageSrc`** (`frontend/src/hooks/useImageSrc.js`) จัดการให้:

```javascript
export function useImageSrc(src) {
  const [resolved, setResolved] = useState(
    () => (src && src.startsWith('http') ? src : null)
  )
  useEffect(() => {
    if (!src) { setResolved(null); return }
    if (src.startsWith('http')) { setResolved(src); return }   // absolute URL (BKC) → ใช้ตรง ๆ
    // relative /api/... → fetch พร้อม token แล้วคืน blob object URL
    let objectUrl = null, cancelled = false
    setResolved(null)
    api.authBlobUrl(src)
      .then(url => { if (cancelled) URL.revokeObjectURL(url); else { objectUrl = url; setResolved(url) } })
      .catch(() => { if (!cancelled) setResolved(false) })
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [src])
  return resolved
}
```

สรุปกฎการแปลงของ hook:

- `image_url` เป็น `null`/`''` → คืน `null` → component แสดง placeholder ("Detection Frame Unavailable")
- `image_url` เป็น **absolute URL** (เคส BKC signed URL) → ใช้เป็น `src` ตรง ๆ
- `image_url` เป็น **path `/api/...`** (ค่า default) → `api.authBlobUrl(src)` fetch พร้อม token แล้วคืน blob object URL

**ผลลัพธ์ที่ดีขึ้นสำหรับผู้เรียน:** เดิมตอนเรียนคอร์สจะเห็นแค่ placeholder เพราะ browser อ่าน UNC ไม่ได้ ตอนนี้ผู้เรียนแค่ตั้ง `IMAGE_SHARED_DRIVE` เป็น local path เช่น `C:\DetectionImages` — **รูป detection จริงจะแสดงบนเว็บได้เลย** (data-api อ่านไฟล์ให้) ไม่ต้องมี BKC API key ใด ๆ

> **BKC signed URL เป็นตัวเลือกเสริม (เฉพาะ BKC):** ถ้าตั้งค่า `BKC_IMAGE_API_KEY` ไว้ data-api จะไปขอ signed URL จาก `iapi.bkc.co.th` แทนการ stream ไฟล์เอง (`image_url` จะกลายเป็น absolute URL) — `x-api-key` นี้อยู่ใน `data-api/.env` เท่านั้น ไม่เคยส่งไปถึง browser ผู้เรียนทั่วไปไม่ต้องตั้งค่านี้

---

### 5.7 ตัวอย่าง Component — DashboardPage (โครงจริง)

หน้า Dashboard จริงมีขนาดใหญ่ (กราฟ SVG, bento grid, auto-refresh) — ด้านล่างคือโครงหลักที่ตัดกราฟย่อยออกเพื่อให้เห็น pattern ที่ถูกต้อง (import จริงทั้งหมด ไม่ใช่โค้ดสมมติ):

```jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import DashboardCard from '../components/ui/DashboardCard'
import StatusBadge from '../components/ui/StatusBadge'
import { SkeletonMetrics, SkeletonTable } from '../components/ui/LoadingState'
import { formatDateTime, formatConfidence } from '../utils/format'

export default function DashboardPage() {
  // useAsync = custom hook มาตรฐานของโปรเจกต์นี้ ห่อ loading/error/refetch ให้อัตโนมัติ
  const { data, loading, error, refetch } = useAsync(() => api.getDashboard(), [])
  const { data: recentData, loading: recentLoading, refetch: refetchEvents } = useAsync(
    () => api.getEvents({ page: 1, page_size: 8 }),
    []
  )

  // Auto-refresh ทุก 30 วินาที + ปุ่ม Refresh Now (manual) — ของจริงมีทั้งคู่
  React.useEffect(() => {
    const timer = setInterval(() => { refetch(); refetchEvents() }, 30000)
    return () => clearInterval(timer)
  }, [refetch, refetchEvents])

  if ((loading && !data) || (recentLoading && !recentData)) {
    return <SkeletonMetrics />   // + SkeletonTable ด้านล่าง (ดูไฟล์จริง)
  }
  if (error) return <div>Failed to fetch dashboard: {error}</div>

  const d = data || {}
  // ของจริงจากตรงนี้ไปมี: SVG line chart (trend 7 วัน), SVG donut chart
  // (alert success/fail), SVG bar chart (violation ต่อกล้อง), และตาราง
  // recent events พร้อม thumbnail รูป — ดูไฟล์เต็มใน DashboardPage.jsx
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard label="Events Today" value={d.events_today ?? 0} accent />
        <DashboardCard label="Events This Month" value={d.events_month ?? 0} />
        <DashboardCard
          label="Cameras Online"
          value={`${d.cameras_online ?? 0} / ${d.cameras_total ?? 0}`}
        />
        <DashboardCard
          label="Alerts Success"
          value={`${d.alerts_success ?? 0} / ${d.alerts_total ?? 0}`}
        />
      </div>
      {/* ... กราฟและตาราง recent events ... */}
    </div>
  )
}
```
**สิ่งสำคัญที่ต่างจากโค้ดสมมติทั่วไป:**
- ใช้ `useAsync()` ไม่ใช่ `useState` + `useEffect` เขียนมือ (pattern นี้ใช้ซ้ำทุกหน้าในโปรเจกต์)
- `LoadingState.jsx` **ไม่มี default export** — ต้อง `import { SkeletonMetrics, SkeletonTable } from '../components/ui/LoadingState'` เท่านั้น
- มี auto-refresh 30 วินาที + ปุ่ม refresh ด้วยมือ (manual refresh) พร้อมกัน
- มีกราฟ SVG วาดเอง 3 แบบ (line/donut/bar) ไม่ได้ใช้ chart library ภายนอก
- มีตาราง "Recent Walkway Detection Events" พร้อม thumbnail รูปและลิงก์ไป `EventDetailPage` (route `/events/:id`)

### 5.8 Build สำหรับ Deploy

```bash
cd frontend
npm run build

# ได้ folder dist/ ที่มีไฟล์ HTML/JS/CSS พร้อม deploy
# ส่ง folder dist/ ให้ทีม admin ไป deploy บน IIS HTTPS
```
---

## ส่วนที่ 6 — แบบฝึกหัด

1. **ติดตั้งและรัน:** `cd frontend && npm install && npm run dev` → เปิด <http://localhost:5173>
2. **Login:** ใส่ username/password จาก sample account เช่น `demo_admin` / `Walkway@2024` (ไม่มีช่อง company_code ให้กรอก — บริษัทถูกดึงจาก JWT อัตโนมัติ)
3. **ดู Dashboard:** ดูว่าเรียก API ได้ (ถ้า data-api รันอยู่จะมีข้อมูล ถ้าไม่ได้รันจะเห็น error)
4. **ดู Network:** เปิด Browser DevTools → Network tab → reload หน้า → ดู request ที่ไปหา `/api/dashboard` และตรวจสอบ request header `Authorization: Bearer ...`
5. **ดู badge บริษัท:** สังเกตที่ Sidebar ด้านซ้ายจะมี badge แสดง `company_code` ของ deployment นี้แบบ read-only (มาจาก JWT — ผู้ใช้เปลี่ยนเองไม่ได้)
6. **ตรวจ token ใน localStorage:** เปิด DevTools → Application → Local Storage → ดู key `smg-ww-token` (JWT) — มี key เดียวเท่านั้น
7. **แก้ไข component:** ลองเพิ่มข้อความหรือเปลี่ยนสีใน `DashboardPage.jsx` ดูว่า hot-reload ทำงาน

---

## ส่วนที่ 7 — Checklist หลังเรียน

- [ ] รัน `npm run dev` ได้ เปิดเว็บที่ port 5173 ได้
- [ ] Login ด้วย username/password ได้ (ไม่มี company_code ที่หน้า login)
- [ ] เห็น Dashboard page (แม้จะ error เพราะ data-api ไม่รัน ก็ยังเห็น UI)
- [ ] เข้าใจว่า `api.js` เป็นตัวกลางเรียกทุก endpoint
- [ ] เข้าใจ structure: Pages → Component → api.js → data-api → MSSQL
- [ ] เข้าใจว่า `AuthContext.jsx`/`useAuth()` คือกลไก auth จริง
- [ ] อธิบายได้ว่าทำไม bcrypt ปลอดภัยกว่า SHA-256 สำหรับเก็บรหัสผ่าน
- [ ] เข้าใจว่าระบบเป็น single-tenant — บริษัทถูกกำหนดจาก JWT ฝั่ง server (ไม่มี Super Admin/สลับบริษัท)
- [ ] อธิบายได้ว่าทำไมรูป detection ถึงต้องโหลดผ่าน data-api พร้อมแนบ token (ผ่าน hook `useImageSrc`)
- [ ] รัน `npm run build` ได้และเห็นโฟลเดอร์ `dist/`

---

## ส่วนที่ 8 — Common Error + วิธีแก้

### Error: `npm: command not found`

**สาเหตุ:** ยังไม่ได้ติดตั้ง Node.js

**วิธีแก้:** ดาวน์โหลด Node.js LTS จาก <https://nodejs.org> แล้วติดตั้ง

---

### Error: `Cannot find module 'react-router-dom'`

**สาเหตุ:** ยังไม่ได้รัน `npm install`

```bash
cd frontend
npm install
```
---

### หน้าเว็บเปิดได้แต่ข้อมูลไม่โหลด (ไม่มี error ใน UI)

**สาเหตุ:** data-api ไม่ได้รัน หรือ URL ผิด

**วิธีตรวจสอบ:**
```bash
# ตรวจสอบใน Browser DevTools → Console → Network
# ดูว่า request ไปที่ URL ไหน และ response เป็นอะไร

# ทดสอบ API ตรง ๆ (ต้องมี JWT token ก่อน ไม่งั้นได้ 401)
curl http://localhost:3001/api/health
```
---

### เว็บเด้งกลับหน้า Login เองทันที (auto-logout)

**สาเหตุ:** JWT token หมดอายุแล้ว (`JWT_EXPIRES` ค่า default คือ 8 ชั่วโมง) หรือ token ถูกลบ/แก้ไขใน localStorage

**วิธีแก้:** login ใหม่อีกครั้ง — ถ้าเกิดบ่อยผิดปกติทั้งที่เพิ่ง login ให้ตรวจสอบว่านาฬิกาเครื่อง client/server ตรงกันหรือไม่ (JWT เช็คเวลาหมดอายุแบบ absolute timestamp)

---

### Error: CORS Policy blocked

**สาเหตุ:** data-api ไม่ได้เปิด CORS headers

```javascript
// ใน data-api/server.js ต้องมี:
import cors from 'cors'
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }))
```
---

### Build สำเร็จแต่หน้าเว็บ production ขาว/ว่าง

**สาเหตุ:** ตั้งค่า `base` path ใน `vite.config.js` ไม่ตรงกับที่ deploy

```javascript
// vite.config.js
export default {
  base: '/',   // ถ้า deploy ที่ root
  // หรือ
  base: '/walkway/',   // ถ้า deploy ที่ /walkway/
}
```
---

## ส่วนที่ 9 — ควร commit อะไร

```text
✅ commit:
├── frontend/src/**          (โค้ดทั้งหมด)
├── frontend/package.json
├── frontend/vite.config.js
├── frontend/tailwind.config.js
├── frontend/index.html
└── frontend/.env.example    (template ไม่มีค่าจริง)
```
---

## ส่วนที่ 10 — ไม่ควร commit อะไร

```text
❌ ห้าม commit:
├── frontend/node_modules/    (ขนาดใหญ่ สร้างใหม่ได้จาก package.json)
├── frontend/dist/            (build output สร้างใหม่ได้)
└── frontend/.env.local       (ค่า API URL จริง)
```
> **ข้อมูลสำหรับ admin Deploy:**
> - รัน `npm run build` → ได้ `frontend/dist/`
> - นำ `dist/` ไป deploy บน IIS
> - ตั้ง IIS URL Rewrite ให้ request ทุกอย่าง → `index.html` (สำหรับ React Router)
> - ตั้งค่า HTTPS Certificate
> - ตั้ง `VITE_API_BASE_URL` ให้ชี้ไป data-api production (ก่อน build)
> - ตั้งค่า `JWT_SECRET` เป็นค่าสุ่มยาว ๆ ที่ไม่ซ้ำกับตัวอย่างใน `.env.example` ก่อน deploy จริงเสมอ

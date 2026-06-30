# Module 10 — React + Vite + Tailwind Frontend

> **ระดับ:** กลาง | **เวลาโดยประมาณ:** 120–150 นาที

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- รัน frontend development server ได้
- เข้าใจโครงสร้างโปรเจกต์ React+Vite+Tailwind
- เรียกข้อมูลจาก data-api ผ่าน `api.js`
- เข้าใจ component หลัก: AppShell, Sidebar, Pages
- ดู Dashboard, Event Log, Camera Monitor บนเว็บได้
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
│   ├── Sidebar (เมนู)
│   └── TopBar (header)
└── Pages
    ├── DashboardPage
    ├── EventLogPage
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
### Data Flow ใน Frontend

```text
ผู้ใช้เปิดเว็บ
    ↓
Login หน้าเว็บ (api/auth) → ได้รับ JWT Token (เก็บใน localStorage)
    ↓
React component mount
    ↓
api.js ส่ง Request พร้อม `Authorization: Bearer <token>`
    ↓
data-api (Node/Express) ตรวจสอบ Token → เรียก MSSQL SP → คืน JSON
    ↓
React แสดงผลข้อมูล
```
**สำคัญ:** Frontend ไม่ต่อ MSSQL ตรง ๆ — ผ่าน data-api เสมอ และทุก API Endpoint (ยกเว้น Login) ต้องใช้ JWT Token

---

## ส่วนที่ 4 — Flow การทำงาน

```text
npm install (ครั้งแรก)
        ↓
ตั้งค่า frontend/.env.local
        ↓
npm run dev → เปิดเว็บ http://localhost:5173
        ↓
Login ด้วย company_code
        ↓
ดู Dashboard / Event Log / Camera Monitor
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
#   VITE v5.x.x  ready in 300ms
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
    │   ├── ThemeContext.jsx    ← light/dark mode
    │   └── CompanyContext.jsx  ← company_code ที่ login
    │
    ├── services/
    │   └── api.js             ← ฟังก์ชัน fetch ทุกอย่าง
    │
    ├── hooks/
    │   └── useAsync.js        ← custom hook สำหรับ async data
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.jsx   ← layout หลัก
    │   │   ├── Sidebar.jsx    ← เมนูด้านซ้าย
    │   │   └── TopBar.jsx     ← header
    │   └── ui/
    │       ├── StatusBadge.jsx    ← badge แสดงสถานะ
    │       ├── DashboardCard.jsx  ← card สรุปตัวเลข
    │       ├── ImagePreview.jsx   ← แสดงรูป detection
    │       ├── FilterPanel.jsx    ← filter panel
    │       ├── LoadingState.jsx   ← loading spinner
    │       └── CameraStatusCard.jsx
    │
    └── pages/
        ├── LoginPage.jsx          ← หน้า login (ใส่ company_code)
        ├── DashboardPage.jsx      ← สรุปตัวเลข
        ├── EventLogPage.jsx       ← รายการ event ทั้งหมด
        ├── CameraMonitorPage.jsx  ← สถานะกล้อง
        ├── AlertMonitorPage.jsx   ← ประวัติการแจ้งเตือน
        └── SystemHealthPage.jsx   ← health check ระบบ
```
### 5.4 `api.js` — ฟังก์ชัน Fetch ทั้งหมด

โค้ดจาก [frontend/src/services/api.js](../../frontend/src/services/api.js):

```javascript
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

async function get(path, params = {}) {
  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, v)
  })
  
  // แนบ JWT Token ไปกับ Request
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), { headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  login:          (credentials)     => fetch(`${BASE}/api/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) }).then(res => res.json()),
  getDashboard:   (companyCode)     => get('/api/dashboard',    { company_code: companyCode }),
  getEvents:      (params)          => get('/api/events',       params),
  getEventDetail: (id, companyCode) => get(`/api/events/${id}`, { company_code: companyCode }),
  getCameras:     (companyCode)     => get('/api/cameras',      { company_code: companyCode }),
  getAlerts:      (params)          => get('/api/alerts',       params),
  getHealth:      (companyCode)     => get('/api/health',       { company_code: companyCode }),
}
```
### 5.5 `App.jsx` — Routing

โค้ดจาก [frontend/src/App.jsx](../../frontend/src/App.jsx):

```jsx
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { CompanyProvider, useCompany } from './context/CompanyContext'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EventLogPage from './pages/EventLogPage'
// ... import อื่น ๆ

function ProtectedRoutes() {
  const { companyCode } = useCompany()
  // ถ้าไม่มี company_code → redirect ไป /login
  if (!companyCode) return <Navigate to="/login" replace />

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/events" element={<EventLogPage />} />
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
```
### 5.6 ตัวอย่าง Component — DashboardPage (ย่อ)

```jsx
import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useCompany } from '../context/CompanyContext'
import DashboardCard from '../components/ui/DashboardCard'
import LoadingState from '../components/ui/LoadingState'

export default function DashboardPage() {
  const { companyCode } = useCompany()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.getDashboard(companyCode)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [companyCode])

  if (loading) return <LoadingState />
  if (error) return <div className="text-red-400 p-4">Error: {error}</div>
  if (!data) return <div className="text-gray-400 p-4">ไม่มีข้อมูล</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DashboardCard
          title="Event วันนี้"
          value={data.today_events ?? 0}
          color="red"
        />
        <DashboardCard
          title="กล้องออนไลน์"
          value={`${data.cameras_online ?? 0}/${data.cameras_total ?? 0}`}
          color="green"
        />
        <DashboardCard
          title="Alert ส่งสำเร็จ"
          value={data.alerts_sent ?? 0}
          color="blue"
        />
        <DashboardCard
          title="Event สัปดาห์นี้"
          value={data.week_events ?? 0}
          color="yellow"
        />
      </div>
    </div>
  )
}
```
### 5.7 Build สำหรับ Deploy

```bash
cd frontend
npm run build

# ได้ folder dist/ ที่มีไฟล์ HTML/JS/CSS พร้อม deploy
# ส่ง folder dist/ ให้ทีม admin ไป deploy บน IIS HTTPS
```
---

## ส่วนที่ 6 — แบบฝึกหัด

1. **ติดตั้งและรัน:** `cd frontend && npm install && npm run dev` → เปิด <http://localhost:5173>
2. **Login:** ใส่ `company_code = DEMO` และ enter
3. **ดู Dashboard:** ดูว่าเรียก API ได้ (ถ้า data-api รันอยู่จะมีข้อมูล ถ้าไม่ได้รันจะเห็น error)
4. **ดู Network:** เปิด Browser DevTools → Network tab → reload หน้า → ดู request ที่ไปหา `/api/dashboard`
5. **แก้ไข component:** ลองเพิ่มข้อความหรือเปลี่ยนสีใน `DashboardPage.jsx` ดูว่า hot-reload ทำงาน

---

## ส่วนที่ 7 — Checklist หลังเรียน

- [ ] รัน `npm run dev` ได้ เปิดเว็บที่ port 5173 ได้
- [ ] Login ด้วย company_code ได้
- [ ] เห็น Dashboard page (แม้จะ error เพราะ data-api ไม่รัน ก็ยังเห็น UI)
- [ ] เข้าใจว่า `api.js` เป็นตัวกลางเรียกทุก endpoint
- [ ] เข้าใจ structure: Pages → Component → api.js → data-api → MSSQL
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

# ทดสอบ API ตรง ๆ
curl http://localhost:3001/api/health?company_code=DEMO
```
---

### Error: CORS Policy blocked

**สาเหตุ:** data-api ไม่ได้เปิด CORS headers

```javascript
// ใน data-api/index.js ต้องมี:
const cors = require('cors')
app.use(cors({ origin: 'http://localhost:5173' }))
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

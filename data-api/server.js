import 'dotenv/config'
import crypto from 'crypto'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getPool, sql } from './db.js'

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production'
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h'

app.use(express.json())
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }))

// ─── Helper: execute Stored Procedure ────────────────
async function execSP(spName, params = []) {
  const pool = await getPool()
  const req = pool.request()
  for (const { name, type, value } of params) {
    req.input(name, type, value)
  }
  return req.execute(spName)
}

// ─── Helper: in-memory fixed-window rate limiter ──────
// ponytail: single-process Map is fine at this scale (one company key / one
// login IP per bucket); if data-api ever runs multi-instance, move counters
// to Redis or a DB table instead.
function rateLimiter({ windowMs, max, keyFn, message }) {
  const hits = new Map()
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key)
  }, windowMs).unref()

  return (req, res, next) => {
    const key = keyFn(req)
    const now = Date.now()
    let entry = hits.get(key)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(key, entry)
    }
    entry.count += 1
    if (entry.count > max) {
      return res.status(429).json({ error: message || 'Too many requests — please try again later' })
    }
    next()
  }
}

const loginRateLimiter = rateLimiter({
  windowMs: 60_000,
  max: 20,
  keyFn: (req) => req.ip,
  message: 'Too many login attempts from this address — please try again in a minute',
})

// ─── Helper: API key (external read-only integration) ─
// Random key is shown to the admin once; only its SHA-256 hash is stored.
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex')
}
function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// ─── Helper: password policy ──────────────────────────
// 8+ chars, uppercase, lowercase, number, special char — returns list of
// violation messages, or [] when the password satisfies every rule.
const SPECIAL_CHAR_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/
function validatePasswordPolicy(password) {
  const errors = []
  if (!password || password.length < 8) errors.push('At least 8 characters')
  if (!/[A-Z]/.test(password || '')) errors.push('At least one uppercase letter')
  if (!/[a-z]/.test(password || '')) errors.push('At least one lowercase letter')
  if (!/[0-9]/.test(password || '')) errors.push('At least one number')
  if (!SPECIAL_CHAR_RE.test(password || '')) errors.push('At least one special character')
  return errors
}

// ─── Helper: generate a temp password that satisfies the policy above ─
// Excludes visually ambiguous characters (0/O, 1/l/I) since admins retype
// or read these aloud when handing them to a new user.
const TEMP_PW_UPPER   = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const TEMP_PW_LOWER   = 'abcdefghijkmnopqrstuvwxyz'
const TEMP_PW_DIGIT   = '23456789'
const TEMP_PW_SPECIAL = '!@#$%^&*'
function randomChar(charset) {
  return charset[crypto.randomInt(charset.length)]
}
function generateTempPassword(length = 12) {
  const required = [randomChar(TEMP_PW_UPPER), randomChar(TEMP_PW_LOWER), randomChar(TEMP_PW_DIGIT), randomChar(TEMP_PW_SPECIAL)]
  const all = TEMP_PW_UPPER + TEMP_PW_LOWER + TEMP_PW_DIGIT + TEMP_PW_SPECIAL
  const chars = [...required, ...Array.from({ length: length - required.length }, () => randomChar(all))]
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

// ─── Helper: BKC image signed URL ────────────────────
// image_path รูปแบบ: \\10.145.250.26\000-CenterApp\053-SMG-Walkway\DEMO\CAM-01\20260616\detection__xxx.jpg
// imageFolder ที่ BKC API รับ: 000-CenterApp\053-SMG-Walkway\DEMO\CAM-01\20260616  (ตัด \\SERVER\ ออก + ตัด filename)
function extractImageFolder(imagePath) {
  if (!imagePath) return null
  const withoutServer = imagePath.replace(/^\\\\[^\\]+\\/, '')
  const lastSep = withoutServer.lastIndexOf('\\')
  return lastSep !== -1 ? withoutServer.substring(0, lastSep) : null
}

async function getBkcSignedUrl(imagePath, imageName) {
  const apiUrl = process.env.BKC_IMAGE_API_URL
  const apiKey = process.env.BKC_IMAGE_API_KEY
  if (!imagePath || !imageName || !apiUrl || !apiKey) return null
  const imageFolder = extractImageFolder(imagePath)
  if (!imageFolder) return null
  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ imageFolder, imageName }),
    })
    if (!resp.ok) return null
    const data = await resp.json()
    return data.signedUrl || null
  } catch {
    return null
  }
}

// ─── Auth middleware ──────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — token required' })
  }
  try {
    req.user = jwt.verify(authHeader.slice(7), JWT_SECRET)
    // Super admin: x-company header = กรอง; ไม่มี header = ทุกบริษัท (null)
    // Regular user: ใช้ company_code จาก JWT เสมอ
    req.companyCode = req.user.is_super_admin
      ? (req.headers['x-company'] || null)
      : req.user.company_code
    next()
  } catch {
    res.status(401).json({ error: 'Token invalid or expired — please log in again' })
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.is_super_admin && req.user?.role_name !== 'admin') {
    return res.status(403).json({ error: 'Forbidden — admin role required' })
  }
  next()
}

function requireSuperAdmin(req, res, next) {
  if (!req.user?.is_super_admin) {
    return res.status(403).json({ error: 'Forbidden — super admin required' })
  }
  next()
}

// ─── API key middleware (external read-only integration, /api/public/v1) ──
async function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key']
  if (!apiKey) {
    return res.status(401).json({ error: 'x-api-key header is required' })
  }
  try {
    const result = await execSP('smg.sp_verify_api_key', [
      { name: 'api_key_hash', type: sql.NVarChar(64), value: hashApiKey(apiKey) },
    ])
    const company = result.recordset[0]
    if (!company) {
      return res.status(401).json({ error: 'Invalid or inactive API key' })
    }
    req.companyCode = company.company_code
    next()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const apiKeyRateLimiter = rateLimiter({
  windowMs: 60_000,
  max: 60,
  keyFn: (req) => req.companyCode,
  message: 'Rate limit exceeded — max 60 requests per minute per API key',
})

// Logs every /api/public/v1 call after the response is sent (fire-and-forget).
function logApiUsage(req, res, next) {
  res.on('finish', () => {
    execSP('smg.sp_log_api_usage', [
      { name: 'company_code', type: sql.NVarChar(20), value: req.companyCode },
      { name: 'endpoint',     type: sql.NVarChar(200), value: req.baseUrl + req.path },
      { name: 'http_method',  type: sql.NVarChar(10),  value: req.method },
      { name: 'status_code',  type: sql.Int,            value: res.statusCode },
      { name: 'ip_address',   type: sql.NVarChar(50),  value: req.ip },
    ]).catch((err) => console.error('sp_log_api_usage failed:', err.message))
  })
  next()
}

// ─── POST /api/auth/login ─────────────────────────────
app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' })
    }

    const result = await execSP('smg.sp_login', [
      { name: 'username', type: sql.NVarChar(100), value: username },
    ])

    const user = result.recordset[0]
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Account temporarily locked due to repeated failed logins — please try again later' })
    }

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      await execSP('smg.sp_record_failed_login', [
        { name: 'username', type: sql.NVarChar(100), value: username },
      ])
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    await execSP('smg.sp_reset_login_lockout', [
      { name: 'user_id', type: sql.Int, value: user.user_id },
    ])

    const payload = {
      user_id:       user.user_id,
      username:      user.username,
      full_name:     user.full_name,
      company_code:  user.company_code,
      role_id:       user.role_id,
      role_name:     user.role_name,
      is_super_admin: user.is_super_admin === true || user.is_super_admin === 1,
      must_change_password: user.must_change_password === true || user.must_change_password === 1,
    }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })
    res.json({ token, user: payload })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/auth/change-password ───────────────────
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {}
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required' })
    }

    const pool = await getPool()
    const result = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query('SELECT password_hash FROM smg.mst_user WHERE user_id = @user_id')

    const row = result.recordset[0]
    if (!row) return res.status(404).json({ error: 'User not found' })

    const currentMatches = await bcrypt.compare(current_password, row.password_hash)
    if (!currentMatches) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    const policyErrors = validatePasswordPolicy(new_password)
    if (policyErrors.length > 0) {
      return res.status(400).json({ error: 'Password does not meet the security requirements', details: policyErrors })
    }

    const sameAsOld = await bcrypt.compare(new_password, row.password_hash)
    if (sameAsOld) {
      return res.status(400).json({ error: 'New password must be different from the current password' })
    }

    const newHash = await bcrypt.hash(new_password, 10)
    await execSP('smg.sp_change_password', [
      { name: 'user_id',           type: sql.Int,             value: req.user.user_id },
      { name: 'new_password_hash', type: sql.NVarChar(256),   value: newHash },
    ])

    // Re-sign the token so the client no longer sees must_change_password = true
    const payload = { ...req.user, must_change_password: false }
    delete payload.iat
    delete payload.exp
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })

    res.json({ success: true, token, user: payload })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/companies  (Super Admin only) ───────────
app.get('/api/companies', requireAuth, async (req, res) => {
  if (!req.user.is_super_admin) return res.status(403).json({ error: 'Forbidden' })
  try {
    const result = await execSP('smg.sp_get_company_list', [])
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/roles  (dropdown for user management) ───
app.get('/api/roles', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await execSP('smg.sp_get_role_list', [])
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/users  (Admin / Super Admin) ────────────
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await execSP('smg.sp_user_list', [
      { name: 'company_code', type: sql.NVarChar(20), value: req.companyCode },
    ])
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/users  (Create) ────────────────────────
app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, full_name, role_id, company_code: bodyCompanyCode, is_super_admin, temp_password } = req.body || {}
    if (!username || !role_id) {
      return res.status(400).json({ error: 'username and role_id are required' })
    }

    // Server-enforced scoping: regular admins can only create users in their own company
    const company_code = req.user.is_super_admin ? (bodyCompanyCode || req.companyCode) : req.user.company_code
    if (!company_code) {
      return res.status(400).json({ error: 'company_code is required' })
    }
    const grantSuperAdmin = req.user.is_super_admin && company_code === 'BKC' && !!is_super_admin

    const pool = await getPool()
    const existing = await pool.request()
      .input('username', sql.NVarChar(100), username)
      .query('SELECT 1 FROM smg.mst_user WHERE username = @username')
    if (existing.recordset.length > 0) {
      return res.status(400).json({ error: `Username "${username}" is already taken` })
    }

    const plainPassword = temp_password || generateTempPassword()
    const policyErrors = validatePasswordPolicy(plainPassword)
    if (policyErrors.length > 0) {
      return res.status(400).json({ error: 'temp_password does not meet the security requirements', details: policyErrors })
    }
    const passwordHash = await bcrypt.hash(plainPassword, 10)

    const request = pool.request()
    request.input('company_code', sql.NVarChar(20), company_code)
    request.input('username', sql.NVarChar(100), username)
    request.input('full_name', sql.NVarChar(200), full_name || null)
    request.input('password_hash', sql.NVarChar(256), passwordHash)
    request.input('role_id', sql.Int, parseInt(role_id))
    request.input('is_super_admin', sql.Bit, grantSuperAdmin ? 1 : 0)
    request.output('user_id', sql.Int)
    const result = await request.execute('smg.sp_user_create')

    // temp_password is returned once — it is never stored in plaintext anywhere
    res.status(201).json({
      success: true,
      user_id: result.output.user_id,
      username,
      temp_password: plainPassword,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/users/:id/update ────────────────────────
app.post('/api/users/:id/update', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id)
    const { full_name, role_id, is_active } = req.body || {}
    if (!role_id) return res.status(400).json({ error: 'role_id is required' })

    const pool = await getPool()
    const existing = await pool.request()
      .input('user_id', sql.Int, userId)
      .query('SELECT company_code FROM smg.mst_user WHERE user_id = @user_id')
    const target = existing.recordset[0]
    if (!target) return res.status(404).json({ error: 'User not found' })

    if (!req.user.is_super_admin && target.company_code !== req.user.company_code) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    await execSP('smg.sp_user_update', [
      { name: 'user_id',   type: sql.Int,           value: userId },
      { name: 'full_name', type: sql.NVarChar(200), value: full_name || null },
      { name: 'role_id',   type: sql.Int,           value: parseInt(role_id) },
      { name: 'is_active', type: sql.Bit,           value: is_active !== false ? 1 : 0 },
    ])

    res.json({ success: true, message: 'User updated successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/users/:id/reset-password ────────────────
app.post('/api/users/:id/reset-password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id)
    const { temp_password } = req.body || {}

    const pool = await getPool()
    const existing = await pool.request()
      .input('user_id', sql.Int, userId)
      .query('SELECT company_code, username FROM smg.mst_user WHERE user_id = @user_id')
    const target = existing.recordset[0]
    if (!target) return res.status(404).json({ error: 'User not found' })

    if (!req.user.is_super_admin && target.company_code !== req.user.company_code) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const plainPassword = temp_password || generateTempPassword()
    const policyErrors = validatePasswordPolicy(plainPassword)
    if (policyErrors.length > 0) {
      return res.status(400).json({ error: 'temp_password does not meet the security requirements', details: policyErrors })
    }
    const passwordHash = await bcrypt.hash(plainPassword, 10)

    await execSP('smg.sp_user_reset_password', [
      { name: 'user_id',           type: sql.Int,           value: userId },
      { name: 'new_password_hash', type: sql.NVarChar(256), value: passwordHash },
    ])

    res.json({ success: true, username: target.username, temp_password: plainPassword })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/dashboard ──────────────────────────────
app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const [summaryResult, cameraResult] = await Promise.all([
      execSP('smg.sp_get_dashboard_summary', [
        { name: 'company_code', type: sql.NVarChar(20), value: req.companyCode },
      ]),
      execSP('smg.sp_get_camera_status', [
        { name: 'company_code', type: sql.NVarChar(20), value: req.companyCode },
        { name: 'camera_no',   type: sql.NVarChar(20), value: null },
      ]),
    ])

    const s = summaryResult.recordsets[0]?.[0] || {}
    const by_camera = summaryResult.recordsets[1] || []
    const alerts = summaryResult.recordsets[2]?.[0] || {}
    const trend_data = summaryResult.recordsets[3] || []

    const cameras      = cameraResult.recordset || []
    const cameras_total   = cameras.length
    const cameras_online  = cameras.filter(c => c.is_active).length
    const cameras_offline = cameras_total - cameras_online

    res.json({
      total_events:    s.total_events    ?? 0,
      events_today:    s.today_count     ?? 0,
      events_month:    s.month_count     ?? 0,
      new_count:       s.new_count       ?? 0,
      reviewed_count:  s.reviewed_count  ?? 0,
      dismissed_count: s.dismissed_count ?? 0,
      alerts_failed:   alerts.failed_alerts ?? 0,
      alerts_total:    alerts.total_alerts  ?? 0,
      alerts_success:  alerts.success_alerts ?? 0,
      intrusion_count: s.intrusion_count ?? 0,
      dwell_count:     s.dwell_count     ?? 0,
      cameras_total,
      cameras_online,
      cameras_offline,
      by_camera,
      trend_data,
      db_status: 'ok',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/events ─────────────────────────────────
app.get('/api/events', requireAuth, async (req, res) => {
  try {
    const { camera_no, status, event_type, date_from, date_to, search, page, page_size } = req.query
    const result = await execSP('smg.sp_get_detection_events', [
      { name: 'company_code',  type: sql.NVarChar(20),  value: req.companyCode },
      { name: 'camera_no',     type: sql.NVarChar(20),  value: camera_no    || null },
      { name: 'event_status',  type: sql.NVarChar(20),  value: status       || null },
      { name: 'event_type',    type: sql.NVarChar(50),  value: event_type   || null },
      { name: 'date_from',     type: sql.Date,           value: date_from    || null },
      { name: 'date_to',       type: sql.Date,           value: date_to      || null },
      { name: 'page_no',       type: sql.Int,            value: parseInt(page      || '1') },
      { name: 'page_size',     type: sql.Int,            value: parseInt(page_size || '50') },
    ])
    res.json({
      data:  result.recordsets[0] || [],
      total: result.recordsets[1]?.[0]?.total ?? (result.recordsets[0]?.length ?? 0),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/events/:id ─────────────────────────────
app.get('/api/events/:id', requireAuth, async (req, res) => {
  try {
    const result = await execSP('smg.sp_get_detection_event_detail', [
      { name: 'event_id',     type: sql.BigInt,         value: parseInt(req.params.id) },
      { name: 'company_code', type: sql.NVarChar(20),   value: req.companyCode },
    ])
    if (!result.recordsets[0]?.length) return res.status(404).json({ error: 'Event not found' })
    const ev = result.recordsets[0][0]
    // เรียก BKC image API เพื่อได้ signedUrl — null ถ้าไม่มี image หรือไม่ได้ตั้งค่า BKC_IMAGE_API_KEY
    const image_url = await getBkcSignedUrl(ev.image_path, ev.image_name)
    res.json({
      ...ev,
      image_url,
      alert_history: result.recordsets[1] || [],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/cameras ────────────────────────────────
app.get('/api/cameras', requireAuth, async (req, res) => {
  try {
    const { camera_no } = req.query
    const result = await execSP('smg.sp_get_camera_status', [
      { name: 'company_code', type: sql.NVarChar(20), value: req.companyCode },
      { name: 'camera_no',   type: sql.NVarChar(20), value: camera_no || null },
    ])
    const mapped = (result.recordset || []).map(c => {
      const { password, rtsp_url, ...rest } = c
      // Mask password in RTSP URL if present (e.g., rtsp://admin:pass123@ip -> rtsp://admin:*****@ip)
      const maskedRtsp = rtsp_url ? rtsp_url.replace(/^(rtsp:\/\/)([^:]+):([^@]+)(@)/i, '$1$2:*****$4') : rtsp_url
      return {
        ...rest,
        rtsp_url: maskedRtsp,
        status: c.is_active ? 'online' : 'offline',
        location: c.location_name,
        has_password: !!password
      }
    })
    res.json(mapped)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Helper: Generate RTSP URL based on brand connections ──────────────────
function generateRtspUrl({ brand, ip_address, rtsp_port, username, password, channel, stream_type, custom_rtsp_url }) {
  if (brand?.toLowerCase() === 'generic' && custom_rtsp_url) {
    return custom_rtsp_url;
  }
  
  const port = rtsp_port || 554;
  const userPass = (username && password) ? `${username}:${password}@` : '';
  const chan = channel || 1;
  const isSub = stream_type === 'sub';

  switch (brand?.toLowerCase()) {
    case 'hikvision':
      const streamIdx = isSub ? '02' : '01';
      return `rtsp://${userPass}${ip_address}:${port}/Streaming/Channels/${chan}${streamIdx}`;
    case 'dahua':
      const subtype = isSub ? '1' : '0';
      return `rtsp://${userPass}${ip_address}:${port}/cam/realmonitor?channel=${chan}&subtype=${subtype}`;
    case 'panasonic':
      const streamNum = isSub ? '2' : '1';
      return `rtsp://${userPass}${ip_address}:${port}/MediaInput/h264/stream_${streamNum}`;
    default:
      return `rtsp://${userPass}${ip_address}:${port}/live`;
  }
}

// ─── POST /api/cameras (Create) ───────────────────────
app.post('/api/cameras', requireAuth, async (req, res) => {
  try {
    const { 
      camera_no, 
      camera_name, 
      location_name, 
      ip_address, 
      rtsp_port, 
      username, 
      password, 
      channel, 
      brand, 
      stream_type,
      custom_rtsp_url,
      is_active,
      schedule_json
    } = req.body || {}

    if (!camera_no || !camera_name || !location_name) {
      return res.status(400).json({ error: 'camera_no, camera_name, and location_name are required' })
    }

    const company_code = req.companyCode || 'DEMO'

    // Generate RTSP URL
    const generated_rtsp = generateRtspUrl({
      brand, ip_address, rtsp_port, username, password, channel, stream_type, custom_rtsp_url
    })

    const pool = await getPool()

    // Check if camera already exists
    const checkExist = await pool.request()
      .input('camera_no', sql.NVarChar(20), camera_no)
      .input('company_code', sql.NVarChar(20), company_code)
      .query('SELECT 1 FROM smg.mst_camera WHERE camera_no = @camera_no AND company_code = @company_code')

    if (checkExist.recordset.length > 0) {
      return res.status(400).json({ error: `Camera number ${camera_no} already exists for this company` })
    }

    await pool.request()
      .input('company_code', sql.NVarChar(20), company_code)
      .input('camera_no', sql.NVarChar(20), camera_no)
      .input('camera_name', sql.NVarChar(100), camera_name)
      .input('location_name', sql.NVarChar(200), location_name)
      .input('rtsp_url', sql.NVarChar(500), generated_rtsp)
      .input('ip_address', sql.NVarChar(50), ip_address || null)
      .input('rtsp_port', sql.Int, rtsp_port || 554)
      .input('username', sql.NVarChar(100), username || null)
      .input('password', sql.NVarChar(100), password || null)
      .input('channel', sql.Int, channel || 1)
      .input('brand', sql.NVarChar(50), brand || null)
      .input('stream_type', sql.NVarChar(20), stream_type || 'sub')
      .input('is_active', sql.Bit, is_active !== false ? 1 : 0)
      .input('schedule_json', sql.NVarChar(sql.MAX), schedule_json || null)
      .query(`
        INSERT INTO smg.mst_camera 
          (company_code, camera_no, camera_name, location_name, rtsp_url, is_active, 
           ip_address, rtsp_port, username, password, channel, brand, stream_type, schedule_json)
        VALUES 
          (@company_code, @camera_no, @camera_name, @location_name, @rtsp_url, @is_active, 
           @ip_address, @rtsp_port, @username, @password, @channel, @brand, @stream_type, @schedule_json)
      `)

    res.status(201).json({ success: true, message: 'Camera created successfully', rtsp_url: generated_rtsp })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/cameras/:camera_no/update (Update) ──────
app.post('/api/cameras/:camera_no/update', requireAuth, async (req, res) => {
  try {
    const { camera_no } = req.params
    const { 
      camera_name, 
      location_name, 
      ip_address, 
      rtsp_port, 
      username, 
      password, 
      channel, 
      brand, 
      stream_type,
      custom_rtsp_url,
      is_active,
      schedule_json
    } = req.body || {}

    if (!camera_name || !location_name) {
      return res.status(400).json({ error: 'camera_name and location_name are required' })
    }

    const company_code = req.companyCode || 'DEMO'
    const pool = await getPool()

    // 1. Fetch existing camera settings to retrieve password/rtsp_url if omitted
    const existingResult = await pool.request()
      .input('camera_no', sql.NVarChar(20), camera_no)
      .input('company_code', sql.NVarChar(20), company_code)
      .query('SELECT username, password, rtsp_url FROM smg.mst_camera WHERE camera_no = @camera_no AND company_code = @company_code')

    if (existingResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Camera not found' })
    }
    const existingCam = existingResult.recordset[0]

    // 2. Decide on password: if blank/empty, preserve the existing one
    const finalPassword = (password !== undefined && password !== null && password !== '')
      ? password
      : existingCam.password

    // 3. Generate RTSP URL (for standard brands)
    let final_rtsp = generateRtspUrl({
      brand, ip_address, rtsp_port, username, password: finalPassword, channel, stream_type, custom_rtsp_url
    })

    // 4. Handle generic brands: if the user submitted a masked URL, restore the original URL
    if (brand?.toLowerCase() === 'generic' && custom_rtsp_url) {
      if (custom_rtsp_url.includes(':*****@')) {
        final_rtsp = existingCam.rtsp_url
      } else {
        final_rtsp = custom_rtsp_url
      }
    }

    await pool.request()
      .input('company_code', sql.NVarChar(20), company_code)
      .input('camera_no', sql.NVarChar(20), camera_no)
      .input('camera_name', sql.NVarChar(100), camera_name)
      .input('location_name', sql.NVarChar(200), location_name)
      .input('rtsp_url', sql.NVarChar(500), final_rtsp)
      .input('ip_address', sql.NVarChar(50), ip_address || null)
      .input('rtsp_port', sql.Int, rtsp_port || 554)
      .input('username', sql.NVarChar(100), username || null)
      .input('password', sql.NVarChar(100), finalPassword || null)
      .input('channel', sql.Int, channel || 1)
      .input('brand', sql.NVarChar(50), brand || null)
      .input('stream_type', sql.NVarChar(20), stream_type || 'sub')
      .input('is_active', sql.Bit, is_active !== false ? 1 : 0)
      .input('schedule_json', sql.NVarChar(sql.MAX), schedule_json || null)
      .query(`
        UPDATE smg.mst_camera 
        SET camera_name = @camera_name,
            location_name = @location_name,
            rtsp_url = @rtsp_url,
            ip_address = @ip_address,
            rtsp_port = @rtsp_port,
            username = @username,
            password = @password,
            channel = @channel,
            brand = @brand,
            stream_type = @stream_type,
            is_active = @is_active,
            schedule_json = @schedule_json
        WHERE camera_no = @camera_no AND company_code = @company_code
      `)

    res.json({ success: true, message: 'Camera updated successfully', rtsp_url: final_rtsp })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/cameras/:camera_no/delete (Delete) ──────
app.post('/api/cameras/:camera_no/delete', requireAuth, async (req, res) => {
  try {
    const { camera_no } = req.params
    const company_code = req.companyCode || 'DEMO'

    const pool = await getPool()

    // 1. Delete associated polygon areas from mst_detection_area
    await pool.request()
      .input('camera_no', sql.NVarChar(20), camera_no)
      .input('company_code', sql.NVarChar(20), company_code)
      .query('DELETE FROM smg.mst_detection_area WHERE camera_no = @camera_no AND company_code = @company_code')

    // 2. Delete camera from mst_camera
    await pool.request()
      .input('camera_no', sql.NVarChar(20), camera_no)
      .input('company_code', sql.NVarChar(20), company_code)
      .query('DELETE FROM smg.mst_camera WHERE camera_no = @camera_no AND company_code = @company_code')

    res.json({ success: true, message: 'Camera and its associated polygon areas deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/alerts ─────────────────────────────────
app.get('/api/alerts', requireAuth, async (req, res) => {
  try {
    const { status, channel, date_from, date_to, page, page_size } = req.query
    const result = await execSP('smg.sp_get_alert_log', [
      { name: 'company_code',  type: sql.NVarChar(20), value: req.companyCode },
      { name: 'alert_channel', type: sql.NVarChar(20), value: channel   || null },
      { name: 'alert_status',  type: sql.NVarChar(20), value: status    || null },
      { name: 'date_from',     type: sql.Date,          value: date_from || null },
      { name: 'date_to',       type: sql.Date,          value: date_to   || null },
      { name: 'page_no',       type: sql.Int,           value: parseInt(page      || '1') },
      { name: 'page_size',     type: sql.Int,           value: parseInt(page_size || '50') },
    ])
    res.json({
      data:  result.recordsets[0] || [],
      total: result.recordsets[1]?.[0]?.total ?? (result.recordsets[0]?.length ?? 0),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/health ─────────────────────────────────
app.get('/api/health', requireAuth, async (req, res) => {
  const items = []
  const now = new Date().toISOString()

  // DB connectivity
  try {
    const pool = await getPool()
    const t0 = Date.now()
    await pool.request().query('SELECT 1 AS ping')
    items.push({
      component: 'database',
      status: 'ok',
      server: process.env.DB_SERVER,
      latency_ms: Date.now() - t0,
      checked_at: now,
    })
  } catch (err) {
    items.push({ component: 'database', status: 'error', error: err.message, checked_at: now })
  }

  // Camera status
  try {
    const camResult = await execSP('smg.sp_get_camera_status', [
      { name: 'company_code', type: sql.NVarChar(20), value: req.companyCode },
      { name: 'camera_no',   type: sql.NVarChar(20), value: null },
    ])
    const cameras     = camResult.recordset || []
    const online_count = cameras.filter(c => c.is_active).length
    const total_count  = cameras.length
    items.push({
      component: 'cameras',
      status: total_count === 0 ? 'unknown' : online_count === total_count ? 'ok' : online_count === 0 ? 'error' : 'warn',
      online_count,
      total_count,
      checked_at: now,
    })
  } catch {
    items.push({ component: 'cameras', status: 'unknown', checked_at: now })
  }

  // Alert delivery last 24 h (parameterized query)
  try {
    const pool = await getPool()
    const alertResult = await pool.request()
      .input('company_code', sql.NVarChar(20), req.companyCode)
      .query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN alert_status = 'SENT'   THEN 1 ELSE 0 END) AS sent,
          SUM(CASE WHEN alert_status = 'FAILED' THEN 1 ELSE 0 END) AS failed
        FROM smg.trn_alert_log
        WHERE company_code = @company_code
          AND sent_at >= DATEADD(hour, -24, SYSUTCDATETIME())
      `)
    const a = alertResult.recordset[0] || {}
    items.push({
      component: 'alerts',
      status: (a.failed || 0) > 0 ? 'warn' : 'ok',
      summary: `${a.sent ?? 0} sent, ${a.failed ?? 0} failed (last 24 h)`,
      checked_at: now,
    })
  } catch {
    items.push({ component: 'alerts', status: 'unknown', checked_at: now })
  }

  // Python service & storage — web UI cannot know; reported by Python side
  items.push({ component: 'python_service', status: 'unknown', checked_at: now })
  items.push({ component: 'storage',        status: 'unknown', checked_at: now })

  res.json(items)
})

// ─── POST /api/events/:id/close ──────────────────────
app.post('/api/events/:id/close', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { resolved_by, resolution_desc, resolution_image, status } = req.body || {}

    const pool = await getPool()
    
    // Update the event record in SQL Server with either CLOSED or DISMISSED status
    await pool.request()
      .input('event_id', sql.BigInt, parseInt(id))
      .input('company_code', sql.NVarChar(20), req.companyCode)
      .input('status', sql.NVarChar(20), status || 'CLOSED')
      .input('resolved_by', sql.NVarChar(100), resolved_by || 'system')
      .input('resolution_desc', sql.NVarChar(1000), resolution_desc || '')
      .input('resolution_image', sql.NVarChar(sql.MAX), resolution_image || null)
      .query(`
        UPDATE smg.trn_detection_event
        SET event_status = @status,
            resolved_by = @resolved_by,
            resolved_at = SYSUTCDATETIME(),
            resolution_desc = @resolution_desc,
            resolution_image = @resolution_image
        WHERE event_id = @event_id AND (@company_code IS NULL OR company_code = @company_code)
      `)

    res.json({ success: true, message: 'Case status updated successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/events/bulk-update ───────────────────
app.post('/api/events/bulk-update', requireAuth, async (req, res) => {
  try {
    const { ids, status, resolved_by, resolution_desc } = req.body || {}
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' })
    }

    const sanitizedIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id))
    if (sanitizedIds.length === 0) {
      return res.status(400).json({ error: 'No valid event IDs provided' })
    }

    const idsString = sanitizedIds.join(',')
    const pool = await getPool()
    
    await pool.request()
      .input('status', sql.NVarChar(20), status || 'REVIEWED')
      .input('resolved_by', sql.NVarChar(100), resolved_by || 'system')
      .input('resolution_desc', sql.NVarChar(1000), resolution_desc || '')
      .input('company_code', sql.NVarChar(20), req.companyCode)
      .query(`
        UPDATE smg.trn_detection_event
        SET event_status = @status,
            resolved_by = CASE WHEN @status = 'CLOSED' THEN @resolved_by ELSE resolved_by END,
            resolved_at = CASE WHEN @status = 'CLOSED' THEN SYSUTCDATETIME() ELSE resolved_at END,
            resolution_desc = CASE WHEN @status = 'CLOSED' THEN @resolution_desc ELSE resolution_desc END
        WHERE event_id IN (${idsString})
          AND (@company_code IS NULL OR company_code = @company_code)
      `)

    res.json({ success: true, message: `Successfully updated ${sanitizedIds.length} events` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/cameras/:camera_no/polygons ───────────
app.get('/api/cameras/:camera_no/polygons', requireAuth, async (req, res) => {
  try {
    const { camera_no } = req.params
    const pool = await getPool()
    const result = await pool.request()
      .input('camera_no', sql.NVarChar(20), camera_no)
      .input('company_code', sql.NVarChar(20), req.companyCode)
      .query(`
        SELECT area_id, area_name, polygon_json, is_active
        FROM smg.mst_detection_area
        WHERE camera_no = @camera_no AND (@company_code IS NULL OR company_code = @company_code)
      `)
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/cameras/:camera_no/polygons ──────────
app.post('/api/cameras/:camera_no/polygons', requireAuth, async (req, res) => {
  try {
    const { camera_no } = req.params
    const { area_name, polygon_json } = req.body || {}

    const pool = await getPool()
    
    await pool.request()
      .input('camera_no', sql.NVarChar(20), camera_no)
      .input('company_code', sql.NVarChar(20), req.companyCode || 'DEMO')
      .input('area_name', sql.NVarChar(100), area_name || 'Restricted Area')
      .input('polygon_json', sql.NVarChar(sql.MAX), polygon_json)
      .query(`
        IF EXISTS (
          SELECT 1 FROM smg.mst_detection_area 
          WHERE camera_no = @camera_no AND company_code = @company_code
        )
        BEGIN
          UPDATE smg.mst_detection_area
          SET polygon_json = @polygon_json,
              area_name = @area_name,
              is_active = 1
          WHERE camera_no = @camera_no AND company_code = @company_code
        END
        ELSE
        BEGIN
          INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json, is_active)
          VALUES (@company_code, @camera_no, @area_name, @polygon_json, 1)
        END
      `)

    res.json({ success: true, message: 'Polygon saved successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/company/api-key  (Admin — own company's key status, no secret) ──
app.get('/api/company/api-key', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await execSP('smg.sp_get_company_api_key_info', [
      { name: 'company_code', type: sql.NVarChar(20), value: req.companyCode },
    ])
    res.json(result.recordset[0] || null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/company/api-key/regenerate  (Admin) ────
// Returns the plain key exactly once — only its hash is ever stored.
app.post('/api/company/api-key/regenerate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const apiKey = generateApiKey()
    await execSP('smg.sp_regenerate_company_api_key', [
      { name: 'company_code', type: sql.NVarChar(20), value: req.companyCode },
      { name: 'api_key_hash', type: sql.NVarChar(64), value: hashApiKey(apiKey) },
    ])
    res.json({ api_key: apiKey })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/company/usage  (Admin — own company's call log summary) ──
app.get('/api/company/usage', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { date_from, date_to } = req.query
    const result = await execSP('smg.sp_get_api_usage_summary', [
      { name: 'company_code', type: sql.NVarChar(20), value: req.companyCode },
      { name: 'date_from',    type: sql.Date,          value: date_from || null },
      { name: 'date_to',      type: sql.Date,          value: date_to || null },
    ])
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/admin/billing-overview  (Super Admin only) ──
app.get('/api/admin/billing-overview', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const result = await execSP('smg.sp_get_billing_overview', [])
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── /api/public/v1/*  — external, read-only, API-key auth ────────────
// Separate from the JWT-protected routes above: its own auth (x-api-key),
// its own rate limit, and a contract that can evolve independently of the
// internal frontend API.
const publicApi = express.Router()
publicApi.use(requireApiKey, apiKeyRateLimiter, logApiUsage)

publicApi.get('/events', async (req, res) => {
  try {
    const { camera_no, date_from, date_to, event_status, event_type, page_no, page_size } = req.query
    const result = await execSP('smg.sp_get_detection_events', [
      { name: 'company_code', type: sql.NVarChar(20),  value: req.companyCode },
      { name: 'camera_no',    type: sql.NVarChar(20),  value: camera_no || null },
      { name: 'date_from',    type: sql.Date,           value: date_from || null },
      { name: 'date_to',      type: sql.Date,           value: date_to || null },
      { name: 'event_status', type: sql.NVarChar(20),  value: event_status || null },
      { name: 'event_type',   type: sql.NVarChar(50),  value: event_type || null },
      { name: 'page_no',      type: sql.Int,            value: parseInt(page_no) || 1 },
      { name: 'page_size',    type: sql.Int,            value: parseInt(page_size) || 50 },
    ])
    res.json({ events: result.recordsets[0], total: result.recordsets[1][0].total })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

publicApi.get('/cameras', async (req, res) => {
  try {
    const result = await execSP('smg.sp_get_camera_list_public', [
      { name: 'company_code', type: sql.NVarChar(20), value: req.companyCode },
    ])
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

publicApi.get('/dashboard-summary', async (req, res) => {
  try {
    const { date_from, date_to } = req.query
    const result = await execSP('smg.sp_get_dashboard_summary', [
      { name: 'company_code', type: sql.NVarChar(20), value: req.companyCode },
      { name: 'date_from',    type: sql.Date,          value: date_from || null },
      { name: 'date_to',      type: sql.Date,          value: date_to || null },
    ])
    res.json({
      summary: result.recordsets[0][0],
      by_camera: result.recordsets[1],
      alerts: result.recordsets[2][0],
      trend_7day: result.recordsets[3],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

publicApi.get('/alerts', async (req, res) => {
  try {
    const { alert_channel, alert_status, date_from, date_to, page_no, page_size } = req.query
    const result = await execSP('smg.sp_get_alert_log', [
      { name: 'company_code',  type: sql.NVarChar(20), value: req.companyCode },
      { name: 'alert_channel', type: sql.NVarChar(20), value: alert_channel || null },
      { name: 'alert_status',  type: sql.NVarChar(20), value: alert_status || null },
      { name: 'date_from',     type: sql.Date,          value: date_from || null },
      { name: 'date_to',       type: sql.Date,          value: date_to || null },
      { name: 'page_no',       type: sql.Int,           value: parseInt(page_no) || 1 },
      { name: 'page_size',     type: sql.Int,           value: parseInt(page_size) || 50 },
    ])
    res.json({ alerts: result.recordsets[0], total: result.recordsets[1][0].total })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.use('/api/public/v1', publicApi)

// ─── Database Migrations (Run on startup) ─────────────
async function runMigrations() {
  try {
    const pool = await getPool()
    console.log('Running database schema migrations for Case Closing and Cameras...')
    
    // Check which columns exist in mst_camera
    const checkCamCols = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'smg' 
        AND TABLE_NAME = 'mst_camera' 
        AND COLUMN_NAME IN ('ip_address', 'rtsp_port', 'username', 'password', 'channel', 'brand', 'stream_type', 'schedule_json')
    `)
    const existingCam = checkCamCols.recordset.map(r => r.COLUMN_NAME)
    
    if (!existingCam.includes('ip_address')) {
      await pool.request().query(`ALTER TABLE smg.mst_camera ADD ip_address NVARCHAR(50) NULL`)
      console.log('Migration: Added column ip_address to mst_camera')
    }
    if (!existingCam.includes('rtsp_port')) {
      await pool.request().query(`ALTER TABLE smg.mst_camera ADD rtsp_port INT NOT NULL DEFAULT 554`)
      console.log('Migration: Added column rtsp_port to mst_camera')
    }
    if (!existingCam.includes('username')) {
      await pool.request().query(`ALTER TABLE smg.mst_camera ADD username NVARCHAR(100) NULL`)
      console.log('Migration: Added column username to mst_camera')
    }
    if (!existingCam.includes('password')) {
      await pool.request().query(`ALTER TABLE smg.mst_camera ADD password NVARCHAR(100) NULL`)
      console.log('Migration: Added column password to mst_camera')
    }
    if (!existingCam.includes('channel')) {
      await pool.request().query(`ALTER TABLE smg.mst_camera ADD channel INT NOT NULL DEFAULT 1`)
      console.log('Migration: Added column channel to mst_camera')
    }
    if (!existingCam.includes('brand')) {
      await pool.request().query(`ALTER TABLE smg.mst_camera ADD brand NVARCHAR(50) NULL`)
      console.log('Migration: Added column brand to mst_camera')
    }
    if (!existingCam.includes('stream_type')) {
      await pool.request().query(`ALTER TABLE smg.mst_camera ADD stream_type NVARCHAR(20) NOT NULL DEFAULT 'sub'`)
      console.log('Migration: Added column stream_type to mst_camera')
    }
    if (!existingCam.includes('schedule_json')) {
      await pool.request().query(`ALTER TABLE smg.mst_camera ADD schedule_json NVARCHAR(MAX) NULL`)
      console.log('Migration: Added column schedule_json to mst_camera')
    }

    // Compile modified sp_get_camera_status to return all columns
    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_get_camera_status
          @company_code   NVARCHAR(20)    = NULL,
          @camera_no      NVARCHAR(20)    = NULL
      AS
      BEGIN
          SET NOCOUNT ON;

          SELECT
              c.company_code,
              c.camera_no,
              c.camera_name,
              c.location_name,
              c.is_active,
              c.rtsp_url,
              c.ip_address,
              c.rtsp_port,
              c.username,
              c.password,
              c.channel,
              c.brand,
              c.stream_type,
              c.schedule_json,
              last_ev.last_event_at,
              last_ev.last_event_status,
              last_ev.last_event_id
          FROM smg.mst_camera c
          OUTER APPLY (
              SELECT TOP 1
                  event_id   AS last_event_id,
                  event_status AS last_event_status,
                  detected_at  AS last_event_at
              FROM smg.trn_detection_event
              WHERE company_code = c.company_code AND camera_no = c.camera_no
              ORDER BY detected_at DESC
          ) last_ev
          WHERE
              (@company_code IS NULL OR c.company_code = @company_code)
              AND (@camera_no IS NULL OR c.camera_no = @camera_no)
          ORDER BY c.camera_no;
      END;
    `)
    console.log('Migration: Stored procedure sp_get_camera_status updated successfully')
    
    // Check which columns exist in trn_detection_event
    const checkCols = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'smg' 
        AND TABLE_NAME = 'trn_detection_event' 
        AND COLUMN_NAME IN ('resolved_by', 'resolved_at', 'resolution_desc', 'resolution_image')
    `)
    const existing = checkCols.recordset.map(r => r.COLUMN_NAME)
    
    if (!existing.includes('resolved_by')) {
      await pool.request().query(`ALTER TABLE smg.trn_detection_event ADD resolved_by NVARCHAR(100) NULL`)
      console.log('Migration: Added column resolved_by')
    }
    if (!existing.includes('resolved_at')) {
      await pool.request().query(`ALTER TABLE smg.trn_detection_event ADD resolved_at DATETIME2 NULL`)
      console.log('Migration: Added column resolved_at')
    }
    if (!existing.includes('resolution_desc')) {
      await pool.request().query(`ALTER TABLE smg.trn_detection_event ADD resolution_desc NVARCHAR(1000) NULL`)
      console.log('Migration: Added column resolution_desc')
    }
    if (!existing.includes('resolution_image')) {
      await pool.request().query(`ALTER TABLE smg.trn_detection_event ADD resolution_image NVARCHAR(MAX) NULL`)
      console.log('Migration: Added column resolution_image')
    }

    // Compile modified sp_get_detection_event_detail to select resolution info
    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_get_detection_event_detail
          @event_id       BIGINT,
          @company_code   NVARCHAR(20)    = NULL
      AS
      BEGIN
          SET NOCOUNT ON;

          -- event หลัก
          SELECT
              e.event_id, e.company_code, e.camera_no, e.camera_name, e.location_name,
              e.detected_class, e.confidence, e.event_type, e.event_status,
              e.detected_at, e.image_path, e.image_name,
              e.alert_teams_status, e.alert_email_status,
              e.created_at, e.created_by,
              e.resolved_by, e.resolved_at, e.resolution_desc, e.resolution_image
          FROM smg.trn_detection_event e
          WHERE e.event_id = @event_id AND (@company_code IS NULL OR e.company_code = @company_code);

          -- ประวัติ alert
          SELECT
              log_id, alert_channel, alert_status,
              response_code, response_msg, sent_at
          FROM smg.trn_alert_log
          WHERE event_id = @event_id
          ORDER BY sent_at;
      END;
    `)
    console.log('Migration: Stored procedure sp_get_detection_event_detail updated successfully')

    // Compile modified sp_get_detection_events to return total count
    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_get_detection_events
          @company_code   NVARCHAR(20)    = NULL,
          @camera_no      NVARCHAR(20)    = NULL,
          @date_from      DATE            = NULL,
          @date_to        DATE            = NULL,
          @event_status   NVARCHAR(20)    = NULL,
          @event_type     NVARCHAR(50)    = NULL,
          @page_no        INT             = 1,
          @page_size      INT             = 50
      AS
      BEGIN
          SET NOCOUNT ON;

          SELECT
              event_id, company_code, camera_no, camera_name, location_name,
              detected_class, confidence, event_type, event_status,
              detected_at, image_name,
              alert_teams_status, alert_email_status,
              created_at, created_by
          FROM smg.trn_detection_event
          WHERE
              (@company_code IS NULL OR company_code = @company_code)
              AND (@camera_no    IS NULL OR camera_no    = @camera_no)
              AND (@event_status IS NULL OR event_status = @event_status)
              AND (@event_type   IS NULL OR event_type   = @event_type)
              AND (@date_from    IS NULL OR CAST(detected_at AS DATE) >= @date_from)
              AND (@date_to      IS NULL OR CAST(detected_at AS DATE) <= @date_to)
          ORDER BY detected_at DESC
          OFFSET  (CASE WHEN @page_size = 0 THEN 0 ELSE (@page_no - 1) * @page_size END) ROWS
          FETCH NEXT (CASE WHEN @page_size = 0 THEN 2147483647 ELSE @page_size END) ROWS ONLY;

          SELECT COUNT(*) AS total
          FROM smg.trn_detection_event
          WHERE
              (@company_code IS NULL OR company_code = @company_code)
              AND (@camera_no    IS NULL OR camera_no    = @camera_no)
              AND (@event_status IS NULL OR event_status = @event_status)
              AND (@event_type   IS NULL OR event_type   = @event_type)
              AND (@date_from    IS NULL OR CAST(detected_at AS DATE) >= @date_from)
              AND (@date_to      IS NULL OR CAST(detected_at AS DATE) <= @date_to);
      END;
    `)
    console.log('Migration: Stored procedure sp_get_detection_events updated successfully')

    // Check which columns exist in mst_user
    const checkUserCols = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'smg'
        AND TABLE_NAME = 'mst_user'
        AND COLUMN_NAME IN ('must_change_password')
    `)
    const existingUser = checkUserCols.recordset.map(r => r.COLUMN_NAME)

    if (!existingUser.includes('must_change_password')) {
      await pool.request().query(`ALTER TABLE smg.mst_user ADD must_change_password BIT NOT NULL DEFAULT 0`)
      console.log('Migration: Added column must_change_password to mst_user')
    }

    // Compile password-change and user-management stored procedures
    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_login
          @username NVARCHAR(100)
      AS
      BEGIN
          SET NOCOUNT ON;
          SELECT
              u.user_id, u.company_code, u.username, u.full_name, u.password_hash,
              u.role_id, r.role_name, u.is_super_admin, u.is_active, u.must_change_password
          FROM smg.mst_user u
          JOIN smg.mst_role r ON u.role_id = r.role_id
          WHERE u.username = @username;
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_change_password
          @user_id            INT,
          @new_password_hash  NVARCHAR(256)
      AS
      BEGIN
          SET NOCOUNT ON;
          UPDATE smg.mst_user
          SET password_hash = @new_password_hash, must_change_password = 0
          WHERE user_id = @user_id;
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_get_role_list
      AS
      BEGIN
          SET NOCOUNT ON;
          SELECT role_id, role_name FROM smg.mst_role ORDER BY role_id;
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_user_list
          @company_code   NVARCHAR(20)    = NULL
      AS
      BEGIN
          SET NOCOUNT ON;
          SELECT
              u.user_id, u.company_code, u.username, u.full_name,
              u.role_id, r.role_name, u.is_super_admin, u.is_active,
              u.must_change_password, u.created_at
          FROM smg.mst_user u
          JOIN smg.mst_role r ON u.role_id = r.role_id
          WHERE (@company_code IS NULL OR u.company_code = @company_code)
          ORDER BY u.company_code, u.username;
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_user_create
          @company_code   NVARCHAR(20),
          @username       NVARCHAR(100),
          @full_name      NVARCHAR(200)   = NULL,
          @password_hash  NVARCHAR(256),
          @role_id        INT,
          @is_super_admin BIT             = 0,
          @user_id        INT             OUTPUT
      AS
      BEGIN
          SET NOCOUNT ON;
          INSERT INTO smg.mst_user
              (company_code, username, full_name, password_hash, role_id, is_super_admin, must_change_password)
          VALUES
              (@company_code, @username, @full_name, @password_hash, @role_id, @is_super_admin, 1);
          SET @user_id = SCOPE_IDENTITY();
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_user_update
          @user_id    INT,
          @full_name  NVARCHAR(200)   = NULL,
          @role_id    INT,
          @is_active  BIT
      AS
      BEGIN
          SET NOCOUNT ON;
          UPDATE smg.mst_user
          SET full_name = @full_name, role_id = @role_id, is_active = @is_active
          WHERE user_id = @user_id;
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_user_reset_password
          @user_id            INT,
          @new_password_hash  NVARCHAR(256)
      AS
      BEGIN
          SET NOCOUNT ON;
          UPDATE smg.mst_user
          SET password_hash = @new_password_hash, must_change_password = 1
          WHERE user_id = @user_id;
      END;
    `)
    console.log('Migration: User management stored procedures updated successfully')

    // ── API key (external read-only integration) + login lockout + usage log ──
    const checkCompanyCols = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'smg'
        AND TABLE_NAME = 'mst_company'
        AND COLUMN_NAME IN ('api_key_hash', 'api_key_created_at', 'api_key_is_active')
    `)
    const existingCompany = checkCompanyCols.recordset.map(r => r.COLUMN_NAME)
    if (!existingCompany.includes('api_key_hash')) {
      await pool.request().query(`ALTER TABLE smg.mst_company ADD api_key_hash NVARCHAR(64) NULL`)
      console.log('Migration: Added column api_key_hash to mst_company')
    }
    if (!existingCompany.includes('api_key_created_at')) {
      await pool.request().query(`ALTER TABLE smg.mst_company ADD api_key_created_at DATETIME2 NULL`)
      console.log('Migration: Added column api_key_created_at to mst_company')
    }
    if (!existingCompany.includes('api_key_is_active')) {
      await pool.request().query(`ALTER TABLE smg.mst_company ADD api_key_is_active BIT NOT NULL DEFAULT 0`)
      console.log('Migration: Added column api_key_is_active to mst_company')
    }
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_company_api_key_hash')
        CREATE UNIQUE NONCLUSTERED INDEX IX_company_api_key_hash
            ON smg.mst_company (api_key_hash)
            WHERE api_key_hash IS NOT NULL;
    `)

    const checkLockoutCols = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'smg'
        AND TABLE_NAME = 'mst_user'
        AND COLUMN_NAME IN ('failed_login_count', 'locked_until')
    `)
    const existingLockout = checkLockoutCols.recordset.map(r => r.COLUMN_NAME)
    if (!existingLockout.includes('failed_login_count')) {
      await pool.request().query(`ALTER TABLE smg.mst_user ADD failed_login_count INT NOT NULL DEFAULT 0`)
      console.log('Migration: Added column failed_login_count to mst_user')
    }
    if (!existingLockout.includes('locked_until')) {
      await pool.request().query(`ALTER TABLE smg.mst_user ADD locked_until DATETIME2 NULL`)
      console.log('Migration: Added column locked_until to mst_user')
    }

    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id
                     WHERE s.name = 'smg' AND t.name = 'trn_api_usage_log')
      CREATE TABLE smg.trn_api_usage_log (
          log_id          BIGINT          NOT NULL IDENTITY(1,1),
          company_code    NVARCHAR(20)    NOT NULL,
          endpoint        NVARCHAR(200)   NOT NULL,
          http_method     NVARCHAR(10)    NOT NULL,
          status_code     INT             NOT NULL,
          ip_address      NVARCHAR(50)    NULL,
          called_at       DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
          CONSTRAINT PK_trn_api_usage_log PRIMARY KEY (log_id),
          CONSTRAINT FK_api_usage_company FOREIGN KEY (company_code) REFERENCES smg.mst_company(company_code)
      );
    `)
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_api_usage_company_called')
        CREATE NONCLUSTERED INDEX IX_api_usage_company_called
            ON smg.trn_api_usage_log (company_code, called_at DESC)
            INCLUDE (endpoint, status_code);
    `)
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_api_usage_called_at')
        CREATE NONCLUSTERED INDEX IX_api_usage_called_at
            ON smg.trn_api_usage_log (called_at);
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_login
          @username NVARCHAR(100)
      AS
      BEGIN
          SET NOCOUNT ON;
          SELECT
              u.user_id, u.company_code, u.username, u.full_name, u.password_hash,
              u.role_id, r.role_name, u.is_super_admin, u.is_active, u.must_change_password,
              u.failed_login_count, u.locked_until
          FROM smg.mst_user u
          JOIN smg.mst_role r ON u.role_id = r.role_id
          WHERE u.username = @username;
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_record_failed_login
          @username NVARCHAR(100)
      AS
      BEGIN
          SET NOCOUNT ON;
          DECLARE @max_attempts INT = 5;
          DECLARE @lockout_minutes INT = 15;
          UPDATE smg.mst_user
          SET failed_login_count = failed_login_count + 1,
              locked_until = CASE
                  WHEN failed_login_count + 1 >= @max_attempts
                      THEN DATEADD(MINUTE, @lockout_minutes, SYSUTCDATETIME())
                  ELSE locked_until
              END
          WHERE username = @username;
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_reset_login_lockout
          @user_id INT
      AS
      BEGIN
          SET NOCOUNT ON;
          UPDATE smg.mst_user
          SET failed_login_count = 0, locked_until = NULL
          WHERE user_id = @user_id;
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_regenerate_company_api_key
          @company_code   NVARCHAR(20),
          @api_key_hash   NVARCHAR(64)
      AS
      BEGIN
          SET NOCOUNT ON;
          UPDATE smg.mst_company
          SET api_key_hash = @api_key_hash,
              api_key_created_at = SYSUTCDATETIME(),
              api_key_is_active = 1
          WHERE company_code = @company_code;
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_get_company_api_key_info
          @company_code NVARCHAR(20)
      AS
      BEGIN
          SET NOCOUNT ON;
          SELECT company_code, api_key_created_at, api_key_is_active
          FROM smg.mst_company
          WHERE company_code = @company_code;
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_verify_api_key
          @api_key_hash NVARCHAR(64)
      AS
      BEGIN
          SET NOCOUNT ON;
          SELECT company_code, company_name
          FROM smg.mst_company
          WHERE api_key_hash = @api_key_hash
              AND api_key_is_active = 1
              AND is_active = 1;
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_log_api_usage
          @company_code   NVARCHAR(20),
          @endpoint       NVARCHAR(200),
          @http_method    NVARCHAR(10),
          @status_code    INT,
          @ip_address     NVARCHAR(50) = NULL
      AS
      BEGIN
          SET NOCOUNT ON;
          INSERT INTO smg.trn_api_usage_log (company_code, endpoint, http_method, status_code, ip_address)
          VALUES (@company_code, @endpoint, @http_method, @status_code, @ip_address);
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_get_api_usage_summary
          @company_code   NVARCHAR(20) = NULL,
          @date_from      DATE         = NULL,
          @date_to        DATE         = NULL
      AS
      BEGIN
          SET NOCOUNT ON;
          SELECT
              company_code, endpoint,
              COUNT(*) AS call_count,
              MAX(called_at) AS last_called_at
          FROM smg.trn_api_usage_log
          WHERE
              (@company_code IS NULL OR company_code = @company_code)
              AND (@date_from IS NULL OR CAST(called_at AS DATE) >= @date_from)
              AND (@date_to   IS NULL OR CAST(called_at AS DATE) <= @date_to)
          GROUP BY company_code, endpoint
          ORDER BY company_code, call_count DESC;
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_get_billing_overview
      AS
      BEGIN
          SET NOCOUNT ON;
          SELECT
              c.company_code, c.company_name, c.is_active,
              c.api_key_is_active, c.api_key_created_at,
              (SELECT COUNT(*) FROM smg.mst_camera cam
                  WHERE cam.company_code = c.company_code AND cam.is_active = 1) AS active_camera_count
          FROM smg.mst_company c
          ORDER BY c.company_code;
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_get_camera_list_public
          @company_code NVARCHAR(20)
      AS
      BEGIN
          SET NOCOUNT ON;
          SELECT company_code, camera_no, camera_name, location_name, is_active
          FROM smg.mst_camera
          WHERE company_code = @company_code
          ORDER BY camera_no;
      END;
    `)

    await pool.request().query(`
      CREATE OR ALTER PROCEDURE smg.sp_purge_api_usage_log
          @retention_days INT = 180
      AS
      BEGIN
          SET NOCOUNT ON;
          DELETE FROM smg.trn_api_usage_log
          WHERE called_at < DATEADD(DAY, -@retention_days, SYSUTCDATETIME());
      END;
    `)
    console.log('Migration: API key, login lockout, and usage log objects updated successfully')
  } catch (err) {
    console.error('Migration failed:', err.message)
  }
}

// ─── Start ────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`data-api running on http://localhost:${PORT}`)
  await runMigrations()
})

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { getPool, sql } from './db.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }))

// ─── Helper ──────────────────────────────────────────
async function execSP(spName, params = []) {
  const pool = await getPool()
  const req = pool.request()
  for (const { name, type, value } of params) {
    req.input(name, type, value)
  }
  return req.execute(spName)
}

// ─── GET /api/health ─────────────────────────────────
// Calls ww.sp_get_health — returns Python service status, DB, storage, cameras
app.get('/api/health', async (req, res) => {
  try {
    const { company_code } = req.query
    const result = await execSP('ww.sp_get_health', [
      { name: 'company_code', type: sql.NVarChar(50), value: company_code || null },
    ])
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/dashboard ──────────────────────────────
// Calls ww.sp_get_dashboard — event counts, alert stats, camera counts
app.get('/api/dashboard', async (req, res) => {
  try {
    const { company_code } = req.query
    const result = await execSP('ww.sp_get_dashboard', [
      { name: 'company_code', type: sql.NVarChar(50), value: company_code || null },
    ])
    res.json(result.recordset[0] || {})
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/events ─────────────────────────────────
// Calls ww.sp_get_events — event log with filters
app.get('/api/events', async (req, res) => {
  try {
    const { company_code, camera_no, status, date_from, date_to, search, page, page_size } = req.query
    const result = await execSP('ww.sp_get_events', [
      { name: 'company_code', type: sql.NVarChar(50),  value: company_code || null },
      { name: 'camera_no',    type: sql.NVarChar(50),  value: camera_no    || null },
      { name: 'status',       type: sql.NVarChar(50),  value: status       || null },
      { name: 'date_from',    type: sql.DateTime,       value: date_from ? new Date(date_from) : null },
      { name: 'date_to',      type: sql.DateTime,       value: date_to   ? new Date(date_to)   : null },
      { name: 'search',       type: sql.NVarChar(200), value: search       || null },
      { name: 'page',         type: sql.Int,            value: parseInt(page      || '1') },
      { name: 'page_size',    type: sql.Int,            value: parseInt(page_size || '50') },
    ])
    res.json({
      data:  result.recordset,
      total: result.recordsets[1]?.[0]?.total ?? result.recordset.length,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/events/:id ─────────────────────────────
// Calls ww.sp_get_event_detail — single event with image path
app.get('/api/events/:id', async (req, res) => {
  try {
    const { company_code } = req.query
    const result = await execSP('ww.sp_get_event_detail', [
      { name: 'event_id',     type: sql.Int,           value: parseInt(req.params.id) },
      { name: 'company_code', type: sql.NVarChar(50),  value: company_code || null },
    ])
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' })
    res.json(result.recordset[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/cameras ────────────────────────────────
// Calls ww.sp_get_cameras — list with online/offline status
app.get('/api/cameras', async (req, res) => {
  try {
    const { company_code } = req.query
    const result = await execSP('ww.sp_get_cameras', [
      { name: 'company_code', type: sql.NVarChar(50), value: company_code || null },
    ])
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/alerts ─────────────────────────────────
// Calls ww.sp_get_alerts — Teams/Email delivery status
app.get('/api/alerts', async (req, res) => {
  try {
    const { company_code, status, date_from, date_to, page, page_size } = req.query
    const result = await execSP('ww.sp_get_alerts', [
      { name: 'company_code', type: sql.NVarChar(50), value: company_code || null },
      { name: 'status',       type: sql.NVarChar(50), value: status       || null },
      { name: 'date_from',    type: sql.DateTime,      value: date_from ? new Date(date_from) : null },
      { name: 'date_to',      type: sql.DateTime,      value: date_to   ? new Date(date_to)   : null },
      { name: 'page',         type: sql.Int,           value: parseInt(page      || '1') },
      { name: 'page_size',    type: sql.Int,           value: parseInt(page_size || '50') },
    ])
    res.json({
      data:  result.recordset,
      total: result.recordsets[1]?.[0]?.total ?? result.recordset.length,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Start ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`data-api running on http://localhost:${PORT}`)
})

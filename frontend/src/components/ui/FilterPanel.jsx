import React from 'react'
import { Search, Filter } from 'lucide-react'

const inputStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--ink)',
  borderRadius: '6px',
  height: '34px',
  padding: '0 10px',
  fontSize: '13px',
  outline: 'none',
  transition: 'border-color 120ms',
}

// Generic filter panel — pass filters config + values + onChange
// filters: [{ key, label, type: 'text'|'date'|'select', options: [{value, label}] }]
export default function FilterPanel({ filters = [], values = {}, onChange, onSearch, searchValue = '', onSearchChange }) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 p-3 rounded-lg border mb-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <Filter size={14} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} aria-hidden />

      {/* Search */}
      {onSearchChange !== undefined && (
        <div className="relative">
          <Search
            size={13}
            style={{
              position: 'absolute', left: 9, top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-subtle)', pointerEvents: 'none',
            }}
          />
          <input
            type="search"
            placeholder="Search…"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 28, width: 180 }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
      )}

      {/* Dynamic filters */}
      {filters.map(f => {
        if (f.type === 'select') {
          return (
            <select
              key={f.key}
              value={values[f.key] ?? ''}
              onChange={e => onChange(f.key, e.target.value)}
              aria-label={f.label}
              style={{ ...inputStyle, paddingRight: 28, appearance: 'none', cursor: 'pointer' }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            >
              <option value="">{f.label}: All</option>
              {f.options?.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )
        }
        if (f.type === 'date') {
          return (
            <input
              key={f.key}
              type="date"
              value={values[f.key] ?? ''}
              onChange={e => onChange(f.key, e.target.value)}
              aria-label={f.label}
              style={{ ...inputStyle, width: 148 }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          )
        }
        return null
      })}
    </div>
  )
}

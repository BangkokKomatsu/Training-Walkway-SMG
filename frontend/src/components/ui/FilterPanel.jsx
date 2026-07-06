import React from 'react'
import { Search, Filter } from 'lucide-react'
import clsx from 'clsx'

export default function FilterPanel({ filters = [], values = {}, onChange, onSearch, searchValue = '', onSearchChange }) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border bg-surface/50 dark:bg-surface/30 backdrop-blur-md mb-6 shadow-sm"
    >
      <div className="flex items-center gap-1.5 text-sm font-bold text-ink-muted mr-1">
        <Filter size={14} className="text-ink-subtle" aria-hidden />
        <span>FILTERS</span>
      </div>

      {/* Search Field */}
      {onSearchChange !== undefined && (
        <div className="relative flex-1 sm:flex-initial">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
          />
          <input
            type="search"
            placeholder="Search events/cameras..."
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full sm:w-56 pl-9 pr-3 py-1.5 text-sm rounded-lg border border-border bg-surface-2 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-xs"
          />
        </div>
      )}

      {/* Dynamic Filters Grid */}
      <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial">
        {filters.map(f => {
          if (f.type === 'select') {
            return (
              <div key={f.key} className="relative">
                <select
                  value={values[f.key] ?? ''}
                  onChange={e => onChange(f.key, e.target.value)}
                  aria-label={f.label}
                  className="pl-3 pr-8 py-1.5 text-sm rounded-lg border border-border bg-surface-2 text-ink cursor-pointer outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-xs appearance-none min-w-[120px]"
                >
                  <option value="">{f.label}: All</option>
                  {f.options?.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-subtle text-[12px]">
                  ▼
                </div>
              </div>
            )
          }
          if (f.type === 'date') {
            return (
              <div key={f.key} className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold text-ink-subtle uppercase">{f.label}:</span>
                <input
                  type="date"
                  value={values[f.key] ?? ''}
                  onChange={e => onChange(f.key, e.target.value)}
                  aria-label={f.label}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border bg-surface-2 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-xs"
                />
              </div>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}

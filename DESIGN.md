# Design System — Walkway Safety Monitor

## Color Strategy

**Committed.** Safety-amber (seed hue 110°) carries 30–50% of the colored surface — it is the operational signal color of the domain (warning, active event, indicator). A cool signal-blue serves as the interactive accent. Neutral backgrounds (pure black / pure white) let both speak.

### Dual-Mode Tokens (OKLCH)

```css
/* ── DARK MODE (default: control-room shift) ── */
:root, [data-theme="dark"] {
  --bg:         oklch(0.09 0.000 0);          /* near-black, no tint */
  --surface:    oklch(0.14 0.004 105);        /* dark card — trace of brand hue */
  --surface-2:  oklch(0.19 0.005 105);        /* elevated panel / hover */
  --border:     oklch(0.25 0.004 105);        /* subtle divider */

  --ink:        oklch(0.93 0.003 105);        /* near-white body text */
  --ink-muted:  oklch(0.58 0.003 105);        /* secondary text  ≥3.5:1 on --surface */
  --ink-subtle: oklch(0.38 0.002 105);        /* placeholder / disabled */

  --primary:    oklch(0.72 0.13 108);         /* safety-amber — buttons, highlights */
  --primary-fg: oklch(0.10 0.000 0);          /* text on --primary fill */

  --accent:     oklch(0.62 0.14 212);         /* signal blue — links, focus rings */
  --accent-fg:  oklch(0.98 0.000 0);

  /* Status — always icon+text, never color alone */
  --status-ok:   oklch(0.65 0.18 142);        /* operational green */
  --status-warn: oklch(0.72 0.18  62);        /* caution amber */
  --status-err:  oklch(0.58 0.22  25);        /* alert red */
  --status-off:  oklch(0.38 0.005 105);       /* offline / inactive */
}

/* ── LIGHT MODE (office / supervisor review) ── */
[data-theme="light"] {
  --bg:         oklch(1.000 0.000  0);        /* pure white */
  --surface:    oklch(0.975 0.003 105);       /* barely-tinted card */
  --surface-2:  oklch(0.950 0.005 105);       /* hover / active surface */
  --border:     oklch(0.88  0.004 105);       /* light divider */

  --ink:        oklch(0.17  0.008 105);       /* near-black ≥ 7:1 on white */
  --ink-muted:  oklch(0.44  0.006 105);       /* secondary ≥ 4.5:1 on white */
  --ink-subtle: oklch(0.62  0.004 105);       /* placeholder ≥ 3:1 on white */

  --primary:    oklch(0.52  0.12  108);       /* deeper amber for light */
  --primary-fg: oklch(0.98  0.000   0);

  --accent:     oklch(0.48  0.14  212);       /* darker blue on white */
  --accent-fg:  oklch(0.98  0.000   0);

  --status-ok:   oklch(0.45 0.18 142);
  --status-warn: oklch(0.52 0.18  62);
  --status-err:  oklch(0.48 0.22  25);
  --status-off:  oklch(0.62 0.006 105);
}
```

### Status Badges

Every status pairs color + icon + short label. Never color alone.

| State    | Token         | Icon   | Label example       |
|----------|---------------|--------|---------------------|
| Online   | status-ok     | ●      | Online / Success    |
| Warning  | status-warn   | ▲      | Delayed / Retrying  |
| Error    | status-err    | ✕      | Failed / Offline    |
| Inactive | status-off    | ○      | Inactive / Unknown  |

---

## Typography

**IBM Plex Sans** (body, UI) + **IBM Plex Mono** (timestamps, codes, technical values).
IBM Plex is designed for precision, legibility at small sizes, and technical environments — a natural fit for industrial monitoring.

```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');

:root {
  --font-sans:  'IBM Plex Sans',  system-ui, sans-serif;
  --font-mono:  'IBM Plex Mono',  ui-monospace, monospace;
}
```

### Scale

```
--text-xs:   0.75rem  / 1.4  — badge labels, timestamps inline
--text-sm:   0.875rem / 1.5  — table cells, helper text
--text-base: 1rem     / 1.6  — body, paragraphs
--text-lg:   1.125rem / 1.5  — subheadings, card titles
--text-xl:   1.375rem / 1.35 — section headings  (letter-spacing: -0.02em)
--text-2xl:  1.75rem  / 1.25 — page titles        (letter-spacing: -0.025em)
--text-3xl:  2.25rem  / 1.2  — dashboard metrics  (letter-spacing: -0.03em)
```

**Ceiling**: display headings ≤ 2.5rem. This is an ops tool, not a landing page.
**Tracking floor**: -0.04em on all display sizes. Never tighter.
**Mono**: timestamps, camera IDs, event IDs, confidence %, file paths — always `font-mono`.
**Line length**: prose columns capped at 70ch.

---

## Spacing & Layout

4px base grid. Named scale:

```
--space-1:   4px
--space-2:   8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

### App Shell

```
┌─────────────────────────────────────────────────┐
│  Sidebar (240px fixed) │  Main content area      │
│  nav + company picker  │  page header + content  │
└─────────────────────────────────────────────────┘
```

- Sidebar: fixed, `--surface` bg, collapses to icon-only at ≤ 1024px
- Main: `--bg`, scrollable, `padding: var(--space-8)`
- Top bar: sticky, `--surface`, shows page title + breadcrumb + company tag

### Cards

`border-radius: 8px` (10px maximum). No `border-radius > 12px` on cards.
Border: `1px solid var(--border)`. **No `box-shadow` paired with border** — pick one.
Dark mode: border only. Light mode: border + very subtle shadow `0 1px 3px oklch(0 0 0 / 0.06)`.

---

## Components

### DashboardCard (metric)
A stat card: large number, label, optional trend arrow. No gradient, no hero-metric template.
Structure: `label (text-sm, ink-muted)` → `value (text-3xl, font-mono, ink)` → `sub (text-sm, ink-muted)`.
Max width: 220px. Use `grid auto-fit minmax(200px, 1fr)` for the grid.

### EventTable
Dense table: fixed-width mono timestamp, status badge, camera ID, area, confidence, action.
Alternating row bg at 50% opacity `surface-2`. No thick borders between rows — `border-bottom: 1px solid var(--border)` only.

### StatusBadge
`display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px;`
Background: 15% opacity of the status color. Foreground: the status color at full. Icon 10px + label text-xs uppercase.

### FilterPanel
Horizontal strip below page header. Inputs: date range, company selector, camera selector, status multi-select, search. Compact height (`height: 36px` inputs). Collapses behind a "Filters" pill on mobile.

### ImagePreview
Aspect-ratio locked 16:9 container. `object-fit: cover`. Fallback: dark charcoal bg + centered camera icon + "Image unavailable" in `ink-subtle`. No broken-image icons.

---

## Motion

Reduced motion: `@media (prefers-reduced-motion: reduce)` collapses all durations to `0.01ms`.

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);   /* ease-out-expo */
--dur-fast: 120ms;
--dur-mid:  220ms;
--dur-slow: 380ms;
```

- **Page transitions**: opacity fade `--dur-mid` ease-out.
- **Card hover**: `transform: translateY(-2px)` `--dur-fast` ease-out + shadow deepen.
- **Status badge updates**: background color crossfade `--dur-slow`.
- **Table row enter** (new events): `opacity 0→1 + translateY(4px→0)` `--dur-mid`, staggered 30ms per row.
- No bounce, no elastic, no spring.

---

## Z-index Scale

```
--z-base:     0
--z-sticky:  10    /* table headers, filter bar */
--z-dropdown:20    /* select menus, datepicker */
--z-sidebar: 30    /* collapsed sidebar overlay */
--z-modal-bg:40    /* modal backdrop */
--z-modal:   50    /* modal panel */
--z-toast:   60    /* notification toasts */
--z-tooltip: 70    /* tooltips */
```

Never arbitrary values (999, 9999).

---

## Iconography

**Lucide React** — consistent weight, fills match status colors.
Key icons used: `Shield`, `Camera`, `Bell`, `AlertTriangle`, `CheckCircle`, `XCircle`, `Activity`, `Clock`, `Filter`, `Search`, `ChevronRight`, `Wifi`, `WifiOff`, `Image`, `Download`.
Size convention: 14px in badges/table, 18px in nav, 24px in page headings.

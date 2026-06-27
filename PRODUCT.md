# Product

## Register

product

## Users

**Primary — Safety/Security Officer**
Stationed at a control room or security desk, watching CCTV feeds and the dashboard simultaneously, often on shift for 8+ hours. Needs to scan overall status at a glance and drill into an event without hunting. Low tolerance for ambiguity; they act on what they see.

**Secondary — IT Admin**
Opens the dashboard periodically (not continuously) to verify system health: are cameras online, are alerts delivering, is the Python service running? Comfort level varies; some are non-IT staff managing this on the side.

**Tertiary — Supervisor/Manager**
Reviews event summaries or alert counts during walk-arounds or shift handovers. Primarily reads aggregated numbers, rarely drills into individual events.

## Product Purpose

Walkway Detection Monitoring Dashboard — real-time visibility into an AI-powered industrial safety system that detects when personnel enter restricted zones via CCTV. The dashboard surfaces detection events, camera operational status, alert delivery outcomes (Teams/Email), and overall system health. Success means a Safety Officer can answer "is the system working and what happened?" without opening a database or calling IT.

Multi-tenant: every query is scoped to a `company_code`, so the same deployment serves multiple sites or customers.

## Brand Personality

**Reliable. Immediate. Industrial.**

The system protects people — it must inspire confidence in high-stakes moments, not impress with aesthetics. Calm under load, precise with data, zero decorative noise.

## Anti-references

- **Power BI / generic BI** — pivot tables, heavy chart toolbars, Excel-in-a-browser feel
- **Startup SaaS marketing** — gradient heroes, cream backgrounds, soft rounded cards, friendly copy
- **Generic AI dashboard template** — numbered section eyebrows, identical icon+text card grids, SaaS metric hero template

## Design Principles

1. **Status first** — on any page, the operational state (online/offline, success/fail, alert/clear) must be visible without scrolling or clicking.
2. **Density without noise** — pack real information; remove decoration. Every pixel should answer a question an operator might have.
3. **Act fast, drill later** — surface the most urgent item at the top; details one click away, never buried.
4. **Dual-mode without compromise** — dark mode for control-room shifts, light mode for office use; neither is an afterthought.
5. **Trust through precision** — exact timestamps, real numbers, no rounding that obscures facts. Empty states are honest ("No events in range"), not cheerful.

## Accessibility & Inclusion

WCAG 2.1 AA minimum. Intranet deployment; all users share the same internal network. Reduced-motion support required (some monitors are embedded / projected). Color-alone status is banned — every status indicator pairs color with icon or text label so it reads in grayscale or for color-blind users.

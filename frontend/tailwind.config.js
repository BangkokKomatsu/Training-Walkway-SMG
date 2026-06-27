/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Design tokens mapped from DESIGN.md
        // These are CSS-var-backed so both themes just work
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        ink: 'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        'ink-subtle': 'var(--ink-subtle)',
        primary: 'var(--primary)',
        'primary-fg': 'var(--primary-fg)',
        accent: 'var(--accent)',
        'accent-fg': 'var(--accent-fg)',
        'status-ok': 'var(--status-ok)',
        'status-warn': 'var(--status-warn)',
        'status-err': 'var(--status-err)',
        'status-off': 'var(--status-off)',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./context/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tc-bg': '#16191D',
        'tc-nav-bg': '#1B1E22',
        'tc-surface': '#1F2328',
        'tc-surface-2': '#282D33',
        'tc-border': '#363C44',
        'tc-text': '#E7EAEE',
        'tc-text-muted': '#9AA3AD',
        'tc-text-dim': '#6B7480',
        'tc-equip-on': '#E7EAEE',
        'tc-equip-off': '#4A515A',
        'tc-alarm-crit': '#F0616A',
        'tc-alarm-crit-fill': '#B8322F',
        'tc-alarm-warn': '#F5A524',
        'tc-action': '#3B82F6',
        'tc-action-fill': '#2F6FDB',
        'tc-nav-active': '#26344A',
        'tc-flame': '#FF8A3D',
        'tc-stop': '#C93C3C'
      }
    },
  },
  plugins: [],
}

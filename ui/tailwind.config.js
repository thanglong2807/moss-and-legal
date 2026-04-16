/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Semantic color tokens — use these instead of slate-* for theme-aware colors.
      // They automatically switch between light/dark via CSS variables.
      backgroundColor: {
        surface: 'rgb(var(--surface) / <alpha-value>)',   // panels, cards
        page:    'rgb(var(--page) / <alpha-value>)',       // page bg
        input:   'rgb(var(--input) / <alpha-value>)',      // inputs, badges
      },
      borderColor: {
        base:  'rgb(var(--border-base) / <alpha-value>)',  // dividers
        faint: 'rgb(var(--border-faint) / <alpha-value>)', // subtle lines
      },
      textColor: {
        strong: 'rgb(var(--text-strong) / <alpha-value>)', // headings
        body:   'rgb(var(--text-body) / <alpha-value>)',   // regular
        weak:   'rgb(var(--text-weak) / <alpha-value>)',   // muted
      },
      colors: {
        orange: {
          50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
          400: '#fb923c', 500: '#f97316', 600: '#ea580c',
          700: '#c2410c', 800: '#9a3412', 900: '#7c2d12',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

import colors from 'tailwindcss/colors'

const sans = ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Noto Sans Arabic', 'sans-serif']

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // One accent colour. "rose" is aliased so screens not yet restyled stay on-brand.
      colors: { brand: colors.indigo, rose: colors.indigo },
      fontFamily: { sans, display: sans },
      boxShadow: { card: '0 1px 2px rgb(0 0 0 / 0.04), 0 1px 3px rgb(0 0 0 / 0.05)' },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'none' } },
        pop: { '0%': { opacity: '0', transform: 'scale(0.94)' }, '100%': { opacity: '1', transform: 'none' } },
        'sheet-up': { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'none' } },
        flicker: { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.06)' } },
        'float-up': { '0%': { opacity: '0' }, '100%': { opacity: '0' } },
      },
      animation: {
        'fade-up': 'fade-up 0.25s ease-out both',
        pop: 'pop 0.2s ease-out both',
        'sheet-up': 'sheet-up 0.22s ease-out both',
        flicker: 'flicker 2s ease-in-out infinite',
        'float-up': 'float-up 0.1s linear both',
      },
    },
  },
  plugins: [],
}

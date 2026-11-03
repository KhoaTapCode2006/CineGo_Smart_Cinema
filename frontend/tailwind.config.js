/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          DEFAULT: '#E50914',
        },
        cinema: {
          bg: '#0F1220',
          dark: '#0B0E1A',
          surface: '#181C2E',
          card: '#181C2E',
          cardElevated: '#20253D',
          border: '#262D4A',
          hover: '#222942',
          text: '#F4F5F7',
          muted: '#9BA3B8',
          subtle: '#64748B',
          // Booking screens (Figma "SE_FRI" color variables)
          raised: '#232940',
          outline: '#3B435D',
          soft: '#ADB5CE',
          coral: '#FF858B',
        },
        accent: {
          gold: '#F5B301',
          goldHover: '#E0A300',
        },
        seat: {
          standard: '#38BDF8',
          vip: '#FBBF24',
          couple: '#F472B6',
          selected: '#22C55E',
          held: '#FB923C',
          sold: '#334155',
        }
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      aspectRatio: {
        poster: '2 / 3',
      },
      animation: {
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 300ms ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B132B',
          950: '#060B1E',
          900: '#0B132B',
          800: '#101A3A',
          700: '#16224B',
        },
        midnight: {
          DEFAULT: '#1C2541',
          700: '#28314F',
          600: '#3A4A75',
        },
        electric: {
          DEFAULT: '#4CC9F0',
          100: '#7DD8F5',
          200: '#2FA7D9',
        },
        grape: {
          DEFAULT: '#3A0CA3',
          100: '#5A2BC7',
          200: '#2A0775',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px 0 rgba(76, 201, 240, 0.25)',
        'glow-lg': '0 0 80px 0 rgba(76, 201, 240, 0.35)',
        glass: '0 8px 32px 0 rgba(6, 11, 30, 0.37)',
        card: '0 24px 48px -12px rgba(6, 11, 30, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        blob: 'blob 12s ease-in-out infinite',
        'gradient-x': 'gradient-x 8s ease infinite',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(40px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-30px, 30px) scale(0.95)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};

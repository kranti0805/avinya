/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        'slide-in-right': { '0%': { transform: 'translateX(100%)', opacity: 0 }, '100%': { transform: 'translateX(0)', opacity: 1 } },
        'highlight': { '0%': { boxShadow: '0 0 0 2px rgb(99 102 241)' }, '100%': { boxShadow: '0 0 0 0 transparent' } },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'highlight': 'highlight 1.5s ease-out',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html", 
    "./src/**/*.{js,ts,jsx,tsx}",
    // Optimize MUI integration
    "./node_modules/@mui/material/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Sarabun', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-in': 'slide-in 0.3s ease-out forwards',
        'bounce-in': 'bounce-in 0.6s ease-out forwards',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: 0 },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
      },
      // Performance-focused utilities
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      }
    },
  },
  plugins: [
    // Add performance plugins if needed
  ],
  // Optimize build size
  corePlugins: {
    preflight: true,
  },
}
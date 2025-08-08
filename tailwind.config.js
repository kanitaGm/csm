/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <<< สำคัญมาก
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

 theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Sarabun', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}

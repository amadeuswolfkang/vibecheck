/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './styles/**/*.{css,js,ts,jsx,tsx}',
    ],
    darkMode: 'class',
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        },
        keyframes: {
          spin: {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
          },
          'fade-in': {
            '0%': { opacity: '0', transform: 'translateY(1rem)' },
            '100%': { opacity: '1', transform: 'translateY(0)' }
          }
        },
        animation: {
          'spin': 'spin 1s linear infinite',
          'fade-in': 'fade-in 0.5s ease-out forwards'
        }
      },
    },
    plugins: [],
  }
  
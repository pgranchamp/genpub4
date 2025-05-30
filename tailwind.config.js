/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          'genie': {
            'blue': '#00B4D8',
            'navy': '#0A2342',
            'purple': '#9D4EDD',
            'yellow': '#FFD166',
            'gradient-start': '#9D4EDD',
            'gradient-end': '#00B4D8',
          },
        },
        fontFamily: {
          'sans': ['Inter', 'system-ui', 'sans-serif'],
          'inter': ['Inter', 'system-ui', 'sans-serif'],
        },
        fontWeight: {
          normal: 400,
          bold: 700,
          extrabold: 800,
        },
        backgroundImage: {
          'gradient-genie': 'linear-gradient(90deg, #9D4EDD 0%, #00B4D8 100%)',
        },
      },
    },
    plugins: [],
  }

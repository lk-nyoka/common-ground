/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif']
      },
      colors: {
        paper: '#F6F4EF',
        card: '#FFFFFF',
        ink: '#1A1714',
        muted: '#6E6860',
        line: '#E6E1D8',
        accent: '#D9480F',
        personA: { DEFAULT: '#5B5BD6', light: '#B4B4FF' },
        personB: { DEFAULT: '#0E9384', light: '#7CE0D3' },
        cream: {
          50: '#FDFCF7',
          100: '#FBF8EF',
          200: '#F5EFE0',
        },
        sage: {
          50: '#F2F6F3',
          100: '#E2ECE4',
          500: '#4A6B53',
          600: '#3D5944',
          700: '#2F4635',
        },
        terracotta: {
          100: '#FDECE7',
          500: '#C25D43',
          600: '#A94B34',
        },
        sand: {
          100: '#F4ECE1',
          500: '#C4A482',
          800: '#4A3E31',
        }
      },
    },
  },
  plugins: [],
}

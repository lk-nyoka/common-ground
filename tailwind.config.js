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
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Instrument Sans"', 'ui-sans-serif', 'sans-serif']
      },
      colors: {
        // Common Ground tokens. A and B are the two people; "shared" is where they overlap.
        paper: '#F4F3F8',
        card: '#FFFFFF',
        ink: '#1D1A2B',
        muted: '#5F5B72',
        line: '#E3E1EB',
        a: { DEFAULT: '#D6336C', soft: '#FCE8F0', ink: '#A61E4D' },
        b: { DEFAULT: '#2B63D9', soft: '#E4ECFC', ink: '#1C4AAE' },
        shared: { DEFAULT: '#6F42C1', soft: '#EEE7FA', ink: '#5530A0' },
        danger: '#B42318',
        // Legacy names kept so Gentle visit keeps working.
        personA: { DEFAULT: '#D6336C', light: '#F7B6CC' },
        personB: { DEFAULT: '#2B63D9', light: '#A9C2F5' },
        accent: '#6F42C1',
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

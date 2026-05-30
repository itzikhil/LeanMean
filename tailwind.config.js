/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Karla', 'sans-serif'],
      },
      colors: {
        paper: '#f4ede0',
        paper2: '#fbf7ef',
        ink: '#23201a',
        inksoft: '#6b6356',
        forest: '#2f4a3a',
        terra: '#c0623a',
        gold: '#b88a2e',
        line: '#ddd0bb',
        macp: '#9c3d52',
        macc: '#b07d1e',
        macf: '#3f6e6a',
        breakfast: '#d98a2b',
        snack: '#b8506e',
        lunch: '#3f7a4f',
        prewo: '#c0623a',
        dinner: '#3a5a7a',
        extras: '#8a8270',
      },
    },
  },
  plugins: [],
}

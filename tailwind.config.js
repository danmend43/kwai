/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        kwai: {
          primary: '#FF6B00',
          secondary: '#FF8C42',
          dark: '#1a1a1a',
        }
      }
    },
  },
  plugins: [],
}




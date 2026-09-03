/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1f6f54', dark: '#16513e', light: '#e8f5ef' },
        accent: '#d98c2b',
        muted: '#667070',
        danger: { DEFAULT: '#c0392b', bg: '#fdecea' },
        success: { DEFAULT: '#1f7a4d', bg: '#e7f6ee' },
        border: '#e1e4e0',
        card: '#ffffff',
        bg: '#f6f7f5',
      },
      borderRadius: { card: '10px' },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

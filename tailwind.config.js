/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/client/**/*.{js,ts,jsx,tsx}",
    "./src/client/index.html",
  ],
  theme: {
    extend: {
      colors: {
        positive: '#22c55e',
        negative: '#ef4444',
      },
    },
  },
  plugins: [],
};

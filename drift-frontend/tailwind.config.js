/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        drift: {
          bg: "#0f0f13",
          card: "#1a1a24",
          border: "#2a2a3a",
          accent: "#6366f1",
          green: "#22c55e",
          amber: "#f59e0b",
          red: "#ef4444",
          textMuted: "#a0a0b0"
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
}

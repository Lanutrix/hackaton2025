/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#13ec49",
        "background-light": "#f6f8f6",
        "background-dark": "#102215",
        muted: "#6b7280",
      },
      fontFamily: {
        display: ["Inter", "Public Sans", "sans-serif"],
        public: ["Public Sans", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      boxShadow: {
        card: "0 20px 60px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
}

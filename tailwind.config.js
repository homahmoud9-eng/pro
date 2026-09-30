export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0c0e12",
        foreground: "#f8fafc",
        card: {
          DEFAULT: "#141720",
          foreground: "#f8fafc",
          border: "#1e2433",
        },
        sidebar: {
          DEFAULT: "#0f1218",
          foreground: "#94a3b8",
          active: "#e11d48",
        },
        primary: {
          DEFAULT: "#e11d48", // Vivid magenta / rose enterprise accent
          hover: "#f43f5e",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#e11d48",
          purple: "#a855f7",
          blue: "#3b82f6",
          green: "#10b981",
          yellow: "#f59e0b",
          orange: "#f97316",
        },
        muted: {
          DEFAULT: "#1e2433",
          foreground: "#94a3b8",
        },
        border: "#1e2433",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 950: "#07111f", 900: "#0a1728", 800: "#10233a" },
        cyan: { 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2" },
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
      boxShadow: { panel: "0 10px 30px rgba(2, 12, 27, 0.08)" },
    },
  },
  plugins: [],
} satisfies Config;

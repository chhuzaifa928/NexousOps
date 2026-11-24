import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#FBFBF9",
        surface: "#FFFFFF",
        limestone: "#F4F4F0",
        hairline: "#E5E7EB",
        ink: "#0F172A",
        muted: "#475569",
        cobalt: "#1D4ED8",
        synapse: "#0F766E",
        success: "#15803D",
        warning: "#B45309",
        critical: "#B91C1C",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "Liberation Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04)",
        drawer: "-12px 0 40px rgba(15, 23, 42, 0.10)",
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};

export default config;

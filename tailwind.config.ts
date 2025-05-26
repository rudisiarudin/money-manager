import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#122d5b", // Biru gelap
        "primary-light": "#d3dae7", // Biru terang untuk latar belakang lembut
      },
    },
  },
  plugins: [],
} satisfies Config;

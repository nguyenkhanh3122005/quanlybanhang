/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "hsl(var(--border))",
        card: {
          DEFAULT: "#13151b",
          foreground: "#f3f4f6",
        },
        slate: {
          850: "#171a22",
          900: "#0f1117",
          950: "#090a0f",
        },
        brand: {
          blue: "#38bdf8",
          accent: "#0ea5e9",
          dark: "#0b0f19",
        }
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
};

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        vibe: "1.5rem",
        "vibe-xl": "1.5rem",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        vibe: {
          bg: "#0D0D12",
          surface: "#16161F",
          elevated: "#1E1E2A",
          accent: "#E85D75",
          "accent-soft": "#8B5CF6",
          border: "#2A2A38",
          t1: "#F4F4F7",
          t2: "#A8A8B8",
          t3: "#6B6B7A",
          t4: "#4A4A5C",
        },
      },
      boxShadow: {
        "vibe-accent": "0 6px 20px rgba(232, 93, 117, 0.25)",
        "vibe-card": "0 10px 36px rgba(0, 0, 0, 0.35)",
      },
      transitionDuration: {
        vibe: "250ms",
      },
      transitionTimingFunction: {
        "vibe-out": "cubic-bezier(0.33, 1, 0.68, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

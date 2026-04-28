import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        flame: {
          50:  "#fff7e6",
          100: "#ffe9b8",
          200: "#ffd47a",
          300: "#ffba3d",
          400: "#ff9e1f",
          500: "#ff7a14",
          600: "#ef4a18",
          700: "#c8231a",
          800: "#971010",
          900: "#5e0606",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        "phone": "0 24px 64px -28px rgba(15,15,15,0.18), 0 6px 18px -10px rgba(15,15,15,0.10)",
        "bubble": "0 1px 1px rgba(0,0,0,0.04), 0 4px 14px -8px rgba(200,35,26,0.25)",
      },
      animation: {
        "pop": "pop 380ms cubic-bezier(.2,.9,.25,1.4)",
        "fade-up": "fadeUp 280ms ease-out",
        "bounce-dot": "bounceDot 1.1s infinite ease-in-out",
        "shimmer": "shimmer 6s linear infinite",
      },
      keyframes: {
        pop: {
          "0%":   { transform: "scale(0.4) translateY(10px)", opacity: "0" },
          "60%":  { transform: "scale(1.04) translateY(-2px)", opacity: "1" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        fadeUp: {
          "0%":   { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        bounceDot: {
          "0%, 80%, 100%": { transform: "translateY(0)", opacity: "0.5" },
          "40%":           { transform: "translateY(-5px)", opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "0% 50%" },
          "50%":  { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

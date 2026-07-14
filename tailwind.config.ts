import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          DEFAULT: "#DA1A21",
          hover: "#B9141B",
          dark: "#1A1A1A"
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        emergency: {
          DEFAULT: "var(--emergency)",
          foreground: "var(--emergency-foreground)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'premium': '1.5rem',
        '2premium': '2.5rem',
      },
      boxShadow: {
        'premium': '0 20px 50px -12px rgba(0, 0, 0, 0.25)',
        'premium-hover': '0 30px 60px -12px rgba(0, 0, 0, 0.3)',
        'brand': '0 10px 40px -10px rgba(218, 26, 33, 0.5)',
        'glow-sm': '0 0 15px rgba(218, 26, 33, 0.3)',
        'glow-md': '0 0 30px rgba(218, 26, 33, 0.4)',
        'glow-lg': '0 0 45px rgba(218, 26, 33, 0.5)',
        'inner-glow': 'inset 0 2px 10px rgba(255, 255, 255, 0.1)',
        'card': '0 4px 20px -5px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
        'button': '0 4px 15px rgba(0, 0, 0, 0.1)',
        'button-hover': '0 8px 25px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'blob': 'blob 7s infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
        'scroll-reveal': 'scroll-reveal 0.8s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'border-glow': 'borderGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-gentle': 'bounce 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(0.98)' },
        },
        'scroll-reveal': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(218, 26, 33, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(218, 26, 33, 0.5)' },
        },
        'slideUp': {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'scaleIn': {
          'from': { opacity: '0', transform: 'scale(0.95)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
        'borderGlow': {
          '0%, 100%': { borderColor: 'rgba(218, 26, 33, 0.2)' },
          '50%': { borderColor: 'rgba(218, 26, 33, 0.5)' },
        },
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;

import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Satoshi', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        'sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        'base': ['1rem', { lineHeight: '1.6', letterSpacing: '-0.011em' }],
        'lg': ['1.125rem', { lineHeight: '1.6', letterSpacing: '-0.012em' }],
        'xl': ['1.25rem', { lineHeight: '1.5', letterSpacing: '-0.014em' }],
        '2xl': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.016em' }],
        '3xl': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.025em' }],
        '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
      },
      letterSpacing: {
        tighter: '-0.03em',
        tight: '-0.02em',
        normal: '-0.011em',
        wide: '0.01em',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "flow-purple": {
          50: "hsl(var(--flow-purple-50))",
          100: "hsl(var(--flow-purple-100))",
          200: "hsl(var(--flow-purple-200))",
          300: "hsl(var(--flow-purple-300))",
          400: "hsl(var(--flow-purple-400))",
          500: "hsl(var(--flow-purple-500))",
          600: "hsl(var(--flow-purple-600))",
          700: "hsl(var(--flow-purple-700))",
          800: "hsl(var(--flow-purple-800))",
          900: "hsl(var(--flow-purple-900))",
          950: "hsl(var(--flow-purple-950))",
        },
        "flow-green": {
          DEFAULT: "hsl(var(--flow-green))",
          foreground: "hsl(var(--flow-green-foreground))",
        },
        "flow-grey": {
          DEFAULT: "hsl(var(--flow-grey))",
          light: "hsl(var(--flow-grey-light))",
          dark: "hsl(var(--flow-grey-dark))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        // 8px grid system
        'grid': '0.5rem',    // 8px
        'grid-2': '1rem',    // 16px
        'grid-3': '1.5rem',  // 24px
        'grid-4': '2rem',    // 32px
        'grid-5': '2.5rem',  // 40px
        'grid-6': '3rem',    // 48px
      },
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(139, 126, 200, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(139, 126, 200, 0.5)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "dropdown-fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "dropdown-fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "dialog-fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "dialog-fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "dialog-overlay-fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "dialog-overlay-fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "shimmer": "shimmer 2s infinite linear",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "dropdown-fade-in": "dropdown-fade-in 0.15s ease-out forwards",
        "dropdown-fade-out": "dropdown-fade-out 0.1s ease-in forwards",
        "dialog-fade-in": "dialog-fade-in 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "dialog-fade-out": "dialog-fade-out 0.2s cubic-bezier(0.4, 0, 1, 1) forwards",
        "dialog-overlay-fade-in": "dialog-overlay-fade-in 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        "dialog-overlay-fade-out": "dialog-overlay-fade-out 0.2s cubic-bezier(0.4, 0, 1, 1)",
      },
      boxShadow: {
        "purple": "0 4px 14px 0 rgba(87, 87, 255, 0.15)",
        "purple-lg": "0 10px 30px 0 rgba(87, 87, 255, 0.2), 0 4px 12px 0 rgba(87, 87, 255, 0.1)",
        "purple-glow": "0 0 20px rgba(87, 87, 255, 0.3), 0 4px 14px rgba(87, 87, 255, 0.15)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config





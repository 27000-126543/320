/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'space-dark': '#0A1628',
        'space-blue': '#0F2847',
        'cyber-blue': '#00D4FF',
        'electric-blue': '#1E90FF',
        'heat-orange': '#FF6B35',
        'gas-green': '#00C48C',
        'alert-red': '#FF3B5C',
        'safe-green': '#00E676',
        'warning-yellow': '#FFC107',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        sans: ['"PingFang SC"', '"Noto Sans SC"', 'sans-serif'],
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(0, 212, 255, 0.2)',
        'glow-red': '0 0 20px rgba(255, 59, 92, 0.6), 0 0 40px rgba(255, 59, 92, 0.3)',
        'glow-green': '0 0 20px rgba(0, 230, 118, 0.5), 0 0 40px rgba(0, 230, 118, 0.2)',
        'glow-orange': '0 0 20px rgba(255, 107, 53, 0.5), 0 0 40px rgba(255, 107, 53, 0.2)',
        'hud': 'inset 0 0 30px rgba(0, 212, 255, 0.1), 0 0 20px rgba(0, 212, 255, 0.15)',
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0, 212, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.08) 1px, transparent 1px)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
        'blink': 'blink 1s step-end infinite',
        'float': 'float 3s ease-in-out infinite',
        'rotate-slow': 'spin 20s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};

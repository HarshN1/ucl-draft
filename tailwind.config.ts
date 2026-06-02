import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/screens/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0e1a',
        primary: '#1a2744',
        accent: '#00d4ff',
        gold: '#ffd700',
        'ucl-green': '#00ff88',
        'ucl-red': '#ff4444',
      },
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      keyframes: {
        'card-flip': {
          '0%': { transform: 'rotateY(90deg)', opacity: '0' },
          '100%': { transform: 'rotateY(0deg)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'goal-flash': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(0, 212, 255, 0.15)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        confetti: {
          '0%': { transform: 'translateY(-10px) rotate(0deg)', opacity: '1' },
          '100%': {
            transform: 'translateY(100vh) rotate(720deg)',
            opacity: '0',
          },
        },
      },
      animation: {
        'card-flip': 'card-flip 0.3s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        'goal-flash': 'goal-flash 0.6s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        confetti: 'confetti 3s ease-in forwards',
      },
    },
  },
  plugins: [],
};

export default config;

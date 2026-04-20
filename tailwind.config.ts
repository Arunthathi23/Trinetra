import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 40px rgba(67, 56, 202, 0.2)',
      },
      backgroundImage: {
        'cool-gradient': 'radial-gradient(circle at top right, rgba(79, 70, 229, 0.3), transparent 35%), radial-gradient(circle at bottom left, rgba(14, 165, 233, 0.18), transparent 28%), linear-gradient(180deg, #030712 0%, #090b15 100%)'
      }
    }
  },
  plugins: [],
} satisfies Config;

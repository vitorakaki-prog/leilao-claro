import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        semaforo: { A: '#15803d', B: '#4ade80', C: '#facc15', D: '#fb923c', E: '#dc2626' },
      },
    },
  },
  plugins: [],
} satisfies Config;

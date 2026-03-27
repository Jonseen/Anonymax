import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-void)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        primary: 'var(--accent-primary)',
        secondary: 'var(--accent-secondary)',
        ghost: 'var(--accent-ghost)',
        brandText: 'var(--text-primary)',
        muted: 'var(--text-muted)',
        danger: 'var(--danger)',
      },
    },
  },
  plugins: [],
} satisfies Config;

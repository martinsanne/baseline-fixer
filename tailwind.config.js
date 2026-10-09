/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: { DEFAULT: '#faf9f5', 100: '#f5f4ee', 200: '#f0eee6', 300: '#e8e6dc' },
        ink: { DEFAULT: '#141413', 700: '#3d3d3a', 500: '#5e5d59', 400: '#87867f', 300: '#b0aea5', 200: '#d1cfc5' },
        clay: { DEFAULT: '#d97757', dark: '#c6613f', light: '#f3ddd3' },
        olive: { DEFAULT: '#788c5d', light: '#e3e8da' },
        sky: { DEFAULT: '#6a9bcc', light: '#dde8f3' },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: { tightest: '-0.03em' },
    },
  },
  plugins: [],
};

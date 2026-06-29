/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'syncFlash': {
          '0%': {
            backgroundColor: 'rgba(34, 197, 94, 0.25)', // Soft green glow
            borderColor: 'rgb(34, 197, 94)',
          },
          '100%': {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          },
        },
        'infinite-loading': {
          '0%': { transform: 'translateX(-100%) scaleX(0.2)' },
          '50%': { transform: 'translateX(0%) scaleX(0.5)' },
          '100%': { transform: 'translateX(100%) scaleX(0.2)' },
        },
      },
      animation: {
        // Run the flash quickly, then fade out over 2 seconds smoothly
        'sync-flash': 'syncFlash 2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'infinite-loading': 'infinite-loading 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};

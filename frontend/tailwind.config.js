/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores legacy Voraz (mantener para compatibilidad)
        voraz: {
          red:    '#D92525',
          yellow: '#F2C94C',
          black:  '#121212',
          gray:   '#1E1E1E',
          white:  '#F5F5F5',
        },
        // Colores dinámicos White Label (usan CSS variables)
        brand: {
          primary:   'var(--brand-primary)',
          'primary-hover': 'var(--brand-primary-hover)',
          secondary: 'var(--brand-secondary)',
          bg:        'var(--brand-bg)',
          surface:   'var(--brand-surface)',
          text:      'var(--brand-text)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        voraz: {
          red: '#D92525',    // Rojo Fuego
          yellow: '#F2C94C', // Amarillo Queso
          black: '#121212',  // Fondo Principal
          gray: '#1E1E1E',   // Fondo de Tarjetas
          white: '#F5F5F5',  // Texto
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
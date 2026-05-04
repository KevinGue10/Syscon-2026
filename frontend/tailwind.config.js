/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff8ff',
          100: '#dbefff',
          200: '#bfe2ff',
          300: '#91cfff',
          400: '#5db0f6',
          500: '#398dde',
          600: '#2d71b7',
          700: '#275b93',
          800: '#274d79',
          900: '#264161',
        },
        accent: {
          50: '#fff8eb',
          100: '#ffefc7',
          200: '#ffdd8a',
          300: '#ffc458',
          400: '#f7a92d',
          500: '#eb8f12',
          600: '#cc6e0c',
          700: '#a5520f',
          800: '#874114',
          900: '#6f3614',
        },
        slate: {
          950: '#08111f',
        },
      },
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 20px 60px rgba(8, 17, 31, 0.08)',
      },
      backgroundImage: {
        'hero-grid':
          'radial-gradient(circle at top, rgba(57, 141, 222, 0.2), transparent 36%), linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};

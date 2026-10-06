/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: {
      brand: { 50:'#eef8f9',100:'#d7eef1',200:'#addce3',300:'#79c5d1',400:'#3aa6b9',500:'#00869d',600:'#00758a',700:'#005e73',800:'#00485d',900:'#00334d',950:'#002c45' },
      accent: { 50:'#fff5ee',100:'#ffe8d9',200:'#ffccb0',300:'#ffa476',400:'#ff7836',500:'#f45100',600:'#c83e00',700:'#a93200',800:'#882c0c',900:'#70270e' },
      slate: { 50:'#f3f7f8',100:'#eaf1f3',200:'#d6e3e8',300:'#b5cbd4',400:'#7d9ba9',500:'#607986',600:'#526b7a',700:'#345364',800:'#23485d',900:'#123b51',950:'#00334d' },
    },
    fontFamily: { display:['Poppins','sans-serif'],body:['Manrope','sans-serif'] },
    borderRadius: { '2xl':'0.5rem','3xl':'0.75rem' },
    boxShadow: { panel:'0 12px 36px rgba(0, 51, 77, 0.07)' },
    backgroundImage: { 'hero-grid':'radial-gradient(circle at top, rgba(0, 123, 145, 0.16), transparent 36%), linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)' },
  } },
  plugins: [],
};

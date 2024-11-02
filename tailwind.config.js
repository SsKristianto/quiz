// tailwind.config.js

module.exports = {
  content: [
    './views/**/*.html', // Pastikan path ini sesuai dengan struktur proyek Anda
    './static/js/**/*.js',
  ],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark'], // Anda dapat menambahkan tema lain jika diperlukan
  },
};

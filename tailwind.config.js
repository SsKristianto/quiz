// tailwind.config.js
module.exports = {
  content: [
    './views/**/*.html',      // File HTML dalam folder views
    './templates/**/*.html',  // Jika Anda menggunakan folder templates
    './static/js/**/*.js',    // File JS dalam folder static/js
    './**/*.html',            // Semua file HTML dalam proyek
  ],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ["pastel"], // Pastikan tema sesuai dengan yang Anda gunakan
  },
}

// static/js/auth.js

document.addEventListener('DOMContentLoaded', function() {
    // Validasi client-side untuk form registrasi
    var registerForm = document.querySelector('form[action="/register"]');
    if (registerForm) {
        registerForm.addEventListener('submit', function(event) {
            var password = document.getElementById('password').value;
            var confirmPassword = document.getElementById('confirm_password').value;
            if (password !== confirmPassword) {
                event.preventDefault();
                alert('Password dan konfirmasi password tidak cocok.');
            }
        });
    }
});

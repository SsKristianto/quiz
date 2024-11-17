// static/js/auth.js

document.addEventListener('DOMContentLoaded', function() {
    // Toggle password visibility for password field
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');

    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        // Toggle icon
        if (type === 'password') {
            eyeIcon.setAttribute('data-lucide', 'eye');
        } else {
            eyeIcon.setAttribute('data-lucide', 'eye-off');
        }
        // Re-render the icons
        lucide.createIcons();
    });

    // Toggle password visibility for confirm_password field
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    if (toggleConfirmPassword) {
        const confirmPasswordInput = document.getElementById('confirm_password');
        const eyeIconConfirm = document.getElementById('eyeIconConfirm');

        toggleConfirmPassword.addEventListener('click', function() {
            const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordInput.setAttribute('type', type);

            // Toggle icon
            if (type === 'password') {
                eyeIconConfirm.setAttribute('data-lucide', 'eye');
            } else {
                eyeIconConfirm.setAttribute('data-lucide', 'eye-off');
            }
            // Re-render the icons
            lucide.createIcons();
        });
    }
});

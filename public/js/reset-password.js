document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';

        // Get form values
        const email = document.getElementById('email').value.trim();
        const roleSelect = document.getElementById('isFarmer');
        const isFarmer = roleSelect.value === 'true';

        // Basic validation
        if (!email) {
            errorMessage.textContent = 'Email is required';
            errorMessage.style.display = 'block';
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorMessage.textContent = 'Please enter a valid email address';
            errorMessage.style.display = 'block';
            return;
        }

        // Show loading indicator
        const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';

        try {
            const response = await fetch('http://localhost:3001/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, isFarmer })
            });

            const data = await response.json();

            // Reset button state
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;

            if (response.ok) {
                successMessage.textContent = 'An OTP has been sent to your email. Please check your inbox and spam folder.';
                successMessage.style.display = 'block';
                forgotPasswordForm.reset();

                // Store email and role for the reset password page
                sessionStorage.setItem('resetEmail', email);
                sessionStorage.setItem('isFarmer', isFarmer);

                // Show a link to proceed to reset password page
                successMessage.innerHTML += '<br><a href="/reset-password.html" class="text-green-700 underline">Proceed to Reset Password</a>';
            } else {
                errorMessage.textContent = data.error || 'Failed to send OTP. Please try again later.';
                errorMessage.style.display = 'block';
                console.error('Server error:', data.error);
            }
        } catch (error) {
            console.error('Error during OTP request:', error);
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
            errorMessage.textContent = 'Connection error. Please check your internet connection and try again.';
            errorMessage.style.display = 'block';
        }
    });
});
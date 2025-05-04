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

        // Additional validation for email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorMessage.textContent = 'Please enter a valid email address';
            errorMessage.style.display = 'block';
            return;
        }

        // Show loading indicator
        const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email, 
                    isFarmer 
                })
            });

            const data = await response.json();

            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;

            if (response.ok) {
                // If response is OK, consider it successful
                successMessage.textContent = 'A reset code has been sent to your email. Please check your inbox and spam folder.';
                successMessage.style.display = 'block';
                forgotPasswordForm.reset();
                
                // Store email for the reset password page
                sessionStorage.setItem('resetEmail', email);
                sessionStorage.setItem('isFarmer', isFarmer);
                
                // Automatically redirect to reset password page after 3 seconds
                setTimeout(() => {
                    window.location.href = 'reset-password.html';
                }, 3000);
            } else {
                // Show the specific error message from the server
                errorMessage.textContent = data.error || 'Failed to send reset email. Please try again later.';
                errorMessage.style.display = 'block';
                console.error('Server error:', data.error);
            }
        } catch (error) {
            console.error('Error during password reset request:', error);
            
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            
            errorMessage.textContent = 'Connection error. Please check your internet connection and try again.';
            errorMessage.style.display = 'block';
        }
    });
});
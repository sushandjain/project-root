document.addEventListener('DOMContentLoaded', () => {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';

            // Get form values
            const email = document.getElementById('email').value.trim();
            const token = document.getElementById('token').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const isFarmer = document.querySelector('input[name="isFarmer"]:checked').value === 'true';
            const type = isFarmer ? 'farmer' : 'buyer';

            // Basic validation
            if (!email || !token || !password || !confirmPassword) {
                errorMessage.textContent = 'All fields are required';
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

            // Password validation
            if (password.length < 6) {
                errorMessage.textContent = 'Password must be at least 6 characters long';
                errorMessage.style.display = 'block';
                return;
            }

            if (password !== confirmPassword) {
                errorMessage.textContent = 'Passwords do not match';
                errorMessage.style.display = 'block';
                return;
            }

            // Show loading indicator
            const submitButton = resetPasswordForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Resetting...';

            try {
                // Verify the reset token first
                const verifyResponse = await fetch('http://localhost:3001/api/auth/verify-reset-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, token, type })
                });

                const verifyData = await verifyResponse.json();

                if (!verifyResponse.ok || !verifyData.valid) {
                    throw new Error(verifyData.error || 'Invalid or expired reset token');
                }

                // Submit the reset password request
                const response = await fetch('http://localhost:3001/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, token, password, type })
                });

                const data = await response.json();

                // Reset button state
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;

                if (response.ok) {
                    successMessage.textContent = 'Password reset successful! You can now log in with your new password.';
                    successMessage.style.display = 'block';
                    resetPasswordForm.reset();
                    successMessage.innerHTML += '<br><a href="/auth.html" class="text-green-700 underline">Back to Login</a>';
                } else {
                    errorMessage.textContent = data.error || 'Failed to reset password. Please try again.';
                    errorMessage.style.display = 'block';
                    console.error('Server error:', data.error);
                }
            } catch (error) {
                console.error('Error during password reset:', error);
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
                errorMessage.textContent = error.message || 'Connection error. Please check your internet connection and try again.';
                errorMessage.style.display = 'block';
            }
        });
    }

    // Pre-fill email and role if available from sessionStorage
    const emailInput = document.getElementById('email');
    const isFarmerTrue = document.getElementById('isFarmerTrue');
    const isFarmerFalse = document.getElementById('isFarmerFalse');
    
    const storedEmail = sessionStorage.getItem('resetEmail');
    const storedIsFarmer = sessionStorage.getItem('isFarmer');

    if (storedEmail && emailInput) {
        emailInput.value = storedEmail;
    }

    if (storedIsFarmer && isFarmerTrue && isFarmerFalse) {
        if (storedIsFarmer === 'true') {
            isFarmerTrue.checked = true;
        } else {
            isFarmerFalse.checked = true;
        }
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const userLoginForm = document.getElementById('userLoginForm');
    const userSignupForm = document.getElementById('userSignupForm');
    const userLoginError = document.getElementById('user-login-error');
    const userSignupError = document.getElementById('user-signup-error');
    const userSignupSuccess = document.getElementById('user-signup-success');

    if (userLoginForm) {
        userLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            userLoginError.style.display = 'none';

            const username = document.getElementById('userUsername').value;
            const password = document.getElementById('userPassword').value;
            const isFarmer = document.querySelector('input[name="isFarmer"]:checked').value === 'true';

            fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, isFarmer }),
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    userLoginError.textContent = data.error;
                    userLoginError.style.display = 'block';
                } else {
                    window.location.href = isFarmer ? '/add-product' : '/index.html';
                }
            })
            .catch(error => {
                userLoginError.textContent = 'An error occurred. Please try again.';
                userLoginError.style.display = 'block';
            });
        });
    }

    if (userSignupForm) {
        userSignupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            userSignupError.style.display = 'none';
            userSignupSuccess.style.display = 'none';

            const username = document.getElementById('userSignupUsername').value;
            const email = document.getElementById('userSignupEmail').value;
            const password = document.getElementById('userSignupPassword').value;
            const isFarmer = document.querySelector('input[name="isFarmer"]:checked').value === 'true';

            fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, isFarmer }),
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    userSignupError.textContent = data.error;
                    userSignupError.style.display = 'block';
                } else {
                    userSignupSuccess.textContent = data.message;
                    userSignupSuccess.style.display = 'block';
                    userSignupForm.reset();
                }
            })
            .catch(error => {
                userSignupError.textContent = 'An error occurred. Please try again.';
                userSignupError.style.display = 'block';
            });
        });
    }
});

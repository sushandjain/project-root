document.addEventListener('DOMContentLoaded', () => {
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminLoginError = document.getElementById('admin-login-error');

    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        adminLoginError.style.display = 'none';

        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;

        fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                adminLoginError.textContent = data.error;
                adminLoginError.style.display = 'block';
            } else {
                window.location.href = '/admin';
            }
        })
        .catch(error => {
            adminLoginError.textContent = 'An error occurred. Please try again.';
            adminLoginError.style.display = 'block';
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const productTableBody = document.getElementById('productTableBody');
    const userTableBody = document.getElementById('userTableBody');
    const searchProducts = document.getElementById('searchProducts');

    // Fetch and display products
    async function loadProducts() {
        try {
            const response = await fetch('/api/admin/products', {
                method: 'GET',
                credentials: 'include'
            });
            const products = await response.json();
            if (response.ok) {
                productTableBody.innerHTML = '';
                products.forEach(product => {
                    let status = 'Available';
                    let statusClass = 'badge-available';
                    if (product.quantity === 0) {
                        status = 'Out of Stock';
                        statusClass = 'badge-out';
                    } else if (product.quantity < 10) {
                        status = 'Low Stock';
                        statusClass = 'badge-low';
                    } else if (product.isOutdated) {
                        status = 'Outdated';
                        statusClass = 'badge-out';
                    }
                    productTableBody.innerHTML += `
                        <tr>
                            <td>${product.id}</td>
                            <td><img src="${product.imageUrl}" class="product-img" alt="${product.productName}" style="max-height: 50px;"></td>
                            <td>${product.productName}</td>
                            <td>${product.category}</td>
                            <td>$${product.price}</td>
                            <td>${product.quantity} kg</td>
                            <td>${product.farmerName}</td>
                            <td><span class="${statusClass}">${status}</span></td>
                            <td>
                                <button class="btn btn-action btn-edit" onclick="editProduct(${product.id}, '${product.productName}', '${product.category}', ${product.price}, ${product.quantity})"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-action btn-delete" onclick="deleteProduct(${product.id})"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                productTableBody.innerHTML = '<tr><td colspan="9" class="text-danger">Failed to load products.</td></tr>';
                console.error('Error fetching products:', products.error);
            }
        } catch (error) {
            productTableBody.innerHTML = '<tr><td colspan="9" class="text-danger">Failed to load products.</td></tr>';
            console.error('Fetch error:', error);
        }
    }

    // Fetch and display users
    async function loadUsers() {
        try {
            const response = await fetch('/api/admin/users', {
                method: 'GET',
                credentials: 'include'
            });
            const users = await response.json();
            if (response.ok) {
                userTableBody.innerHTML = '';
                users.forEach(user => {
                    userTableBody.innerHTML += `
                        <tr>
                            <td>${user.id}</td>
                            <td>${user.username}</td>
                            <td>${user.email}</td>
                            <td>${user.phone}</td>
                            <td>${user.role}</td>
                            <td>
                                <button class="btn btn-action btn-edit" onclick="editUser(${user.id}, '${user.username}', '${user.email}', '${user.phone}', '${user.role}')"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-action btn-delete" onclick="deleteUser(${user.id})"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                userTableBody.innerHTML = '<tr><td colspan="6" class="text-danger">Failed to load users.</td></tr>';
                console.error('Error fetching users:', users.error);
            }
        } catch (error) {
            userTableBody.innerHTML = '<tr><td colspan="6" class="text-danger">Failed to load users.</td></tr>';
            console.error('Fetch error:', error);
        }
    }

    // Search products
    searchProducts.addEventListener('input', () => {
        const searchTerm = searchProducts.value.toLowerCase();
        const rows = productTableBody.getElementsByTagName('tr');
        Array.from(rows).forEach(row => {
            const name = row.cells[2].textContent.toLowerCase();
            row.style.display = name.includes(searchTerm) ? '' : 'none';
        });
    });

    // Edit product
    window.editProduct = (id, name, category, price, quantity) => {
        document.getElementById('editProductId').value = id;
        document.getElementById('editProductName').value = name;
        document.getElementById('editCategory').value = category;
        document.getElementById('editPrice').value = price;
        document.getElementById('editQuantity').value = quantity;
        const modal = new bootstrap.Modal(document.getElementById('editProductModal'));
        modal.show();
    };

    // Edit user
    window.editUser = (id, username, email, phone, role) => {
        document.getElementById('editUserId').value = id;
        document.getElementById('editUsername').value = username;
        document.getElementById('editEmail').value = email;
        document.getElementById('editPhone').value = phone || '';
        document.getElementById('editRole').value = role;
        const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
        modal.show();
    };

    // Delete product
    window.deleteProduct = async (id) => {
        if (confirm('Are you sure you want to delete this product?')) {
            try {
                const response = await fetch(`/api/products/${id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                const result = await response.json();
                if (response.ok) {
                    alert('Product deleted successfully!');
                    loadProducts();
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                alert('Error deleting product: ' + error.message);
            }
        }
    };

    // Delete user
    window.deleteUser = async (id) => {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                const response = await fetch(`/api/admin/users/${id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                const result = await response.json();
                if (response.ok) {
                    alert('User deleted successfully!');
                    loadUsers();
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                alert('Error deleting user: ' + error.message);
            }
        }
    };

    // Handle edit product form submission
    document.getElementById('editProductForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editProductId').value;
        const productName = document.getElementById('editProductName').value;
        const category = document.getElementById('editCategory').value;
        const price = document.getElementById('editPrice').value;
        const quantity = document.getElementById('editQuantity').value;
        try {
            const response = await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productName, category, price, quantity }),
                credentials: 'include'
            });
            const result = await response.json();
            if (response.ok) {
                alert('Product updated successfully!');
                const modal = bootstrap.Modal.getInstance(document.getElementById('editProductModal'));
                modal.hide();
                loadProducts();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('Error updating product: ' + error.message);
        }
    });

    // Handle edit user form submission
    document.getElementById('editUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editUserId').value;
        const username = document.getElementById('editUsername').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const phone = document.getElementById('editPhone').value.trim();
        const role = document.getElementById('editRole').value;

        // Basic validation
        if (!username || !email || !role) {
            alert('Username, email, and role are required');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, phone, role }),
                credentials: 'include'
            });
            const result = await response.json();
            if (response.ok) {
                alert('User updated successfully!');
                const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                modal.hide();
                loadUsers();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('Error updating user: ' + error.message);
        }
    });

    // Initial load
    loadProducts();
    loadUsers();
});
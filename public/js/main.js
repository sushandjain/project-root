document.addEventListener('DOMContentLoaded', () => {
    let products = [];
    let map;
    let markers = [];

    // Initialize the map
    function initializeMap() {
        map = L.map('productMap').setView([40.7128, -74.0060], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);
        setTimeout(() => map.invalidateSize(), 100);
    }

    // Update map markers based on products
    function updateMap(filteredProducts) {
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        filteredProducts.forEach(product => {
            if (product.latitude && product.longitude) {
                const marker = L.marker([product.latitude, product.longitude]).addTo(map);
                marker.bindPopup(`
                    <b>${product.productName}</b><br>
                    Farmer: ${product.farmerName}<br>
                    Price: ₹${product.price}<br>
                    Category: ${product.category}
                `);
                markers.push(marker);
            } else {
                console.log(`Skipping map marker for product ${product.productName}: Missing coordinates`);
            }
        });

        if (markers.length > 0) {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds(), { padding: [50, 50] });
        } else {
            console.log('No valid coordinates for map markers');
        }
    }

    // Render products
    function renderProducts(filteredProducts) {
        const productContainer = document.getElementById('productContainer');
        productContainer.innerHTML = '';

        if (filteredProducts.length === 0) {
            productContainer.innerHTML = '<p class="text-muted">No products found.</p>';
            return;
        }

        filteredProducts.forEach(product => {
            console.log('Rendering product:', {
                id: product.id,
                productName: product.productName,
                imageUrl: product.imageUrl,
                category: product.category,
                price: product.price,
                quantity: product.quantity
            });
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4';
            const imageSrc = product.imageUrl && product.imageUrl !== 'null' ? product.imageUrl : '/img/placeholder.jpg';
            card.innerHTML = `
                <div class="card h-100">
                    <img src="${imageSrc}" class="card-img-top" alt="${product.productName}" style="height: 200px; object-fit: cover;" onerror="this.src='/img/placeholder.jpg'">
                    <div class="card-body">
                        <h5 class="card-title">${product.productName}</h5>
                        <p class="card-text">Price: ₹${product.price}</p>
                        <p class="card-text">Quantity: ${product.quantity} kg</p>
                        <p class="card-text">Farmer: ${product.farmerName}</p>
                        <p class="card-text">${product.description ? product.description.substring(0, 100) + '...' : 'No description'}</p>
                        ${product.isOutdated ? '<p class="text-danger">Note: Product may be outdated</p>' : ''}
                    </div>
                    <div class="card-footer text-muted">
                        Category: ${product.category} | Harvest: ${product.harvestDate || 'N/A'}
                    </div>
                </div>
            `;
            productContainer.appendChild(card);
        });
    }

    // Filter and sort products
    function filterAndSortProducts() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const selectedCategory = document.querySelector('.category-btn.active')?.dataset.category || 'all';
        const sortOption = document.getElementById('sortSelect').value;
        const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;

        let filteredProducts = products.filter(product => {
            const matchesSearch = product.productName.toLowerCase().includes(searchTerm) ||
                                 product.farmerName.toLowerCase().includes(searchTerm) ||
                                 (product.description && product.description.toLowerCase().includes(searchTerm));
            const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
            const matchesPrice = product.price <= maxPrice;
            return matchesSearch && matchesCategory && matchesPrice;
        });

        if (sortOption === 'priceLow') {
            filteredProducts.sort((a, b) => a.price - b.price);
        } else if (sortOption === 'priceHigh') {
            filteredProducts.sort((a, b) => b.price - a.price);
        } else {
            filteredProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        renderProducts(filteredProducts);
        updateMap(filteredProducts);
    }

    // Fetch products
    async function fetchProducts() {
        try {
            console.log('Fetching products from http://localhost:3001/api/products');
            const response = await fetch('http://localhost:3001/api/products', {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            products = await response.json();
            console.log('Fetched products:', products);
            if (!Array.isArray(products)) {
                throw new Error('Invalid product data: Expected an array');
            }
            // Set default category to 'all'
            document.querySelector('.category-btn[data-category="all"]').classList.add('active');
            filterAndSortProducts();
        } catch (error) {
            console.error('Error fetching products:', error);
            document.getElementById('productContainer').innerHTML = `
                <div class="alert alert-danger">
                    Failed to load products: ${error.message}. Please ensure you're logged in as a buyer and the server is running on port 3001.
                </div>
            `;
        }
    }

    // Initialize category buttons
    document.querySelectorAll('.category-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterAndSortProducts();
        });
    });

    // Initialize search and filter inputs
    document.getElementById('searchInput').addEventListener('input', filterAndSortProducts);
    document.getElementById('sortSelect').addEventListener('change', filterAndSortProducts);
    document.getElementById('maxPrice').addEventListener('input', filterAndSortProducts);
    document.getElementById('filterBtn').addEventListener('click', filterAndSortProducts);

    // Initialize map and fetch products
    initializeMap();
    fetchProducts();
});
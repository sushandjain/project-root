document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('productForm');
    const map = L.map('map').setView([51.505, -0.09], 13);
    let marker;

    // Initialize Leaflet map with OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Set default marker and handle map click to update location
    marker = L.marker([51.505, -0.09]).addTo(map);
    map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        document.getElementById('latitude').value = lat;
        document.getElementById('longitude').value = lng;
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('address').value = data.display_name || 'Address not found';
            })
            .catch(err => {
                console.error('Error fetching address:', err);
                document.getElementById('address').value = 'Address not found';
            });
    });

    // Handle form submission
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        const productName = document.getElementById('productName').value;
        const description = document.getElementById('description').value;
        const quantity = document.getElementById('quantity').value;
        const price = document.getElementById('price').value;
        const harvestDate = document.getElementById('harvestDate').value;
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;
        const address = document.getElementById('address').value;
        const category = document.getElementById('category').value;
        const productImage = document.getElementById('productImage').files[0];

        // Append all form fields to FormData
        formData.append('productName', productName);
        formData.append('description', description);
        formData.append('quantity', quantity);
        formData.append('price', price);
        formData.append('harvestDate', harvestDate);
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
        formData.append('address', address);
        formData.append('category', category);
        if (productImage) {
            formData.append('productImage', productImage);
        }

        try {
            console.log('Submitting form data:', {
                productName, description, quantity, price, harvestDate,
                latitude, longitude, address, category, productImage
            });

            const response = await fetch('http://localhost:3001/api/products', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            alert('Product added successfully!');
            productForm.reset();
            document.getElementById('latitude').value = '';
            document.getElementById('longitude').value = '';
            document.getElementById('address').value = '';
            marker.setLatLng([51.505, -0.09]);
        } catch (error) {
            console.error('Fetch error:', error);
            alert('Error adding product: ' + error.message);
        }
    });
});
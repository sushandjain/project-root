require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRoutes = require('./routes/auth');

// Authenticate user middleware (allows farmer and buyer roles)
const authenticateUser = (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) {
        console.log('No token provided for authenticateUser');
        return res.status(401).json({ error: 'Access denied: No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        if (!['farmer', 'buyer'].includes(decoded.role)) {
            console.log('Invalid role:', decoded.role);
            return res.status(403).json({ error: 'Not authorized: Farmer or Buyer access required' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        console.error('User authentication error:', error.message);
        return res.status(401).json({ error: 'Invalid token: ' + error.message });
    }
};

const app = express();
const defaultPort = process.env.PORT || 3001;
const fallbackPorts = [3002, 3003];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ credentials: true, origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'] }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Serve the Uploads directory
const uploadsPath = path.join(__dirname, '../Uploads');
console.log('Serving Uploads directory from:', uploadsPath);
if (!fs.existsSync(uploadsPath)) {
    console.log('Uploads directory does not exist, creating it...');
    fs.mkdirSync(UploadsPath, { recursive: true });
}
app.use('/Uploads', express.static(uploadsPath));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'q1w2##22',
    database: 'farmers_market'
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database');
    db.query('SELECT 1', (err, results) => {
        if (err) {
            console.error('Initial database test query failed:', err);
        } else {
            console.log('Database test query successful:', results);
        }
    });
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../Uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        if (!file) {
            return cb(null, '');
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }
}).single('productImage');

// JWT Middleware for Admin
const authenticateAdmin = (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) {
        return res.status(401).json({ error: 'Access denied: No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized: Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Admin authentication error:', error.message);
        return res.status(401).json({ error: 'Invalid token: ' + error.message });
    }
};

// JWT Middleware for Farmer
const authenticateFarmer = (req, res, next) => {
    const token = req.cookies.jwt;
    console.log('Farmer authentication - Token received:', token || 'No token');
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ error: 'Access denied: No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        console.log('Token decoded:', decoded);
        if (decoded.role !== 'farmer') {
            console.log('Not a farmer role:', decoded.role);
            return res.status(403).json({ error: 'Not authorized: Farmer access required' });
        }
        req.user = decoded;
        console.log('Farmer authenticated successfully:', req.user);
        next();
    } catch (error) {
        console.error('Farmer authentication error:', error.message);
        return res.status(401).json({ error: 'Invalid token: ' + error.message });
    }
};

// Mount auth routes
app.use('/api/auth', authRoutes);

// Product Routes
app.get('/api/products', authenticateUser, (req, res) => {
    const query = `
        SELECT p.*, f.username as farmer_name, f.email, f.id as farmer_id, f.phone as farmer_phone
        FROM products p
        JOIN farmers f ON p.farmer_id = f.id
        ORDER BY p.created_at DESC
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error querying products:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        console.log('Products fetched:', results);
        const products = results.map(product => {
            const isOutdated = (product.category === 'Fruits' || product.category === 'Vegetables') &&
                product.harvest_date &&
                (new Date() - new Date(product.harvest_date)) / (1000 * 60 * 60 * 24) > 15;
            return {
                id: product.id,
                productName: product.product_name,
                price: product.price,
                quantity: product.quantity,
                description: product.description || '',
                farmerName: product.farmer_name,
                phone: product.farmer_phone || 'N/A',
                email: product.email,
                latitude: product.latitude,
                longitude: product.longitude,
                harvestDate: product.harvest_date ? product.harvest_date.toISOString().split('T')[0] : null,
                imageUrl: product.image_url ? `/Uploads/${product.image_url}` : '/img/placeholder.jpg',
                created_at: product.created_at,
                category: product.category,
                isOutdated: isOutdated
            };
        });
        res.json(products);
    });
});

app.post('/api/products', authenticateFarmer, (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err.message);
            return res.status(400).json({ error: err.message });
        }
        try {
            console.log('Received POST /api/products request:', {
                body: req.body,
                file: req.file ? req.file : 'No file uploaded'
            });

            const {
                productName, description, quantity, price, harvestDate,
                latitude, longitude, address, category
            } = req.body;

            const parsedQuantity = parseFloat(quantity);
            const parsedPrice = parseFloat(price);
            const parsedLatitude = latitude ? parseFloat(latitude) : null;
            const parsedLongitude = longitude ? parseFloat(longitude) : null;

            const imageUrl = req.file ? req.file.filename : null;
            const farmerId = req.user.id;

            console.log('Validating fields:', {
                productName, quantity: parsedQuantity, price: parsedPrice, category,
                harvestDate, latitude: parsedLatitude, longitude: parsedLongitude,
                address, imageUrl, farmerId
            });

            if (!productName || isNaN(parsedQuantity) || isNaN(parsedPrice) || !category) {
                console.log('Validation failed - Missing or invalid required fields:', {
                    productName, quantity: parsedQuantity, price: parsedPrice, category
                });
                return res.status(400).json({ error: 'Missing or invalid required fields: productName, quantity, price, and category must be provided and valid' });
            }

            console.log('Preparing to insert product into database:', {
                farmerId, productName, description, quantity: parsedQuantity, price: parsedPrice,
                harvestDate, latitude: parsedLatitude, longitude: parsedLongitude, address, imageUrl, category
            });

            const query = `
                INSERT INTO products (
                    farmer_id, product_name, description, quantity, price, harvest_date,
                    latitude, longitude, address, image_url, category
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const values = [
                farmerId, productName, description, parsedQuantity, parsedPrice, harvestDate || null,
                parsedLatitude, parsedLongitude, address || null, imageUrl, category
            ];

            console.log('Executing query with values:', values);
            db.query(query, values, (err, result) => {
                if (err) {
                    console.error('Error inserting product into database:', err);
                    return res.status(500).json({ error: 'Database error: ' + err.message });
                }
                console.log('Product inserted successfully, ID:', result.insertId);
                res.status(201).json({
                    id: result.insertId,
                    message: 'Product added successfully'
                });
            });
        } catch (error) {
            console.error('Error processing /api/products request:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    });
});

app.get('/api/products/:id', authenticateUser, (req, res) => {
    const productId = req.params.id;
    const query = `
        SELECT p.*, f.username as farmer_name, f.email, f.phone as farmer_phone
        FROM products p
        JOIN farmers f ON p.farmer_id = f.id
        WHERE p.id = ?
    `;
    db.query(query, [productId], (err, results) => {
        if (err) {
            console.error('Error querying product:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const product = results[0];
        const isOutdated = (product.category === 'Fruits' || product.category === 'Vegetables') &&
            product.harvest_date &&
            (new Date() - new Date(product.harvest_date)) / (1000 * 60 * 60 * 24) > 15;
        res.json({
            id: product.id,
            productName: product.product_name,
            price: product.price,
            quantity: product.quantity,
            description: product.description || '',
            farmerName: product.farmer_name,
            phone: product.farmer_phone || 'N/A',
            email: product.email,
            latitude: product.latitude,
            longitude: product.longitude,
            harvestDate: product.harvest_date ? product.harvest_date.toISOString().split('T')[0] : null,
            imageUrl: product.image_url ? `/Uploads/${product.image_url}` : '/img/placeholder.jpg',
            created_at: product.created_at,
            category: product.category,
            isOutdated: isOutdated
        });
    });
});

app.put('/api/products/:id', authenticateAdmin, (req, res) => {
    const productId = req.params.id;
    const { productName, category, price, quantity } = req.body;
    if (!productName || !category || !price || !quantity) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const query = `
        UPDATE products SET
            product_name = ?,
            category = ?,
            price = ?,
            quantity = ?
        WHERE id = ?
    `;
    const values = [productName, category, price, quantity, productId];
    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error updating product:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product updated successfully' });
    });
});

app.delete('/api/products/:id', authenticateAdmin, (req, res) => {
    const productId = req.params.id;
    db.query('SELECT image_url FROM products WHERE id = ?', [productId], (err, results) => {
        if (err) {
            console.error('Error querying product image:', err);
            return res.status(500).json({ error: 'Database error while fetching image: ' + err.message });
        }
        db.query('DELETE FROM products WHERE id = ?', [productId], (err, result) => {
            if (err) {
                console.error('Error deleting product from database:', err);
                return res.status(500).json({ error: 'Database error while deleting product: ' + err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }
            if (results.length > 0 && results[0].image_url) {
                const imagePath = path.join(__dirname, '../Uploads', results[0].image_url);
                if (fs.existsSync(imagePath)) {
                    try {
                        fs.unlinkSync(imagePath);
                    } catch (err) {
                        console.error('Error deleting image file:', err);
                    }
                }
            }
            res.json({ message: 'Product deleted successfully' });
        });
    });
});

// Admin Authentication Routes
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    db.query('SELECT * FROM admins WHERE username = ? AND role = "admin"', [username], async (err, results) => {
        if (err) {
            console.error('Error querying user:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials: User not found or not an admin' });
        }
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials: Incorrect password' });
        }
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '1h' }
        );
        res.cookie('jwt', token, { httpOnly: true, secure: false, sameSite: 'lax' });
        res.json({ message: 'Login successful' });
    });
});

app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('jwt');
    res.json({ message: 'Logout successful' });
});

app.get('/api/admin/products', authenticateAdmin, (req, res) => {
    const query = `
        SELECT p.*, f.username as farmer_name, f.email, f.phone as farmer_phone
        FROM products p
        JOIN farmers f ON p.farmer_id = f.id
        ORDER BY p.created_at DESC
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error querying products:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        const products = results.map(product => {
            const isOutdated = (product.category === 'Fruits' || product.category === 'Vegetables') &&
                product.harvest_date &&
                (new Date() - new Date(product.harvest_date)) / (1000 * 60 * 60 * 24) > 15;
            return {
                id: product.id,
                productName: product.product_name,
                price: product.price,
                quantity: product.quantity,
                description: product.description || '',
                farmerName: product.farmer_name,
                phone: product.farmer_phone || 'N/A',
                email: product.email,
                imageUrl: product.image_url ? `/Uploads/${product.image_url}` : '/img/placeholder.jpg',
                created_at: product.created_at,
                category: product.category,
                isOutdated: isOutdated
            };
        });
        res.json(products);
    });
});

// Fetch users for admin dashboard
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
    const query = `
        SELECT id, username, email, phone, role
        FROM farmers
        WHERE role IN ('farmer', 'buyer')
        ORDER BY created_at DESC
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error querying users:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        const users = results.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone || 'N/A',
            role: user.role
        }));
        res.json(users);
    });
});

// Update user (Admin)
app.put('/api/admin/users/:id', authenticateAdmin, (req, res) => {
    const userId = req.params.id;
    const { username, email, phone, role } = req.body;

    if (!username || !email || !role) {
        console.log('Missing required fields for user update:', { username, email, role });
        return res.status(400).json({ error: 'Username, email, and role are required' });
    }

    if (!['farmer', 'buyer'].includes(role)) {
        console.log('Invalid role:', role);
        return res.status(400).json({ error: 'Invalid role: Must be farmer or buyer' });
    }

    const query = `
        UPDATE farmers SET
            username = ?,
            email = ?,
            phone = ?,
            role = ?
        WHERE id = ?
    `;
    const values = [username, email, phone || null, role, userId];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error updating user:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Username or email already exists' });
            }
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        if (result.affectedRows === 0) {
            console.log('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        console.log('User updated successfully:', userId);
        res.json({ message: 'User updated successfully' });
    });
});

// Delete user (Admin)
app.delete('/api/admin/users/:id', authenticateAdmin, (req, res) => {
    const userId = req.params.id;

    db.query('DELETE FROM farmers WHERE id = ?', [userId], (err, result) => {
        if (err) {
            console.error('Error deleting user:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        if (result.affectedRows === 0) {
            console.log('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        console.log('User deleted successfully:', userId);
        res.json({ message: 'User deleted successfully' });
    });
});

// Serve static pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/landing.html')));
app.get('/landing.html', (req, res) => res.sendFile(path.join(__dirname, '../public/landing.html')));
app.get('/auth.html', (req, res) => res.sendFile(path.join(__dirname, '../public/auth.html')));
app.get('/index.html', authenticateUser, (req, res) => {
    if (req.user.role === 'buyer') {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    } else {
        res.status(403).json({ error: 'Access denied: Buyers only' });
    }
});
app.get('/add-product', authenticateFarmer, (req, res) => res.sendFile(path.join(__dirname, '../public/add-product.html')));
app.get('/admin-login', (req, res) => res.sendFile(path.join(__dirname, '../public/admin-login.html')));
app.get('/admin', authenticateAdmin, (req, res) => res.sendFile(path.join(__dirname, '../public/admin-dashboard.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, '../public/forgot-password.html')));
app.get('/reset-password', (req, res) => res.sendFile(path.join(__dirname, '../public/reset-password.html')));
app.get('/user-dashboard', authenticateUser, (req, res) => {
    if (['farmer', 'buyer'].includes(req.user.role)) {
        res.sendFile(path.join(__dirname, '../public/user-dashboard.html'));
    } else {
        res.status(403).json({ error: 'Access denied: Farmers or Buyers only' });
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).json({ error: 'Something went wrong: ' + err.message });
});

// Start server with fallback ports
function startServer(portIndex = 0) {
    const port = portIndex === 0 ? defaultPort : fallbackPorts[portIndex - 1];
    const server = app.listen(port, () => {
        console.log(`KHETI-BAZAAR Server running on port ${port}`);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use.`);
            if (portIndex < fallbackPorts.length) {
                console.log(`Trying fallback port ${fallbackPorts[portIndex]}...`);
                startServer(portIndex + 1);
            } else {
                console.error('All fallback ports are in use. Please free up a port or try a different one.');
                console.error('To find the process using port 3001, run:');
                console.error('  netstat -aon | findstr :3001');
                console.error('Then terminate it with:');
                console.error('  taskkill /PID <PID> /F');
                process.exit(1);
            }
        } else {
            console.error('Server error:', err);
            process.exit(1);
        }
    });
}

startServer();
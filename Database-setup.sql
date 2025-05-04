-- Drop the database if it exists to avoid conflicts
DROP DATABASE IF EXISTS farmers_market;

-- Create database
CREATE DATABASE farmers_market;
USE farmers_market;

-- Create farmers table (includes role for farmers and buyers)
CREATE TABLE farmers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    aadhaar VARCHAR(12),
    role ENUM('farmer', 'buyer') NOT NULL DEFAULT 'farmer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farmer_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(10, 2) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    harvest_date DATE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address VARCHAR(255),
    image_url VARCHAR(255),
    category ENUM('Fruits', 'Vegetables', 'Dry Fruits', 'Cereal Crops', 'Pulse Crops', 'Oilseed Crops') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
);

-- Create admins table (renamed from users, for admins only)
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role ENUM('admin') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create reset_tokens table (for farmer and buyer password resets)
CREATE TABLE reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_type ENUM('farmer', 'buyer') NOT NULL,
    token VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token_user_type (token, user_type),
    INDEX idx_user_id_user_type (user_id, user_type)
);

-- Insert admin users into admins table (password: xyz@123, hashed with bcrypt)
INSERT INTO admins (username, email, password_hash, full_name, role) VALUES
('sushan', 'sushan@farmersmarket.com', '$2b$10$Ups7BMX9oSmJ29jzmzS/deOEnbo.NZRmDfC5089ei3yPAMczv//H2', 'Sushan', 'admin'),
('tharun', 'tharun@farmersmarket.com', '$2b$10$Ups7BMX9oSmJ29jzmzS/deOEnbo.NZRmDfC5089ei3yPAMczv//H2', 'Tharun', 'admin'),
('kushanth', 'kushanth@farmersmarket.com', '$2b$10$Ups7BMX9oSmJ29jzmzS/deOEnbo.NZRmDfC5089ei3yPAMczv//H2', 'Kushanth', 'admin'),
('bhavish', 'bhavish@farmersmarket.com', '$2b$10$Ups7BMX9oSmJ29jzmzS/deOEnbo.NZRmDfC5089ei3yPAMczv//H2', 'Bhavish', 'admin')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

-- Insert sample farmer data
INSERT INTO farmers (id, username, email, password_hash, phone, aadhaar, role) VALUES
(1, 'johnsmith', 'john@farmfresh.com', '$2b$10$Ups7BMX9oSmJ29jzmzS/deOEnbo.NZRmDfC5089ei3yPAMczv//H2', '123-456-7890', '123456789012', 'farmer'),
(2, 'sarahj', 'sarah@happyhens.com', '$2b$10$Ups7BMX9oSmJ29jzmzS/deOEnbo.NZRmDfC5089ei3yPAMczv//H2', '987-654-3210', '987654321098', 'farmer'),
(12, 'kushanth M T', 'kushanth.mt@farmersmarket.com', '$2b$10$Ups7BMX9oSmJ29jzmzS/deOEnbo.NZRmDfC5089ei3yPAMczv//H2', '555-555-5555', '123123123123', 'farmer');

-- Insert sample buyer data (in farmers table with role 'buyer')
INSERT INTO farmers (username, email, password_hash, role) VALUES
('maryw', 'mary@greenfields.com', '$2b$10$Ups7BMX9oSmJ29jzmzS/deOEnbo.NZRmDfC5089ei3yPAMczv//H2', 'buyer'),
('robertb', 'robert@wheatfarm.com', '$2b$10$Ups7BMX9oSmJ29jzmzS/deOEnbo.NZRmDfC5089ei3yPAMczv//H2', 'buyer');

-- Insert sample product data (ensuring farmer_id matches farmers table)
INSERT INTO products (
    farmer_id, product_name, description, quantity, price,
    harvest_date, latitude, longitude, address, image_url, category
) VALUES
(1, 'Organic Tomatoes', 'Fresh, vine-ripened organic tomatoes.', 50.00, 3.99, '2025-04-20', 40.7128, -74.0060, '123 Farm Road, Farmville, NY', 'tomatoes.jpg', 'Vegetables'),
(1, 'Red Apples', 'Crisp and sweet red apples.', 30.00, 2.99, '2025-04-18', 40.7138, -74.0070, '124 Farm Road, Farmville, NY', 'apples.jpg', 'Fruits'),
(2, 'Free Range Eggs', 'Farm fresh eggs from free-range chickens.', 120.00, 5.49, '2025-04-25', 40.7282, -73.9942, '456 Country Lane, Eggville, NY', 'eggs.jpg', 'Cereal Crops'),
(2, 'Almonds', 'Premium quality almonds.', 20.00, 2.99, '2025-04-10', 40.7292, -73.9952, '457 Country Lane, Eggville, NY', 'almonds.jpg', 'Dry Fruits');
-- CakeHub Database Schema and Seed Data
-- Online Bakery Ordering System

CREATE DATABASE IF NOT EXISTS `cakehub` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `cakehub`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `role` VARCHAR(20) DEFAULT 'customer',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Products Table
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `description` TEXT,
  `image` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Cart Table
CREATE TABLE IF NOT EXISTS `cart` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_product` (`user_id`, `product_id`),
  KEY `idx_cart_user` (`user_id`),
  KEY `idx_cart_product` (`product_id`),
  CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `customer_name` VARCHAR(100) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `delivery_address` TEXT DEFAULT NULL,
  `delivery_notes` TEXT DEFAULT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `payment_method` VARCHAR(50) DEFAULT 'Cash on Delivery',
  `status` VARCHAR(30) DEFAULT 'Pending',
  `order_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user` (`user_id`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Order Items Table
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `idx_order_items_product` (`product_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Products (Inserted if not already present)
INSERT INTO `products` (`id`, `name`, `category`, `price`, `description`, `image`) VALUES
(1, 'Chocolate Truffle Cake', 'Cakes', 550.00, 'Rich Dutch chocolate sponge layered with luscious dark ganache and velvet glaze.', 'chocolate-cake.jpg'),
(2, 'Red Velvet Romance', 'Cakes', 650.00, 'Soft crimson sponge with genuine Madagascar vanilla cream cheese frosting.', 'red-velvet.jpg'),
(3, 'Black Forest Royale', 'Cakes', 600.00, 'Classic German chocolate cake soaked in cherry syrup with whipped cream.', 'black-forest.jpg'),
(4, 'Triple Chocolate Cookies', 'Cookies', 180.00, 'Freshly baked artisanal cookies packed with Belgian milk and dark chunks.', 'cookies.jpg'),
(5, 'Blueberry Cream Pastry', 'Pastries', 150.00, 'Layers of light puff pastry filled with vanilla custard and wild blueberries.', 'blueberry-pastry.jpg'),
(6, 'Butter Golden Croissant', 'Viennoiseries', 120.00, 'Flaky, buttery French golden croissant with honeycomb layers.', 'croissant.jpg'),
(7, 'Strawberry Shortcake', 'Cakes', 580.00, 'Fluffy sponge cake layered with fresh hand-picked strawberries and chantilly cream.', 'strawberry-shortcake.jpg'),
(8, 'Almond Biscotti Jar', 'Cookies', 210.00, 'Twice-baked crunchy Italian almond biscuits, scented with citrus and spice.', 'almond-biscotti.jpg'),
(9, 'Alphonso Mango Tart', 'Pastries', 175.00, 'Crisp buttery sable tart crust with silky diplomat cream and seasonal mango.', 'mango-tart.jpg'),
(10, 'Pain au Chocolat', 'Viennoiseries', 140.00, 'Laminated buttery viennoiserie pastry folded around two dark chocolate batons.', 'pain-au-chocolat.jpg')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `price`=VALUES(`price`), `description`=VALUES(`description`);

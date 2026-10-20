# BakeHub 🥐 — Connecting People with Bakeries Online

**BakeHub** is a full-stack web application designed with the mission to connect people with local artisanal bakeries through seamless online ordering. Customers can discover freshly baked artisan cakes, warm cookies, delicate pastries, and flaky viennoiseries baked daily with premium ingredients, customized, and delivered directly to their doorstep.

---

## 🚀 Features

- **Connecting People & Local Bakeries**:
  - Live patisserie & bakery menu catalogue categorized by `Cakes`, `Cookies`, `Pastries`, `Viennoiseries`, and `All Treats`.
  - Instant live search and multiple sorting options (Featured/Newest, Price: Low to High, Price: High to Low, Alphabetical A-Z).
  - Product detail modal with real-time portion/quantity selection and descriptions.

- **User Authentication**:
  - Secure customer and admin registration & login using `bcrypt` salted password hashing and `JSON Web Tokens (JWT)`.
  - Session persistence with automated UI state synchronization and profile dropdowns.

- **Interactive Shopping Cart**:
  - Fly-out cart drawer with live quantity adjustments, subtotal calculations, and item removals.
  - Dynamic navbar cart notification badge.

- **Seamless Checkout & Delivery**:
  - Transactional order creation capturing customer delivery addresses, phone numbers, and special delivery notes.
  - Instant Order Confirmation modal featuring generated unique Order Reference IDs.
  - Order History modal with real-time status tracking (`Pending`, `Confirmed`, `Preparing`, `Out for Delivery`, `Delivered`, `Cancelled`).

- **Customer Profile & Management**:
  - Update personal details, contact number, and email.
  - Password management and self-service account deletion.

- **Bakery Administration Portal**:
  - View all customer orders across the platform.
  - Update live order fulfillment status.
  - Add new freshly baked items to the storefront catalogue.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js 5
- **Database**: MySQL (via `mysql2`)
- **Security & Auth**: `bcrypt` (10 salt rounds), `jsonwebtoken` (JWT)
- **Frontend**: Vanilla HTML5, Modern CSS3 (Glassmorphism, CSS Custom Properties, Responsive Layout), Vanilla JavaScript (Modular ES6+)

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- MySQL Server

### 2. Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`):
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=cakehub
JWT_SECRET=bakehub_jwt_super_secret_2026_key
JWT_EXPIRES_IN=24h
```

### 3. Database Setup & Migration
Run the database migration script to verify tables, columns, and seed sample bakery items:
```bash
node database/migrate.js
```

### 4. Running the Application
```bash
# Start server
npm start
```
Open your browser and navigate to: `http://localhost:5000`

### 5. Running Automated Tests
```bash
npm test
```

---

## 📄 License
ISC

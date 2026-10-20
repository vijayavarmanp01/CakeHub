# CakeHub 🍰 — Artisanal Patisserie & Online Bakery

CakeHub is a full-stack e-commerce web application for an artisanal bakery. It features user authentication with JWT, a rich product catalogue with category filters and search, product detail modal previews, an interactive shopping cart, order placement, order tracking/receipt history, profile management, and an administration portal.

---

## 🚀 Features

- **Storefront & Catalogue**:
  - Live catalogue with category filters (`Cakes`, `Cookies`, `Pastries`, `Viennoiseries`, `All Treats`).
  - Instant search and sorting (by newest, price low-to-high, price high-to-low, name A-Z).
  - Detailed product preview modal with quantity adjustments.

- **User Authentication**:
  - Secure registration and login using `bcrypt` password hashing and `JSON Web Tokens (JWT)`.
  - Session persistence with automatic header updates and avatar display.

- **Shopping Cart**:
  - Real-time cart drawer with quantity increment/decrement and individual item removal.
  - Subtotal computation and dynamic badge count.

- **Orders & Checkout**:
  - Transactional order creation with delivery address, phone, and delivery notes.
  - Interactive order confirmation modal with unique order reference.
  - Comprehensive order history with itemized receipts and order status tracking.

- **User Profile & Admin**:
  - Edit personal information, contact number, and update account password.
  - Admin portal for viewing customer orders, managing status, and adding new catalogue products.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js 5
- **Database**: MySQL (via `mysql2`)
- **Authentication**: JSON Web Token (`jsonwebtoken`), `bcrypt`
- **Frontend**: Vanilla HTML5, CSS3 (Modern Glassmorphism & Micro-animations), Vanilla JavaScript

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
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h
```

### 3. Database Setup & Migration
Run the database migration script to ensure the required tables and initial sample bakery treats exist:
```bash
node database/migrate.js
```

### 4. Running the Server
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

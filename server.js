require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const db = require("./config/db");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const ordersRoutes = require("./routes/orders");

const app = express();

// Security and middleware
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// API Routes
app.use("/api", authRoutes);
app.use("/api/auth", authRoutes); // convenient alias
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", ordersRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        appName: "CakeHub Bakery API",
        time: new Date().toISOString()
    });
});

// SPA fallback for non-API GET requests (Express 5 compatible)
app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/")) {
        return res.sendFile(path.join(__dirname, "public", "index.html"));
    }
    next();
});

// Centralized 404 Handler for unmatched API endpoints
app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({
            success: false,
            message: `Endpoint ${req.originalUrl} not found.`
        });
    }
    res.status(404).sendFile(path.join(__dirname, "public", "index.html"));
});

// Centralized Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled server error:", err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "An unexpected server error occurred."
    });
});

const PORT = process.env.PORT || 5000;

// Only start the server when run directly (allows test runner to import app)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🎂 CakeHub server is running smoothly on http://localhost:${PORT}`);
        console.log(`🌐 Open http://localhost:${PORT} in your browser to view the storefront.`);
    });
}

module.exports = app;
const express = require("express");
const db = require("../config/db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// 1. GET ALL PRODUCTS (with search, category, sort)
// ==========================================
router.get("/", (req, res) => {
    const { search, category, sort } = req.query;

    let sql = "SELECT * FROM products WHERE 1=1";
    const params = [];

    if (category && category !== "All") {
        sql += " AND category = ?";
        params.push(category);
    }

    if (search && search.trim() !== "") {
        sql += " AND (name LIKE ? OR description LIKE ?)";
        const searchTerm = `%${search.trim()}%`;
        params.push(searchTerm, searchTerm);
    }

    // Sorting
    if (sort === "price_asc") {
        sql += " ORDER BY price ASC";
    } else if (sort === "price_desc") {
        sql += " ORDER BY price DESC";
    } else if (sort === "name_asc") {
        sql += " ORDER BY name ASC";
    } else {
        sql += " ORDER BY id DESC";
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Fetch products error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch products from catalogue"
            });
        }

        res.json(results);
    });
});

// ==========================================
// 2. GET PRODUCTS BY CATEGORY (Contract preserved)
// ==========================================
router.get("/category/:category", (req, res) => {
    const { category } = req.params;

    const sql = "SELECT * FROM products WHERE category = ? ORDER BY id DESC";

    db.query(sql, [category], (err, results) => {
        if (err) {
            console.error("Category query error:", err);
            return res.status(500).json({
                success: false,
                message: "Database error while fetching category products"
            });
        }

        res.json(results);
    });
});

// ==========================================
// 3. GET SINGLE PRODUCT BY ID
// ==========================================
router.get("/:id", (req, res) => {
    const { id } = req.params;

    // Validate ID is numeric
    if (isNaN(Number(id))) {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID"
        });
    }

    const sql = "SELECT * FROM products WHERE id = ?";

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error("Single product query error:", err);
            return res.status(500).json({
                success: false,
                message: "Database error while loading product"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json(results[0]);
    });
});

// ==========================================
// 4. ADMIN: CREATE PRODUCT
// ==========================================
router.post("/", authenticateToken, requireAdmin, (req, res) => {
    const { name, category, price, description, image } = req.body;

    if (!name || !category || !price) {
        return res.status(400).json({
            success: false,
            message: "Name, category, and price are required."
        });
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
        return res.status(400).json({
            success: false,
            message: "Price must be a valid positive number."
        });
    }

    const sql = `
        INSERT INTO products (name, category, price, description, image)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [name.trim(), category.trim(), numericPrice, description ? description.trim() : null, image ? image.trim() : null],
        (err, result) => {
            if (err) {
                console.error("Create product error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Failed to create product."
                });
            }

            res.status(201).json({
                success: true,
                message: "Product created successfully.",
                productId: result.insertId
            });
        }
    );
});

// ==========================================
// 5. ADMIN: UPDATE PRODUCT
// ==========================================
router.put("/:id", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { name, category, price, description, image } = req.body;

    if (!name || !category || !price) {
        return res.status(400).json({
            success: false,
            message: "Name, category, and price are required."
        });
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
        return res.status(400).json({
            success: false,
            message: "Price must be a valid positive number."
        });
    }

    const sql = `
        UPDATE products
        SET name = ?, category = ?, price = ?, description = ?, image = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [name.trim(), category.trim(), numericPrice, description ? description.trim() : null, image ? image.trim() : null, id],
        (err, result) => {
            if (err) {
                console.error("Update product error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Failed to update product."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found."
                });
            }

            res.json({
                success: true,
                message: "Product updated successfully."
            });
        }
    );
});

// ==========================================
// 6. ADMIN: DELETE PRODUCT
// ==========================================
router.delete("/:id", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM products WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Delete product error:", err);
            return res.status(500).json({
                success: false,
                message: "Cannot delete product because it may be associated with existing orders."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        res.json({
            success: true,
            message: "Product deleted successfully."
        });
    });
});

module.exports = router;
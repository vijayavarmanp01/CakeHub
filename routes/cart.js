const express = require("express");
const db = require("../config/db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// All cart routes require authentication
router.use(authenticateToken);

// ==========================================
// 1. ADD PRODUCT TO CART
// ==========================================
router.post("/", (req, res) => {
    const userId = req.user.id;
    const { product_id, quantity } = req.body;

    const parsedProductId = parseInt(product_id, 10);
    const parsedQuantity = parseInt(quantity, 10) || 1;

    if (!parsedProductId || parsedQuantity < 1) {
        return res.status(400).json({
            success: false,
            message: "Valid product ID and positive quantity are required."
        });
    }

    // Verify product exists in database first
    const checkProductSql = "SELECT id, name, price FROM products WHERE id = ?";
    db.query(checkProductSql, [parsedProductId], (prodErr, prodResults) => {
        if (prodErr) {
            console.error("Check product error:", prodErr);
            return res.status(500).json({
                success: false,
                message: "Database error while verifying product."
            });
        }

        if (prodResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product does not exist or has been removed."
            });
        }

        // Check if item already exists in user's cart
        const checkCartSql = "SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?";
        db.query(checkCartSql, [userId, parsedProductId], (cartErr, cartResults) => {
            if (cartErr) {
                console.error("Cart query error:", cartErr);
                return res.status(500).json({
                    success: false,
                    message: "Database error while checking cart."
                });
            }

            if (cartResults.length > 0) {
                // Item exists: update quantity
                const newQuantity = cartResults[0].quantity + parsedQuantity;
                const updateSql = "UPDATE cart SET quantity = ? WHERE id = ?";

                db.query(updateSql, [newQuantity, cartResults[0].id], (updErr) => {
                    if (updErr) {
                        return res.status(500).json({
                            success: false,
                            message: "Failed to update item quantity in cart."
                        });
                    }

                    res.json({
                        success: true,
                        message: `Updated quantity for ${prodResults[0].name} in your cart.`,
                        quantity: newQuantity
                    });
                });
            } else {
                // Item does not exist: insert into cart
                const insertSql = "INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)";
                db.query(insertSql, [userId, parsedProductId, parsedQuantity], (insErr, insertResult) => {
                    if (insErr) {
                        console.error("Cart insert error:", insErr);
                        return res.status(500).json({
                            success: false,
                            message: "Failed to add item to cart."
                        });
                    }

                    res.status(201).json({
                        success: true,
                        message: `${prodResults[0].name} added to your cart!`,
                        cartId: insertResult.insertId
                    });
                });
            }
        });
    });
});

// ==========================================
// 2. GET USER CART
// ==========================================
router.get("/", (req, res) => {
    const userId = req.user.id;

    const sql = `
        SELECT
            cart.id,
            cart.id AS cart_id,
            cart.product_id,
            cart.quantity,
            products.name,
            products.category,
            products.price,
            products.image,
            CAST(cart.quantity * products.price AS DECIMAL(10,2)) AS subtotal
        FROM cart
        JOIN products ON cart.product_id = products.id
        WHERE cart.user_id = ?
        ORDER BY cart.id DESC
    `;

    db.query(sql, [userId], (err, items) => {
        if (err) {
            console.error("Fetch cart error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch cart items."
            });
        }

        const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

        res.json({
            success: true,
            items,
            totalItems,
            totalAmount: parseFloat(totalAmount.toFixed(2))
        });
    });
});

// ==========================================
// 3. UPDATE CART ITEM QUANTITY
// ==========================================
router.put("/:id", (req, res) => {
    const userId = req.user.id;
    const cartItemId = parseInt(req.params.id, 10);
    const { quantity } = req.body;

    const parsedQuantity = parseInt(quantity, 10);

    if (isNaN(cartItemId) || isNaN(parsedQuantity)) {
        return res.status(400).json({
            success: false,
            message: "Invalid cart item ID or quantity."
        });
    }

    // Verify item belongs to user
    const checkSql = "SELECT id, product_id FROM cart WHERE id = ? AND user_id = ?";
    db.query(checkSql, [cartItemId, userId], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Database error while verifying cart item."
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Cart item not found or does not belong to your account."
            });
        }

        if (parsedQuantity <= 0) {
            // If quantity <= 0, remove the item
            const deleteSql = "DELETE FROM cart WHERE id = ?";
            db.query(deleteSql, [cartItemId], (delErr) => {
                if (delErr) {
                    return res.status(500).json({
                        success: false,
                        message: "Failed to remove item from cart."
                    });
                }
                return res.json({
                    success: true,
                    message: "Item removed from your cart."
                });
            });
        } else {
            const updateSql = "UPDATE cart SET quantity = ? WHERE id = ?";
            db.query(updateSql, [parsedQuantity, cartItemId], (updErr) => {
                if (updErr) {
                    return res.status(500).json({
                        success: false,
                        message: "Failed to update item quantity."
                    });
                }

                res.json({
                    success: true,
                    message: "Cart quantity updated successfully."
                });
            });
        }
    });
});

// ==========================================
// 4. REMOVE SINGLE ITEM FROM CART
// ==========================================
router.delete("/:id", (req, res) => {
    const userId = req.user.id;
    const cartItemId = parseInt(req.params.id, 10);

    if (isNaN(cartItemId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid cart item ID."
        });
    }

    const checkSql = "SELECT id FROM cart WHERE id = ? AND user_id = ?";
    db.query(checkSql, [cartItemId, userId], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Database error while verifying cart item."
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Cart item not found or does not belong to your account."
            });
        }

        const deleteSql = "DELETE FROM cart WHERE id = ?";
        db.query(deleteSql, [cartItemId], (delErr) => {
            if (delErr) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to delete item from cart."
                });
            }

            res.json({
                success: true,
                message: "Item removed from cart."
            });
        });
    });
});

// ==========================================
// 5. CLEAR ENTIRE CART
// ==========================================
router.delete("/", (req, res) => {
    const userId = req.user.id;

    const deleteSql = "DELETE FROM cart WHERE user_id = ?";
    db.query(deleteSql, [userId], (err) => {
        if (err) {
            console.error("Clear cart error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to clear cart."
            });
        }

        res.json({
            success: true,
            message: "Cart cleared successfully."
        });
    });
});

module.exports = router;
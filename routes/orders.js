const express = require("express");
const db = require("../config/db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// 1. PLACE ORDER / CHECKOUT (Transactional)
// ==========================================
router.post("/", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { customer_name, phone, delivery_address, delivery_notes, payment_method } = req.body;

    // Validate delivery details
    if (!customer_name || customer_name.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: "Please provide a valid recipient name (at least 2 characters)."
        });
    }

    if (!phone || phone.trim().length < 7) {
        return res.status(400).json({
            success: false,
            message: "Please provide a valid contact phone number."
        });
    }

    if (!delivery_address || delivery_address.trim().length < 5) {
        return res.status(400).json({
            success: false,
            message: "Please provide a complete delivery address."
        });
    }

    const trimmedName = customer_name.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = delivery_address.trim();
    const trimmedNotes = delivery_notes ? delivery_notes.trim() : null;
    const payment = payment_method && payment_method.trim() !== "" ? payment_method.trim() : "Cash on Delivery";

    let connection;

    try {
        // Obtain connection from pool for transaction
        connection = await db.promise().getConnection();
        await connection.beginTransaction();

        // 1. Fetch user's current cart with real product prices from products table
        const [cartItems] = await connection.query(
            `SELECT
                cart.id AS cart_id,
                cart.product_id,
                cart.quantity,
                products.name AS product_name,
                products.price AS current_price
            FROM cart
            JOIN products ON cart.product_id = products.id
            WHERE cart.user_id = ?`,
            [userId]
        );

        if (cartItems.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Your cart is empty. Add bakery items before checking out!"
            });
        }

        // 2. Compute total amount on server using live DB prices
        let totalAmount = 0;
        for (const item of cartItems) {
            const itemPrice = parseFloat(item.current_price);
            const itemQty = parseInt(item.quantity, 10);
            if (itemQty < 1 || isNaN(itemPrice)) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Invalid product quantity or pricing for ${item.product_name}.`
                });
            }
            totalAmount += itemPrice * itemQty;
        }

        totalAmount = parseFloat(totalAmount.toFixed(2));

        // 3. Create Order
        const [orderResult] = await connection.query(
            `INSERT INTO orders
                (user_id, customer_name, phone, delivery_address, delivery_notes, total_amount, payment_method, status, order_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())`,
            [userId, trimmedName, trimmedPhone, trimmedAddress, trimmedNotes, totalAmount, payment]
        );

        const orderId = orderResult.insertId;

        // 4. Insert each order item with purchase-time price
        for (const item of cartItems) {
            await connection.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price)
                 VALUES (?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, item.current_price]
            );
        }

        // 5. Clear user's cart only after successful order and item creation
        await connection.query(
            `DELETE FROM cart WHERE user_id = ?`,
            [userId]
        );

        // Commit transaction
        await connection.commit();

        res.status(201).json({
            success: true,
            message: "Order placed successfully! We are preparing your fresh treats.",
            order: {
                id: orderId,
                totalAmount,
                status: "Pending",
                itemCount: cartItems.length,
                paymentMethod: payment,
                customerName: trimmedName,
                deliveryAddress: trimmedAddress
            }
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rbErr) {
                console.error("Transaction rollback error:", rbErr);
            }
        }
        console.error("Checkout transaction error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to place your order due to a server error. Please try again."
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// ==========================================
// 2. GET USER'S ORDER HISTORY
// ==========================================
router.get("/", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const [orders] = await db.promise().query(
            `SELECT
                id,
                user_id,
                customer_name,
                phone,
                delivery_address,
                delivery_notes,
                total_amount,
                payment_method,
                status,
                order_date
            FROM orders
            WHERE user_id = ?
            ORDER BY order_date DESC, id DESC`,
            [userId]
        );

        // Fetch items for each order
        for (const order of orders) {
            const [items] = await db.promise().query(
                `SELECT
                    oi.id,
                    oi.product_id,
                    oi.quantity,
                    oi.price,
                    p.name,
                    p.category,
                    p.image,
                    CAST(oi.quantity * oi.price AS DECIMAL(10,2)) AS subtotal
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
        }

        res.json({
            success: true,
            orders
        });
    } catch (error) {
        console.error("Fetch orders error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve order history."
        });
    }
});

// ==========================================
// 3. GET SINGLE ORDER DETAILS
// ==========================================
router.get("/:id", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const orderId = parseInt(req.params.id, 10);

    if (isNaN(orderId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid order ID."
        });
    }

    try {
        const [orders] = await db.promise().query(
            `SELECT * FROM orders WHERE id = ?`,
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        const order = orders[0];

        // Ensure user can access only their own order unless they are an admin
        if (order.user_id !== userId && userRole !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not have permission to view this order."
            });
        }

        // Fetch order items with purchase-time price
        const [items] = await db.promise().query(
            `SELECT
                oi.id,
                oi.product_id,
                oi.quantity,
                oi.price,
                p.name,
                p.category,
                p.image,
                CAST(oi.quantity * oi.price AS DECIMAL(10,2)) AS subtotal
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?`,
            [orderId]
        );

        order.items = items;

        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error("Fetch order detail error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load order details."
        });
    }
});

// ==========================================
// 4. CANCEL ORDER (Customer action on Pending orders)
// ==========================================
router.put("/:id/cancel", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const orderId = parseInt(req.params.id, 10);

    if (isNaN(orderId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid order ID."
        });
    }

    try {
        const [orders] = await db.promise().query(
            "SELECT id, user_id, status FROM orders WHERE id = ?",
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        const order = orders[0];
        if (order.user_id !== userId && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        if (order.status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: `Order cannot be cancelled because it is already '${order.status}'.`
            });
        }

        await db.promise().query(
            "UPDATE orders SET status = 'Cancelled' WHERE id = ?",
            [orderId]
        );

        res.json({
            success: true,
            message: "Order has been successfully cancelled."
        });
    } catch (error) {
        console.error("Cancel order error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to cancel order."
        });
    }
});

// ==========================================
// 5. ADMIN: GET ALL ORDERS
// ==========================================
router.get("/admin/all", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [orders] = await db.promise().query(
            `SELECT
                o.*,
                u.name AS user_account_name,
                u.email AS user_account_email
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.order_date DESC, o.id DESC`
        );

        for (const order of orders) {
            const [items] = await db.promise().query(
                `SELECT
                    oi.id,
                    oi.product_id,
                    oi.quantity,
                    oi.price,
                    p.name,
                    p.image,
                    CAST(oi.quantity * oi.price AS DECIMAL(10,2)) AS subtotal
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
        }

        res.json({
            success: true,
            orders
        });
    } catch (error) {
        console.error("Admin fetch orders error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch orders."
        });
    }
});

// ==========================================
// 6. ADMIN: UPDATE ORDER STATUS
// ==========================================
router.put("/:id/status", authenticateToken, requireAdmin, async (req, res) => {
    const orderId = parseInt(req.params.id, 10);
    const { status } = req.body;

    const allowedStatuses = ["Pending", "Confirmed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"];
    if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}`
        });
    }

    try {
        const [result] = await db.promise().query(
            "UPDATE orders SET status = ? WHERE id = ?",
            [status, orderId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        res.json({
            success: true,
            message: `Order #${orderId} status updated to '${status}'.`
        });
    } catch (error) {
        console.error("Update order status error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update order status."
        });
    }
});

module.exports = router;

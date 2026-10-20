const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "cakehub_patisserie_jwt_super_secret_2026_key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// Helper: Validate email format
const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

// ==========================================
// 1. REGISTER
// ==========================================
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required."
            });
        }

        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPhone = phone ? phone.trim() : null;

        if (trimmedName.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Name must be at least 2 characters long."
            });
        }

        if (!isValidEmail(trimmedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long."
            });
        }

        // Check if email already exists
        const checkSql = "SELECT id FROM users WHERE email = ?";
        db.query(checkSql, [trimmedEmail], async (err, results) => {
            if (err) {
                console.error("Register check error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Database error while verifying email."
                });
            }

            if (results.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Email is already registered. Please sign in instead."
                });
            }

            // Hash password with bcrypt
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const insertSql = `
                INSERT INTO users (name, email, password, phone, role)
                VALUES (?, ?, ?, ?, 'customer')
            `;

            db.query(insertSql, [trimmedName, trimmedEmail, hashedPassword, trimmedPhone], (insertErr, result) => {
                if (insertErr) {
                    console.error("User insertion error:", insertErr);
                    return res.status(500).json({
                        success: false,
                        message: "Failed to create user account. Please try again."
                    });
                }

                // Generate token so the user is immediately logged in upon registration
                const token = jwt.sign(
                    {
                        id: result.insertId,
                        email: trimmedEmail,
                        role: "customer"
                    },
                    JWT_SECRET,
                    { expiresIn: JWT_EXPIRES_IN }
                );

                res.status(201).json({
                    success: true,
                    message: "Registration successful! Welcome to BakeHub.",
                    token,
                    user: {
                        id: result.insertId,
                        name: trimmedName,
                        email: trimmedEmail,
                        phone: trimmedPhone,
                        role: "customer"
                    }
                });
            });
        });

    } catch (error) {
        console.error("Register server error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later."
        });
    }
});

// ==========================================
// 2. LOGIN
// ==========================================
router.post("/login", (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const trimmedEmail = email.trim().toLowerCase();
        const sql = "SELECT id, name, email, password, phone, role FROM users WHERE email = ?";

        db.query(sql, [trimmedEmail], async (err, results) => {
            if (err) {
                console.error("Login query error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Database error during login."
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password."
                });
            }

            const user = results[0];
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password."
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role || "customer"
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            // Respond without password hash
            res.json({
                success: true,
                message: "Login successful! Welcome back.",
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role || "customer"
                }
            });
        });

    } catch (error) {
        console.error("Login server error:", error);
        res.status(500).json({
            success: false,
            message: "Server error occurred during login."
        });
    }
});

// ==========================================
// 3. GET PROFILE
// ==========================================
router.get("/profile", authenticateToken, (req, res) => {
    const userId = req.user.id;
    const sql = "SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?";

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Get profile error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to load profile details."
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User account not found."
            });
        }

        res.json({
            success: true,
            user: results[0]
        });
    });
});

// ==========================================
// 4. UPDATE PROFILE (Name, Phone, Email)
// ==========================================
router.put("/profile", authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { name, phone, email } = req.body;

    if (!name || name.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: "Name must be at least 2 characters long."
        });
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone ? phone.trim() : null;

    // Check if user is updating email
    if (email) {
        const trimmedEmail = email.trim().toLowerCase();
        if (!isValidEmail(trimmedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        // Check if email taken by someone else
        const checkSql = "SELECT id FROM users WHERE email = ? AND id != ?";
        db.query(checkSql, [trimmedEmail, userId], (checkErr, results) => {
            if (checkErr) {
                return res.status(500).json({
                    success: false,
                    message: "Database error while checking email."
                });
            }

            if (results.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Email address is already in use by another account."
                });
            }

            const updateSql = "UPDATE users SET name = ?, phone = ?, email = ? WHERE id = ?";
            db.query(updateSql, [trimmedName, trimmedPhone, trimmedEmail, userId], (updErr) => {
                if (updErr) {
                    return res.status(500).json({
                        success: false,
                        message: "Failed to update profile."
                    });
                }

                // Return updated user data
                res.json({
                    success: true,
                    message: "Profile updated successfully.",
                    user: {
                        id: userId,
                        name: trimmedName,
                        email: trimmedEmail,
                        phone: trimmedPhone
                    }
                });
            });
        });
    } else {
        const updateSql = "UPDATE users SET name = ?, phone = ? WHERE id = ?";
        db.query(updateSql, [trimmedName, trimmedPhone, userId], (updErr) => {
            if (updErr) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to update profile."
                });
            }

            res.json({
                success: true,
                message: "Profile updated successfully.",
                user: {
                    id: userId,
                    name: trimmedName,
                    phone: trimmedPhone
                }
            });
        });
    }
});

// ==========================================
// 5. UPDATE PASSWORD
// ==========================================
router.put("/profile/password", authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: "Both current password and new password are required."
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: "New password must be at least 6 characters long."
        });
    }

    // Retrieve current password hash
    const sql = "SELECT password FROM users WHERE id = ?";
    db.query(sql, [userId], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).json({
                success: false,
                message: "Database error while verifying account."
            });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Incorrect current password."
            });
        }

        const newHashed = await bcrypt.hash(newPassword, 10);
        const updateSql = "UPDATE users SET password = ? WHERE id = ?";
        db.query(updateSql, [newHashed, userId], (updErr) => {
            if (updErr) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to update password."
                });
            }

            res.json({
                success: true,
                message: "Password changed successfully! Please use your new password next time."
            });
        });
    });
});

// ==========================================
// 6. DELETE PROFILE
// ==========================================
router.delete("/profile", authenticateToken, (req, res) => {
    const userId = req.user.id;

    const deleteSql = "DELETE FROM users WHERE id = ?";
    db.query(deleteSql, [userId], (err, result) => {
        if (err) {
            console.error("Account deletion error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to delete account. Please try again."
            });
        }

        res.json({
            success: true,
            message: "Your account and associated cart data have been deleted successfully."
        });
    });
});

module.exports = router;

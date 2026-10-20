const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "cakehub_patisserie_jwt_super_secret_2026_key";

/**
 * Middleware to authenticate requests via JWT Bearer token
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Access token required. Please log in."
        });
    }

    const parts = authHeader.split(" ");
    const token = parts.length === 2 && parts[0].toLowerCase() === "bearer" ? parts[1] : authHeader;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Malformed token. Please log in again."
        });
    }

    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: "Session expired or invalid token. Please log in again."
            });
        }

        req.user = decodedUser;
        next();
    });
};

/**
 * Middleware to enforce admin privileges
 */
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Administrator access required."
        });
    }
    next();
};

authenticateToken.authenticateToken = authenticateToken;
authenticateToken.requireAdmin = requireAdmin;

module.exports = authenticateToken;
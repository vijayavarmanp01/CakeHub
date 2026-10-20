/**
 * BakeHub Automated Test Suite
 * Tests all backend REST APIs, authentication, transactions, and edge cases
 */
require("dotenv").config();
const http = require("http");
const app = require("../server");

const PORT = 5099; // Isolated test port
let server;

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: "localhost",
            port: PORT,
            path,
            method,
            headers: {
                "Content-Type": "application/json"
            }
        };

        if (token) {
            options.headers["Authorization"] = `Bearer ${token}`;
        }
        if (payload) {
            options.headers["Content-Length"] = Buffer.byteLength(payload);
        }

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    parsed = data;
                }
                resolve({ status: res.statusCode, headers: res.headers, body: parsed });
            });
        });

        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log("==================================================");
    console.log("🧪 STARTING BAKEHUB AUTOMATED TEST SUITE");
    console.log("==================================================\n");

    let passed = 0;
    let failed = 0;

    function assert(condition, testName, details = "") {
        if (condition) {
            console.log(`✅ PASS: ${testName}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${testName}`);
            if (details) console.error(`   Details:`, details);
            failed++;
        }
    }

    // Start isolated test server
    await new Promise((resolve) => {
        server = app.listen(PORT, () => {
            console.log(`🚀 Test server listening on http://localhost:${PORT}\n`);
            resolve();
        });
    });

    try {
        // ----------------------------------------------------
        // 1. Health check & Server startup
        // ----------------------------------------------------
        const health = await request("GET", "/api/health");
        assert(health.status === 200 && health.body.status === "OK", "Server startup & Health endpoint");

        // ----------------------------------------------------
        // 2. Product catalogue listing & categories
        // ----------------------------------------------------
        const productsRes = await request("GET", "/api/products");
        assert(productsRes.status === 200 && Array.isArray(productsRes.body) && productsRes.body.length > 0, "Fetch all products");

        const firstProduct = productsRes.body[0];
        const singleProduct = await request("GET", `/api/products/${firstProduct.id}`);
        assert(singleProduct.status === 200 && singleProduct.body.id === firstProduct.id, "Fetch single product by ID");

        const categoryRes = await request("GET", "/api/products/category/Cakes");
        assert(categoryRes.status === 200 && Array.isArray(categoryRes.body) && categoryRes.body.every(p => p.category === "Cakes"), "Filter products by category");

        const invalidProduct = await request("GET", "/api/products/999999");
        assert(invalidProduct.status === 404, "Invalid product ID returns 404");

        // ----------------------------------------------------
        // 3. User Registration
        // ----------------------------------------------------
        const uniqueEmail = `testuser_${Date.now()}@example.com`;
        const regRes = await request("POST", "/api/register", {
            name: "Test Baker",
            email: uniqueEmail,
            password: "password123",
            phone: "9876543210"
        });
        assert(regRes.status === 201 && regRes.body.token && regRes.body.user.email === uniqueEmail, "User registration with bcrypt hash");

        const testToken = regRes.body.token;
        const testUser = regRes.body.user;

        // Duplicate registration
        const dupRes = await request("POST", "/api/register", {
            name: "Test Baker Duplicate",
            email: uniqueEmail,
            password: "password123"
        });
        assert(dupRes.status === 409, "Duplicate email registration rejected with 409");

        // ----------------------------------------------------
        // 4. User Login
        // ----------------------------------------------------
        const loginRes = await request("POST", "/api/login", {
            email: uniqueEmail,
            password: "password123"
        });
        assert(loginRes.status === 200 && loginRes.body.token && !loginRes.body.user.password, "Login with valid credentials returns JWT & hides password");

        const badLogin = await request("POST", "/api/login", {
            email: uniqueEmail,
            password: "wrongpassword"
        });
        assert(badLogin.status === 401, "Login with incorrect password rejected with 401");

        // ----------------------------------------------------
        // 5. Auth Middleware Protection
        // ----------------------------------------------------
        const noAuthCart = await request("GET", "/api/cart");
        assert(noAuthCart.status === 401, "Cart endpoint without token rejected with 401");

        const badTokenCart = await request("GET", "/api/cart", null, "invalid_jwt_token_string");
        assert(badTokenCart.status === 403, "Cart endpoint with invalid token rejected with 403");

        // ----------------------------------------------------
        // 6. Shopping Cart Operations
        // ----------------------------------------------------
        // Initially empty
        const initialCart = await request("GET", "/api/cart", null, testToken);
        assert(initialCart.status === 200 && initialCart.body.items.length === 0, "Cart is initially empty");

        // Add product to cart
        const addCartRes = await request("POST", "/api/cart", { product_id: firstProduct.id, quantity: 2 }, testToken);
        assert(addCartRes.status === 201 && addCartRes.body.success, "Add product to cart");

        // Add same product again (increments quantity)
        const addSameRes = await request("POST", "/api/cart", { product_id: firstProduct.id, quantity: 1 }, testToken);
        assert(addSameRes.status === 200 && addSameRes.body.quantity === 3, "Adding existing product increments quantity");

        // Verify cart state
        const updatedCart = await request("GET", "/api/cart", null, testToken);
        assert(updatedCart.status === 200 && updatedCart.body.totalItems === 3, "Cart reflects correct updated quantity");
        const cartItemId = updatedCart.body.items[0].id;

        // Update cart item quantity
        const updateQtyRes = await request("PUT", `/api/cart/${cartItemId}`, { quantity: 1 }, testToken);
        assert(updateQtyRes.status === 200, "Update cart quantity directly");

        // ----------------------------------------------------
        // 7. Isolation Between Users
        // ----------------------------------------------------
        const user2Email = `testuser2_${Date.now()}@example.com`;
        const regUser2 = await request("POST", "/api/register", {
            name: "Other User",
            email: user2Email,
            password: "password123"
        });
        const user2Token = regUser2.body.token;

        // User 2 cart must be empty
        const user2Cart = await request("GET", "/api/cart", null, user2Token);
        assert(user2Cart.status === 200 && user2Cart.body.items.length === 0, "User 2 cannot see User 1 cart");

        // User 2 cannot modify User 1 cart item
        const hackCart = await request("PUT", `/api/cart/${cartItemId}`, { quantity: 99 }, user2Token);
        assert(hackCart.status === 404, "User 2 cannot update User 1 cart item");

        // ----------------------------------------------------
        // 8. Transactional Checkout & Order Creation
        // ----------------------------------------------------
        const checkoutRes = await request("POST", "/api/orders", {
            customer_name: "Test Baker Recipient",
            phone: "9876543210",
            delivery_address: "123 Patisserie Blvd, Suite 4",
            delivery_notes: "Leave at front desk",
            payment_method: "Cash on Delivery"
        }, testToken);
        assert(checkoutRes.status === 201 && checkoutRes.body.success && checkoutRes.body.order.id, "Transactional checkout creates order");

        const orderId = checkoutRes.body.order.id;

        // Cart must be cleared after checkout
        const postCheckoutCart = await request("GET", "/api/cart", null, testToken);
        assert(postCheckoutCart.status === 200 && postCheckoutCart.body.items.length === 0, "User cart cleared after successful checkout");

        // ----------------------------------------------------
        // 9. Order History & Order Details Ownership
        // ----------------------------------------------------
        const ordersRes = await request("GET", "/api/orders", null, testToken);
        assert(ordersRes.status === 200 && ordersRes.body.orders.length > 0 && ordersRes.body.orders[0].id === orderId, "User can view own order history");

        const singleOrder = await request("GET", `/api/orders/${orderId}`, null, testToken);
        assert(singleOrder.status === 200 && singleOrder.body.order.items.length > 0, "View order details with order items");

        // User 2 cannot access User 1 order
        const hackOrder = await request("GET", `/api/orders/${orderId}`, null, user2Token);
        assert(hackOrder.status === 403, "User 2 cannot access User 1 order details");

        // ----------------------------------------------------
        // 10. Order Cancellation
        // ----------------------------------------------------
        const cancelRes = await request("PUT", `/api/orders/${orderId}/cancel`, {}, testToken);
        assert(cancelRes.status === 200 && cancelRes.body.success, "User can cancel Pending order");

        // ----------------------------------------------------
        // 11. Profile Update & Password Change
        // ----------------------------------------------------
        const profileGet = await request("GET", "/api/profile", null, testToken);
        assert(profileGet.status === 200 && profileGet.body.user.email === uniqueEmail, "Retrieve user profile");

        const updateProf = await request("PUT", "/api/profile", {
            name: "Updated Baker Name",
            phone: "9998887776"
        }, testToken);
        assert(updateProf.status === 200 && updateProf.body.user.name === "Updated Baker Name", "Update user profile name & phone");

        const changePw = await request("PUT", "/api/profile/password", {
            currentPassword: "password123",
            newPassword: "newpassword456"
        }, testToken);
        assert(changePw.status === 200, "Change password with valid current password");

        // Verify login with new password
        const newLogin = await request("POST", "/api/login", {
            email: uniqueEmail,
            password: "newpassword456"
        });
        assert(newLogin.status === 200 && newLogin.body.token, "Login succeeds with new password");

        // ----------------------------------------------------
        // 12. Account Deletion
        // ----------------------------------------------------
        const deleteProf = await request("DELETE", "/api/profile", null, testToken);
        assert(deleteProf.status === 200, "Delete user account");

        // Verify user is gone
        const deletedLogin = await request("POST", "/api/login", {
            email: uniqueEmail,
            password: "newpassword456"
        });
        assert(deletedLogin.status === 401, "Deleted user cannot log in");

        // Clean up user 2
        await request("DELETE", "/api/profile", null, user2Token);

    } catch (err) {
        console.error("Test execution exception:", err);
        failed++;
    } finally {
        if (server) {
            server.close();
        }
        console.log("\n==================================================");
        console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
        console.log("==================================================");
        process.exit(failed > 0 ? 1 : 0);
    }
}

runTests();

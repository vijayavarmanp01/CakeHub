/**
 * CakeHub — Patisserie & Bakery Frontend Application
 * Pure Vanilla JavaScript Client
 */

// ==========================================
// STATE MANAGEMENT
// ==========================================
const AppState = {
    token: localStorage.getItem("cakehub_token") || null,
    user: JSON.parse(localStorage.getItem("cakehub_user") || "null"),
    products: [],
    cart: { items: [], totalItems: 0, totalAmount: 0 },
    activeCategory: "All",
    searchQuery: "",
    sortBy: "newest",
    currentProductDetail: null
};

// ==========================================
// API HELPER
// ==========================================
async function apiCall(endpoint, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (AppState.token) {
        headers["Authorization"] = `Bearer ${AppState.token}`;
    }

    try {
        const response = await fetch(endpoint, {
            ...options,
            headers
        });

        const data = await response.json();

        // Handle expired token or unauthorized access
        if ((response.status === 401 || response.status === 403) && AppState.token) {
            showToast("Your session has expired or is invalid. Please sign in again.", "info");
            handleLogout(false);
            openAuthModal("login");
            return { success: false, message: "Unauthorized or session expired", ok: false, status: response.status };
        }

        // Preserve Array prototype and length for array responses (such as /api/products)
        if (Array.isArray(data)) {
            data.ok = response.ok;
            data.status = response.status;
            return data;
        }

        return { ...data, status: response.status, ok: response.ok };
    } catch (error) {
        console.error("Network or API error:", error);
        return { success: false, message: "Network connection error. Please try again.", ok: false, status: 0 };
    }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let icon = "fa-info-circle";
    if (type === "success") icon = "fa-check-circle";
    if (type === "error") icon = "fa-exclamation-circle";

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3800);
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ==========================================
// MODAL CONTROLS
// ==========================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }
}

function toggleCartDrawer(show) {
    const drawerOverlay = document.getElementById("cart-drawer-overlay");
    if (!drawerOverlay) return;

    if (show === undefined) {
        drawerOverlay.classList.toggle("active");
    } else if (show) {
        drawerOverlay.classList.add("active");
    } else {
        drawerOverlay.classList.remove("active");
    }
}

// Close modals when clicking backdrop
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) {
        e.target.classList.remove("active");
        document.body.style.overflow = "";
    }
    if (e.target.classList.contains("cart-drawer-overlay")) {
        toggleCartDrawer(false);
    }
    // Close user dropdown if clicked outside
    const userMenu = document.getElementById("user-dropdown-menu");
    const avatarBtn = document.getElementById("user-avatar-btn");
    if (userMenu && !userMenu.contains(e.target) && avatarBtn && !avatarBtn.contains(e.target)) {
        userMenu.classList.remove("show");
    }
});

// ==========================================
// AUTHENTICATION & SESSION
// ==========================================
function updateAuthUI() {
    const authActions = document.getElementById("nav-auth-actions");
    const userDropdownWrapper = document.getElementById("nav-user-wrapper");
    const adminLink = document.getElementById("admin-nav-item");

    if (AppState.token && AppState.user) {
        if (authActions) authActions.style.display = "none";
        if (userDropdownWrapper) {
            userDropdownWrapper.style.display = "block";
            const nameEl = document.getElementById("user-display-name");
            const avatarInitial = document.getElementById("user-avatar-initial");
            const dropdownName = document.getElementById("dropdown-name");
            const dropdownEmail = document.getElementById("dropdown-email");

            if (nameEl) nameEl.textContent = AppState.user.name.split(" ")[0];
            if (avatarInitial) avatarInitial.textContent = AppState.user.name.charAt(0).toUpperCase();
            if (dropdownName) dropdownName.textContent = AppState.user.name;
            if (dropdownEmail) dropdownEmail.textContent = AppState.user.email;
        }

        if (adminLink) {
            adminLink.style.display = AppState.user.role === "admin" ? "flex" : "none";
        }
    } else {
        if (authActions) authActions.style.display = "flex";
        if (userDropdownWrapper) userDropdownWrapper.style.display = "none";
        if (adminLink) adminLink.style.display = "none";
    }
}

function openAuthModal(mode = "login") {
    switchAuthTab(mode);
    openModal("auth-modal");
}

function switchAuthTab(tab) {
    const loginTab = document.getElementById("tab-login-btn");
    const registerTab = document.getElementById("tab-register-btn");
    const loginForm = document.getElementById("form-login");
    const registerForm = document.getElementById("form-register");
    const authTitle = document.getElementById("auth-modal-title");

    if (tab === "login") {
        loginTab.classList.add("active");
        registerTab.classList.remove("active");
        loginForm.style.display = "block";
        registerForm.style.display = "none";
        authTitle.textContent = "Welcome Back to CakeHub";
    } else {
        registerTab.classList.add("active");
        loginTab.classList.remove("active");
        registerForm.style.display = "block";
        loginForm.style.display = "none";
        authTitle.textContent = "Create Your CakeHub Account";
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const submitBtn = document.getElementById("login-submit-btn");

    if (!email || !password) {
        showToast("Please enter both email and password.", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Signing in...`;

    const res = await apiCall("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });

    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Sign In</span> <i class="fas fa-arrow-right"></i>`;

    if (res.ok && res.token) {
        AppState.token = res.token;
        AppState.user = res.user;
        localStorage.setItem("cakehub_token", res.token);
        localStorage.setItem("cakehub_user", JSON.stringify(res.user));

        showToast(res.message || "Welcome back!", "success");
        closeModal("auth-modal");
        updateAuthUI();
        loadCart();
    } else {
        showToast(res.message || "Login failed. Please check your credentials.", "error");
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const phone = document.getElementById("reg-phone").value.trim();
    const password = document.getElementById("reg-password").value;
    const confirmPassword = document.getElementById("reg-confirm-password").value;
    const submitBtn = document.getElementById("register-submit-btn");

    if (!name || !email || !password) {
        showToast("Please fill in all required fields.", "error");
        return;
    }

    if (password.length < 6) {
        showToast("Password must be at least 6 characters.", "error");
        return;
    }

    if (password !== confirmPassword) {
        showToast("Passwords do not match.", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creating account...`;

    const res = await apiCall("/api/register", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, password })
    });

    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Create Account</span> <i class="fas fa-arrow-right"></i>`;

    if (res.ok && res.token) {
        AppState.token = res.token;
        AppState.user = res.user;
        localStorage.setItem("cakehub_token", res.token);
        localStorage.setItem("cakehub_user", JSON.stringify(res.user));

        showToast(res.message || "Registration successful!", "success");
        closeModal("auth-modal");
        updateAuthUI();
        loadCart();
    } else {
        showToast(res.message || "Registration failed.", "error");
    }
}

function handleLogout(showNotification = true) {
    AppState.token = null;
    AppState.user = null;
    AppState.cart = { items: [], totalItems: 0, totalAmount: 0 };
    localStorage.removeItem("cakehub_token");
    localStorage.removeItem("cakehub_user");

    updateAuthUI();
    updateCartUI();

    const userMenu = document.getElementById("user-dropdown-menu");
    if (userMenu) userMenu.classList.remove("show");

    if (showNotification) {
        showToast("You have been signed out successfully.", "info");
    }
}

// ==========================================
// PRODUCTS CATALOGUE
// ==========================================
async function loadProducts() {
    const grid = document.getElementById("products-grid");
    if (!grid) return;

    grid.innerHTML = `
        <div class="state-loading">
            <div class="spinner"></div>
            <p>Gathering fresh bakery creations...</p>
        </div>
    `;

    let url = `/api/products?sort=${encodeURIComponent(AppState.sortBy)}`;
    if (AppState.activeCategory && AppState.activeCategory !== "All") {
        url += `&category=${encodeURIComponent(AppState.activeCategory)}`;
    }
    if (AppState.searchQuery) {
        url += `&search=${encodeURIComponent(AppState.searchQuery)}`;
    }

    const res = await apiCall(url);

    if (Array.isArray(res)) {
        AppState.products = res;
        renderProducts(res);
    } else {
        grid.innerHTML = `
            <div class="state-error">
                <i class="fas fa-exclamation-triangle state-icon"></i>
                <h3 class="state-title">Unable to Load Catalogue</h3>
                <p>${escapeHtml(res.message || "Please check your database connection.")}</p>
                <button class="btn btn-outline btn-sm" onclick="loadProducts()" style="margin-top:1rem;">Retry</button>
            </div>
        `;
    }
}

function renderProducts(products) {
    const grid = document.getElementById("products-grid");
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `
            <div class="state-empty">
                <i class="fas fa-cookie-bite state-icon"></i>
                <h3 class="state-title">No Bakery Treats Found</h3>
                <p>No products match "${escapeHtml(AppState.searchQuery || AppState.activeCategory)}". Try clearing your search or filter.</p>
                <button class="btn btn-outline btn-sm" onclick="resetFilters()" style="margin-top:1rem;">View All Treats</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = products.map(product => {
        const imagePath = `images/${product.image || 'chocolate-cake.jpg'}`;
        return `
            <article class="product-card" data-id="${product.id}">
                <div class="product-image-wrap" onclick="viewProductDetail(${product.id})">
                    <span class="product-category-tag">${escapeHtml(product.category)}</span>
                    <img src="${imagePath}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null; this.src='images/chocolate-cake.jpg';" loading="lazy">
                </div>
                <div class="product-body">
                    <h3 class="product-title" onclick="viewProductDetail(${product.id})">${escapeHtml(product.name)}</h3>
                    <p class="product-desc">${escapeHtml(product.description || 'Artisanal treat baked fresh with finest ingredients.')}</p>
                    <div class="product-footer">
                        <span class="product-price">${formatCurrency(product.price)}</span>
                        <button class="btn-add-cart" id="btn-add-${product.id}" onclick="handleAddToCart(${product.id}, 1)">
                            <i class="fas fa-plus"></i> Add
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

function resetFilters() {
    AppState.activeCategory = "All";
    AppState.searchQuery = "";
    AppState.sortBy = "newest";

    const searchInput = document.getElementById("catalogue-search");
    if (searchInput) searchInput.value = "";

    const sortSelect = document.getElementById("catalogue-sort");
    if (sortSelect) sortSelect.value = "newest";

    document.querySelectorAll(".cat-pill").forEach(pill => {
        pill.classList.toggle("active", pill.dataset.category === "All");
    });

    loadProducts();
}

function selectCategory(category) {
    AppState.activeCategory = category || "All";
    document.querySelectorAll(".cat-pill").forEach(pill => {
        pill.classList.toggle("active", (pill.dataset.category || "All") === AppState.activeCategory);
    });
    const catalogueEl = document.getElementById("categories");
    if (catalogueEl) {
        catalogueEl.scrollIntoView({ behavior: "smooth" });
    }
    loadProducts();
}

function viewProductDetail(productId) {
    const product = AppState.products.find(p => p.id === productId);
    if (!product) return;

    AppState.currentProductDetail = product;

    const modal = document.getElementById("product-detail-modal");
    if (!modal) return;

    document.getElementById("detail-image").src = `images/${product.image || 'chocolate-cake.jpg'}`;
    document.getElementById("detail-image").onerror = function() { this.src = 'images/chocolate-cake.jpg'; };
    document.getElementById("detail-category").textContent = product.category;
    document.getElementById("detail-title").textContent = product.name;
    document.getElementById("detail-price").textContent = formatCurrency(product.price);
    document.getElementById("detail-description").textContent = product.description || "Baked freshly every morning by our pastry chefs using gourmet ingredients.";
    document.getElementById("detail-qty").value = "1";

    openModal("product-detail-modal");
}

function adjustDetailQty(delta) {
    const qtyInput = document.getElementById("detail-qty");
    let current = parseInt(qtyInput.value, 10) || 1;
    current = Math.max(1, current + delta);
    qtyInput.value = current;
}

function addDetailToCart() {
    if (!AppState.currentProductDetail) return;
    const qty = parseInt(document.getElementById("detail-qty").value, 10) || 1;
    handleAddToCart(AppState.currentProductDetail.id, qty);
    closeModal("product-detail-modal");
}

// ==========================================
// SHOPPING CART
// ==========================================
async function loadCart() {
    if (!AppState.token) {
        AppState.cart = { items: [], totalItems: 0, totalAmount: 0 };
        updateCartUI();
        return;
    }

    const res = await apiCall("/api/cart");
    if (res.ok && res.success) {
        AppState.cart = {
            items: res.items || [],
            totalItems: res.totalItems || 0,
            totalAmount: res.totalAmount || 0
        };
        updateCartUI();
    }
}

async function handleAddToCart(productId, quantity = 1) {
    if (!AppState.token) {
        showToast("Please sign in to add delicious treats to your cart.", "info");
        openAuthModal("login");
        return;
    }

    const btn = document.getElementById(`btn-add-${productId}`);
    if (btn) {
        btn.classList.add("added");
        btn.innerHTML = `<i class="fas fa-check"></i> Added`;
    }

    const res = await apiCall("/api/cart", {
        method: "POST",
        body: JSON.stringify({ product_id: productId, quantity })
    });

    if (res.ok && res.success) {
        showToast(res.message || "Added to cart!", "success");
        await loadCart();

        // Animate badge
        const badge = document.getElementById("cart-badge-count");
        if (badge) {
            badge.classList.add("bump");
            setTimeout(() => badge.classList.remove("bump"), 300);
        }
    } else {
        showToast(res.message || "Failed to add to cart.", "error");
    }

    if (btn) {
        setTimeout(() => {
            btn.classList.remove("added");
            btn.innerHTML = `<i class="fas fa-plus"></i> Add`;
        }, 1200);
    }
}

async function updateCartQuantity(cartItemId, newQty) {
    const res = await apiCall(`/api/cart/${cartItemId}`, {
        method: "PUT",
        body: JSON.stringify({ quantity: newQty })
    });

    if (res.ok && res.success) {
        await loadCart();
    } else {
        showToast(res.message || "Failed to update quantity.", "error");
    }
}

async function removeCartItem(cartItemId) {
    const res = await apiCall(`/api/cart/${cartItemId}`, {
        method: "DELETE"
    });

    if (res.ok && res.success) {
        showToast("Item removed from your cart.", "info");
        await loadCart();
    } else {
        showToast(res.message || "Failed to remove item.", "error");
    }
}

async function clearCart() {
    if (AppState.cart.items.length === 0) return;
    if (!confirm("Are you sure you want to clear your shopping cart?")) return;

    const res = await apiCall("/api/cart", {
        method: "DELETE"
    });

    if (res.ok && res.success) {
        showToast("Cart cleared.", "info");
        await loadCart();
    }
}

function updateCartUI() {
    const badge = document.getElementById("cart-badge-count");
    if (badge) {
        badge.textContent = AppState.cart.totalItems;
        badge.style.display = AppState.cart.totalItems > 0 ? "flex" : "none";
    }

    const cartList = document.getElementById("cart-drawer-items");
    const cartFooter = document.getElementById("cart-drawer-footer");
    const cartSubtotal = document.getElementById("cart-drawer-subtotal");

    if (!cartList) return;

    if (AppState.cart.items.length === 0) {
        cartList.innerHTML = `
            <div class="state-empty" style="padding: 2.5rem 1rem;">
                <i class="fas fa-shopping-basket state-icon" style="font-size: 2.5rem;"></i>
                <h4 style="margin-bottom: 0.35rem; color: var(--color-primary);">Your Cart is Empty</h4>
                <p style="font-size: 0.88rem;">Explore our bakery catalogue and pick your favorites!</p>
                <button class="btn btn-outline btn-sm" onclick="toggleCartDrawer(false)" style="margin-top: 1rem;">Start Browsing</button>
            </div>
        `;
        if (cartFooter) cartFooter.style.display = "none";
        return;
    }

    if (cartFooter) cartFooter.style.display = "block";
    if (cartSubtotal) cartSubtotal.textContent = formatCurrency(AppState.cart.totalAmount);

    cartList.innerHTML = AppState.cart.items.map(item => {
        return `
            <div class="cart-item-row">
                <img class="cart-item-thumb" src="images/${item.image || 'chocolate-cake.jpg'}" alt="${escapeHtml(item.name)}" onerror="this.src='images/chocolate-cake.jpg';">
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${escapeHtml(item.name)}</h4>
                    <div class="cart-item-unit-price">${formatCurrency(item.price)} each</div>
                    <div class="qty-control">
                        <button class="qty-btn" onclick="updateCartQuantity(${item.cart_id || item.id}, ${item.quantity - 1})"><i class="fas fa-minus"></i></button>
                        <span class="qty-display">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateCartQuantity(${item.cart_id || item.id}, ${item.quantity + 1})"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div class="cart-item-subtotal">${formatCurrency(item.subtotal)}</div>
                    <button class="btn-remove-item" onclick="removeCartItem(${item.cart_id || item.id})" title="Remove item">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

// ==========================================
// CHECKOUT & ORDERS
// ==========================================
function openCheckoutModal() {
    if (!AppState.token) {
        showToast("Please sign in before checking out.", "info");
        toggleCartDrawer(false);
        openAuthModal("login");
        return;
    }

    if (AppState.cart.items.length === 0) {
        showToast("Your cart is empty. Add bakery treats first!", "error");
        return;
    }

    toggleCartDrawer(false);

    // Pre-populate fields from current user
    const nameField = document.getElementById("checkout-name");
    const phoneField = document.getElementById("checkout-phone");
    if (nameField && AppState.user) nameField.value = AppState.user.name || "";
    if (phoneField && AppState.user) phoneField.value = AppState.user.phone || "";

    const summaryItems = document.getElementById("checkout-summary-items");
    const totalEl = document.getElementById("checkout-total-amount");

    if (summaryItems) {
        summaryItems.innerHTML = AppState.cart.items.map(i => `
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.88rem;">
                <span>${escapeHtml(i.name)} × ${i.quantity}</span>
                <strong>${formatCurrency(i.subtotal)}</strong>
            </div>
        `).join("");
    }

    if (totalEl) totalEl.textContent = formatCurrency(AppState.cart.totalAmount);

    openModal("checkout-modal");
}

async function handlePlaceOrder(e) {
    e.preventDefault();

    const customer_name = document.getElementById("checkout-name").value.trim();
    const phone = document.getElementById("checkout-phone").value.trim();
    const delivery_address = document.getElementById("checkout-address").value.trim();
    const delivery_notes = document.getElementById("checkout-notes").value.trim();
    const payment_method = document.getElementById("checkout-payment").value;
    const submitBtn = document.getElementById("btn-submit-order");

    if (!customer_name || customer_name.length < 2) {
        showToast("Please enter a valid recipient name.", "error");
        return;
    }

    if (!phone || phone.length < 7) {
        showToast("Please enter a valid contact phone number.", "error");
        return;
    }

    if (!delivery_address || delivery_address.length < 5) {
        showToast("Please enter a complete delivery address.", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing Order...`;

    const res = await apiCall("/api/orders", {
        method: "POST",
        body: JSON.stringify({
            customer_name,
            phone,
            delivery_address,
            delivery_notes,
            payment_method
        })
    });

    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Confirm & Place Order</span> <i class="fas fa-arrow-right"></i>`;

    if (res.ok && res.success) {
        closeModal("checkout-modal");
        await loadCart();

        // Show confirmation modal
        const confirmOrderId = document.getElementById("confirm-order-id");
        const confirmTotal = document.getElementById("confirm-total");
        const confirmAddress = document.getElementById("confirm-address");

        if (confirmOrderId) confirmOrderId.textContent = `#${res.order.id}`;
        if (confirmTotal) confirmTotal.textContent = formatCurrency(res.order.totalAmount);
        if (confirmAddress) confirmAddress.textContent = res.order.deliveryAddress;

        openModal("confirmation-modal");
    } else {
        showToast(res.message || "Failed to place order. Please try again.", "error");
    }
}

// ==========================================
// ORDER HISTORY
// ==========================================
async function openOrdersModal() {
    if (!AppState.token) {
        showToast("Please sign in to view your orders.", "info");
        openAuthModal("login");
        return;
    }

    const container = document.getElementById("orders-list-container");
    if (!container) return;

    container.innerHTML = `
        <div class="state-loading">
            <div class="spinner"></div>
            <p>Loading your past orders...</p>
        </div>
    `;

    openModal("orders-modal");

    const res = await apiCall("/api/orders");
    if (res.ok && res.success) {
        renderOrdersList(res.orders || []);
    } else {
        container.innerHTML = `
            <div class="state-error">
                <i class="fas fa-exclamation-triangle state-icon"></i>
                <p>${escapeHtml(res.message || "Failed to load order history.")}</p>
            </div>
        `;
    }
}

function renderOrdersList(orders) {
    const container = document.getElementById("orders-list-container");
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="state-empty" style="padding: 2.5rem 1rem;">
                <i class="fas fa-box-open state-icon"></i>
                <h4 style="margin-bottom:0.35rem; color: var(--color-primary);">No Orders Yet</h4>
                <p>You haven't placed any bakery orders yet. Explore our fresh treats!</p>
                <button class="btn btn-primary btn-sm" onclick="closeModal('orders-modal')" style="margin-top:1rem;">Browse Cakes</button>
            </div>
        `;
        return;
    }

    container.innerHTML = orders.map(order => {
        const dateStr = new Date(order.order_date).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
        });

        const statusClass = `status-${(order.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`;

        const itemsHtml = (order.items || []).map(item => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px dashed var(--color-border); font-size: 0.88rem;">
                <div>
                    <strong>${escapeHtml(item.name || 'Bakery Item')}</strong>
                    <span style="color: var(--color-text-muted); font-size: 0.8rem;"> × ${item.quantity}</span>
                </div>
                <div>${formatCurrency(item.subtotal || (item.price * item.quantity))}</div>
            </div>
        `).join("");

        const canCancel = order.status === "Pending";

        return `
            <div class="order-card" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem; box-shadow: var(--shadow-sm);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
                    <div>
                        <span style="font-size:0.8rem; color:var(--color-text-muted);">Order #${order.id} • ${dateStr}</span>
                        <div style="font-size: 1.2rem; font-weight:700; color:var(--color-primary); margin-top:0.2rem;">${formatCurrency(order.total_amount)}</div>
                    </div>
                    <span class="status-badge ${statusClass}">
                        <i class="fas fa-circle" style="font-size:0.5rem;"></i> ${escapeHtml(order.status)}
                    </span>
                </div>
                <div style="background: var(--color-surface-soft); padding: 0.75rem 1rem; border-radius: var(--radius-sm); margin-bottom: 0.75rem;">
                    <div style="font-size: 0.82rem; color: var(--color-text-muted); margin-bottom: 0.4rem;">
                        <strong>Deliver to:</strong> ${escapeHtml(order.customer_name || AppState.user.name)} (${escapeHtml(order.phone)})<br>
                        ${escapeHtml(order.delivery_address)}
                    </div>
                    ${order.delivery_notes ? `<div style="font-size:0.8rem; color:var(--color-gold); font-style:italic;">Note: ${escapeHtml(order.delivery_notes)}</div>` : ''}
                </div>
                <div style="margin-bottom: 0.75rem;">
                    ${itemsHtml}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.8rem; color:var(--color-text-muted);">Method: ${escapeHtml(order.payment_method || 'Cash on Delivery')}</span>
                    ${canCancel ? `
                        <button class="btn btn-outline btn-sm" onclick="cancelOrder(${order.id})" style="color:var(--color-danger); border-color:var(--color-danger);">
                            <i class="fas fa-times"></i> Cancel Order
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join("");
}

async function cancelOrder(orderId) {
    if (!confirm(`Are you sure you want to cancel Order #${orderId}?`)) return;

    const res = await apiCall(`/api/orders/${orderId}/cancel`, { method: "PUT" });
    if (res.ok && res.success) {
        showToast(res.message || "Order cancelled.", "info");
        openOrdersModal(); // Refresh orders list
    } else {
        showToast(res.message || "Failed to cancel order.", "error");
    }
}

// ==========================================
// USER PROFILE
// ==========================================
async function openProfileModal() {
    if (!AppState.token) {
        openAuthModal("login");
        return;
    }

    const res = await apiCall("/api/profile");
    if (res.ok && res.user) {
        AppState.user = { ...AppState.user, ...res.user };
        localStorage.setItem("cakehub_user", JSON.stringify(AppState.user));

        document.getElementById("profile-name").value = res.user.name || "";
        document.getElementById("profile-email").value = res.user.email || "";
        document.getElementById("profile-phone").value = res.user.phone || "";
        document.getElementById("profile-role-badge").textContent = res.user.role || "customer";

        openModal("profile-modal");
    } else {
        showToast("Failed to load profile details.", "error");
    }
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    const name = document.getElementById("profile-name").value.trim();
    const phone = document.getElementById("profile-phone").value.trim();
    const email = document.getElementById("profile-email").value.trim();

    if (!name || name.length < 2) {
        showToast("Please enter a valid name.", "error");
        return;
    }

    const res = await apiCall("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ name, phone, email })
    });

    if (res.ok && res.success) {
        AppState.user = { ...AppState.user, ...res.user };
        localStorage.setItem("cakehub_user", JSON.stringify(AppState.user));
        updateAuthUI();
        showToast("Profile updated successfully!", "success");
    } else {
        showToast(res.message || "Failed to update profile.", "error");
    }
}

async function handleUpdatePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById("profile-current-password").value;
    const newPassword = document.getElementById("profile-new-password").value;
    const confirmPassword = document.getElementById("profile-confirm-password").value;

    if (!currentPassword || !newPassword) {
        showToast("Please fill in current and new password.", "error");
        return;
    }

    if (newPassword.length < 6) {
        showToast("New password must be at least 6 characters.", "error");
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast("New passwords do not match.", "error");
        return;
    }

    const res = await apiCall("/api/profile/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword })
    });

    if (res.ok && res.success) {
        showToast("Password updated successfully!", "success");
        document.getElementById("profile-current-password").value = "";
        document.getElementById("profile-new-password").value = "";
        document.getElementById("profile-confirm-password").value = "";
    } else {
        showToast(res.message || "Failed to update password.", "error");
    }
}

async function handleDeleteAccount() {
    const confirmation = prompt("To permanently delete your CakeHub account, type 'DELETE':");
    if (confirmation !== "DELETE") {
        if (confirmation !== null) showToast("Account deletion cancelled.", "info");
        return;
    }

    const res = await apiCall("/api/profile", { method: "DELETE" });
    if (res.ok && res.success) {
        showToast("Your account has been deleted.", "info");
        closeModal("profile-modal");
        handleLogout(false);
    } else {
        showToast(res.message || "Failed to delete account.", "error");
    }
}

// ==========================================
// ADMIN PORTAL
// ==========================================
async function openAdminModal() {
    if (!AppState.token || AppState.user?.role !== "admin") {
        showToast("Administrator privileges required.", "error");
        return;
    }

    openModal("admin-modal");
    switchAdminTab("orders");
    loadAdminOrders();
}

function switchAdminTab(tab) {
    const ordersTabBtn = document.getElementById("admin-tab-orders-btn");
    const productsTabBtn = document.getElementById("admin-tab-products-btn");
    const ordersView = document.getElementById("admin-orders-view");
    const productsView = document.getElementById("admin-products-view");

    if (tab === "orders") {
        ordersTabBtn.classList.add("active");
        productsTabBtn.classList.remove("active");
        ordersView.style.display = "block";
        productsView.style.display = "none";
        loadAdminOrders();
    } else {
        productsTabBtn.classList.add("active");
        ordersTabBtn.classList.remove("active");
        productsView.style.display = "block";
        ordersView.style.display = "none";
    }
}

async function loadAdminOrders() {
    const container = document.getElementById("admin-orders-table-body");
    if (!container) return;

    container.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem;">Loading customer orders...</td></tr>`;

    const res = await apiCall("/api/orders/admin/all");
    if (res.ok && res.orders) {
        if (res.orders.length === 0) {
            container.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem;">No orders placed yet.</td></tr>`;
            return;
        }

        container.innerHTML = res.orders.map(order => {
            const dateStr = new Date(order.order_date).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
            });

            return `
                <tr style="border-bottom: 1px solid var(--color-border); font-size: 0.88rem;">
                    <td style="padding: 0.75rem 0.5rem;"><strong>#${order.id}</strong></td>
                    <td style="padding: 0.75rem 0.5rem;">
                        <strong>${escapeHtml(order.customer_name || 'Customer')}</strong><br>
                        <span style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(order.phone)}</span>
                    </td>
                    <td style="padding: 0.75rem 0.5rem; max-width: 180px; font-size: 0.8rem;">
                        ${escapeHtml(order.delivery_address)}
                    </td>
                    <td style="padding: 0.75rem 0.5rem;"><strong>${formatCurrency(order.total_amount)}</strong></td>
                    <td style="padding: 0.75rem 0.5rem;">
                        <select onchange="updateOrderStatusAdmin(${order.id}, this.value)" style="padding: 0.3rem 0.5rem; border-radius: 6px; font-size: 0.82rem; border: 1px solid var(--color-border);">
                            <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="Preparing" ${order.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                            <option value="Out for Delivery" ${order.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                            <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                    <td style="padding: 0.75rem 0.5rem; color:var(--color-text-muted); font-size:0.78rem;">${dateStr}</td>
                </tr>
            `;
        }).join("");
    }
}

async function updateOrderStatusAdmin(orderId, newStatus) {
    const res = await apiCall(`/api/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus })
    });

    if (res.ok && res.success) {
        showToast(res.message || "Order status updated.", "success");
    } else {
        showToast(res.message || "Failed to update status.", "error");
    }
}

async function handleCreateProductAdmin(e) {
    e.preventDefault();
    const name = document.getElementById("admin-prod-name").value.trim();
    const category = document.getElementById("admin-prod-category").value;
    const price = document.getElementById("admin-prod-price").value;
    const description = document.getElementById("admin-prod-desc").value.trim();
    const image = document.getElementById("admin-prod-image").value.trim();

    if (!name || !price) {
        showToast("Please provide product name and price.", "error");
        return;
    }

    const res = await apiCall("/api/products", {
        method: "POST",
        body: JSON.stringify({ name, category, price, description, image })
    });

    if (res.ok && res.success) {
        showToast("Product added to catalogue successfully!", "success");
        document.getElementById("form-admin-create-product").reset();
        loadProducts(); // refresh storefront catalogue
    } else {
        showToast(res.message || "Failed to create product.", "error");
    }
}

// ==========================================
// INITIALIZATION & EVENT LISTENERS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Initial State UI
    updateAuthUI();
    loadProducts();
    loadCart();

    // 2. Category Filter Pills
    document.querySelectorAll(".cat-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            AppState.activeCategory = pill.dataset.category || "All";
            loadProducts();
        });
    });

    // 3. Search Bar with Debounce
    const searchInput = document.getElementById("catalogue-search");
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                AppState.searchQuery = e.target.value;
                loadProducts();
            }, 300);
        });
    }

    // 4. Sort Dropdown
    const sortSelect = document.getElementById("catalogue-sort");
    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            AppState.sortBy = e.target.value;
            loadProducts();
        });
    }

    // 5. Auth Forms
    const formLogin = document.getElementById("form-login");
    if (formLogin) formLogin.addEventListener("submit", handleLogin);

    const formRegister = document.getElementById("form-register");
    if (formRegister) formRegister.addEventListener("submit", handleRegister);

    // 6. Checkout Form
    const formCheckout = document.getElementById("form-checkout");
    if (formCheckout) formCheckout.addEventListener("submit", handlePlaceOrder);

    // 7. Profile Form
    const formProfile = document.getElementById("form-profile-details");
    if (formProfile) formProfile.addEventListener("submit", handleUpdateProfile);

    const formPassword = document.getElementById("form-profile-password");
    if (formPassword) formPassword.addEventListener("submit", handleUpdatePassword);

    // 8. Admin Form
    const formAdminProduct = document.getElementById("form-admin-create-product");
    if (formAdminProduct) formAdminProduct.addEventListener("submit", handleCreateProductAdmin);

    // 9. User Avatar Toggle
    const userAvatarBtn = document.getElementById("user-avatar-btn");
    const userDropdown = document.getElementById("user-dropdown-menu");
    if (userAvatarBtn && userDropdown) {
        userAvatarBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle("show");
        });
    }
});

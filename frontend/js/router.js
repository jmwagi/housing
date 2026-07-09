/*
  =====================================================
  router.js — SPA Router & Event Handlers (Embu Edition)
  =====================================================
  This is the heart of our Single Page Application.

  EMBU FOCUS:
  - The app is now Embu-only — there is no city selector.
  - The default city for API calls is always "Embu".
  - Instead of cities, we filter by areas (neighbourhoods).

  URL PATTERNS:
  #/                          → Home (area grid + featured listings)
   #/browse                    → Browse all Embu listings
   #/browse?area=Gakwegori     → Browse listings in a specific area
   #/browse?search=near gate   → Browse with search
   #/listing/3                 → Detail for listing ID 3
   #/add                       → Add listing form
   #/about                     → About / safety page
   #/jadmin                    → Admin dashboard (password-protected)
*/


/**
 * Navigate to a new route by changing the hash.
 * Setting window.location.hash triggers the hashchange
 * event, which the router listens for.
 *
 * @param {string} hash - The route hash (e.g., "#/browse")
 */
function navigate(hash) {
    window.location.hash = hash;
}

/**
 * Parse the current URL hash to extract the path and
 * query/path parameters.
 *
 * EXAMPLES:
 * Input:  "#/browse?area=Gakwegori&min_price=3000"
 * Output: { path: "/browse", params: { area: "Gakwegori", min_price: "3000" } }
 *
 * Input:  "#/listing/3"
 * Output: { path: "/listing", params: { id: "3" } }
 *
 * @returns {object} - { path: string, params: object }
 */
function getRouteParams() {
    const hash = window.location.hash.slice(1) || '/';
    const [pathPart, qs] = hash.split('?');
    const params = {};

    // Parse query string params (e.g., ?area=Gakwegori)
    if (qs) {
        qs.split('&').forEach(pair => {
            const [k, v] = pair.split('=').map(decodeURIComponent);
            params[k] = v;
        });
    }

    // Split path into segments: "/listing/3" → ["", "listing", "3"]
    const segments = pathPart.split('/');
    // First segment is always empty (from leading /), so the route is segments[1]
    const route = segments[1] ? '/' + segments[1] : '/';
    // If there's a second segment, it's a path parameter (like a listing ID)
    if (segments[2]) {
        params.id = segments[2];
    }

    return { path: route, params };
}

/**
 * THE MAIN ROUTER FUNCTION.
 * This is called on every hashchange and on page load.
 *
 * WORKFLOW:
 * 1. Parse the URL hash to get path and params
 * 2. Show a loading indicator
 * 3. Based on the path, fetch data and render the page
 * 4. If anything fails, show an error message
 */
async function router() {
    const { path, params } = getRouteParams();
    const app = document.getElementById('app');

    updateNav();

    // Step 1: Show loading state immediately
    app.innerHTML = renderLoading();

    try {
        // Step 2: Match the path and handle each route
        switch (path) {
            // ========== HOME PAGE ==========
            case '/':
                /*
                  Fetch areas and listings in PARALLEL.
                  Both are filtered to Embu by default.
                  Promise.all() runs both API calls at the
                  same time for faster load.
                */
                const [areas, listings] = await Promise.all([
                    apiGetAreas(),
                    apiGetListings({ city: 'Embu', verified: 'true' }),
                ]);
                AppState.areas = areas;
                AppState.listings = listings;
                AppState.currentArea = null;  // reset area filter
                app.innerHTML = renderHome();
                break;

            // ========== BROWSE PAGE ==========
            case '/browse':
                /*
                  Store selected area and search term.
                  Area and search come from URL query params.
                  Type and price filters persist from AppState.
                */
                AppState.currentArea = params.area || null;
                AppState.filters.search = params.search || null;

                /*
                  Build API parameters.
                  Default city is always "Embu" for this app.
                */
                const browseParams = { city: 'Embu', verified: 'true' };
                if (AppState.currentArea) browseParams.area = AppState.currentArea;
                if (AppState.filters.search) browseParams.search = AppState.filters.search;
                if (AppState.filters.listing_type) browseParams.listing_type = AppState.filters.listing_type;
                if (AppState.filters.min_price !== null) browseParams.min_price = AppState.filters.min_price;
                if (AppState.filters.max_price !== null) browseParams.max_price = AppState.filters.max_price;

                const browseListings = await apiGetListings(browseParams);
                AppState.listings = browseListings;
                app.innerHTML = renderBrowse();
                break;

            // ========== LISTING DETAIL ==========
            case '/listing':
                if (params.id) {
                    const listing = await apiGetListing(params.id);
                    AppState.currentListing = listing;
                    app.innerHTML = renderDetail();
                    initDetailMap();
                } else {
                    app.innerHTML = renderError('No listing ID provided.');
                }
                break;

            // ========== ADD LISTING FORM (landlord only) ==========
            case '/add':
                if (!AppState.isLoggedIn) {
                    navigate('#/login');
                    break;
                }
                if (AppState.userRole !== 'landlord') {
                    navigate('#/my-listings');
                    break;
                }
                try {
                    AppState.areas = await apiGetAreas();
                } catch (_) { /* fallback to hardcoded list */ }
                app.innerHTML = renderAddListing();
                break;

            // ========== LOGIN ==========
            case '/login':
                app.innerHTML = renderLogin();
                break;

            // ========== REGISTER ==========
            case '/register':
                app.innerHTML = renderRegister();
                break;

            // ========== LOGOUT ==========
            case '/logout':
                AppState.authToken = null;
                AppState.currentUser = null;
                AppState.isLoggedIn = false;
                AppState.userRole = null;
                AppState.favoriteIds = new Set();
                localStorage.removeItem('auth_token');
                navigate('#/');
                break;

            // ========== MY LISTINGS (Landlord Dashboard) ==========
            case '/my-listings':
                if (!AppState.isLoggedIn || AppState.userRole !== 'landlord') {
                    navigate('#/login');
                    break;
                }
                const myListings = await apiGetListings({ owner_id: AppState.currentUser.id });
                AppState.listings = myListings;
                app.innerHTML = renderMyListings();
                break;

            // ========== FAVORITES (Student) ==========
            case '/favorites':
                if (!AppState.isLoggedIn) {
                    navigate('#/login');
                    break;
                }
                const favs = await apiGetFavorites();
                AppState.favorites = favs;
                app.innerHTML = renderFavorites();
                break;

            // ========== ABOUT PAGE ==========
            case '/about':
                app.innerHTML = renderAbout();
                break;

            // ========== ADMIN DASHBOARD (password-protected) ==========
            case '/jadmin':
                if (!AppState.adminLoggedIn) {
                    app.innerHTML = renderAdminLogin();
                } else {
                    const allListings = await apiGetListings();
                    const allAreas = await apiGetAreas();
                    AppState.listings = allListings;
                    AppState.areas = allAreas;
                    app.innerHTML = renderAdmin();
                }
                break;

            // ========== 404 - PAGE NOT FOUND ==========
            default:
                app.innerHTML = `
                    <div class="error-state">
                        <h3>Page not found</h3>
                        <p>The page you're looking for doesn't exist.</p>
                        <a href="#/" onclick="navigate('#/')">Go Home</a>
                    </div>`;
        }
    } catch (err) {
        console.error('Router error:', err);
        app.innerHTML = renderError(err.message);
    }
}


// =====================================================
// FILTER HANDLERS
// =====================================================

/**
 * Set a text-based filter (listing_type).
 * Re-navigates to browse with the new filter applied.
 *
 * @param {string} key - The filter key ("listing_type")
 * @param {string} value - The filter value (e.g., "bedsit")
 */
function setFilter(key, value) {
    if (key === 'area') {
        AppState.currentArea = value || null;
    } else {
        AppState.filters[key] = value || null;
    }
    navigateToBrowse();
}

/**
 * Set price range filters.
 * Re-navigates to browse with the selected price range.
 *
 * @param {number|null} min - Minimum price (null for no minimum)
 * @param {number|null} max - Maximum price (null for no maximum)
 */
function setPriceFilter(min, max) {
    AppState.filters.min_price = min;
    AppState.filters.max_price = max;
    navigateToBrowse();
}

/**
 * Called when the price dropdown changes.
 * Parses combined values like "0-5000", "5000-8000", "8000-", or empty.
 */
function onPriceSelect(value) {
    if (!value) {
        setPriceFilter(null, null);
        return;
    }
    const parts = value.split('-');
    const min = parts[0] ? Number(parts[0]) : null;
    const max = parts[1] ? Number(parts[1]) : null;
    // "Under KSh 5,000" uses "0-5000" — treat 0 as null (no lower bound)
    setPriceFilter(min || null, max);
}

/**
 * Helper: navigate to browse while preserving the current area filter.
 * This is used by setFilter() and setPriceFilter() so the area
 * selection is maintained when changing type/price.
 */
function navigateToBrowse() {
    let hash = '#/browse';
    const params = [];
    if (AppState.currentArea) params.push(`area=${encodeURIComponent(AppState.currentArea)}`);
    if (AppState.filters.search) params.push(`search=${encodeURIComponent(AppState.filters.search)}`);
    if (params.length) hash += '?' + params.join('&');
    navigate(hash);
}

/**
 * Update the nav bar to show auth state (logged in vs logged out).
 */
function updateNav() {
    const publicLinks = document.getElementById('public-nav-links');
    const container = document.getElementById('auth-nav-links');
    if (!container || !publicLinks) return;
    if (AppState.isLoggedIn && AppState.currentUser) {
        if (AppState.userRole === 'landlord') {
            // Landlords: hide Browse/Help & Safety, show username + My Listings + Logout
            publicLinks.style.display = 'none';
            container.innerHTML = `
                <span style="color:#2E7D32;font-weight:600;font-size:0.9rem;">${AppState.currentUser.full_name}</span>
                <a href="#/my-listings" onclick="navigate('#/my-listings')">My Listings</a>
                <a href="#/logout" onclick="navigate('#/logout')">Logout</a>
            `;
        } else {
            publicLinks.style.display = '';
            container.innerHTML = `
                <span style="color:#2E7D32;font-size:0.85rem;margin-right:0.5rem;">${AppState.currentUser.full_name}</span>
                <a href="#/favorites" onclick="navigate('#/favorites')">Saved</a>
                <a href="#/logout" onclick="navigate('#/logout')">Logout</a>
            `;
        }
    } else {
        publicLinks.style.display = '';
        container.innerHTML = `
            <a href="#/login" onclick="navigate('#/login')">Sign In</a>
            <a href="#/register" onclick="navigate('#/register')">Join</a>
        `;
    }
}


// =====================================================
// FORM SUBMISSION HANDLERS
// =====================================================

/**
 * Handle the "Add Listing" form submission.
 *
 * STEPS:
 * 1. Prevent the default form submission
 * 2. Disable button, show "Submitting..."
 * 3. Build FormData from form fields
 * 4. Send to API via apiCreateListing()
 * 5. Show success/error message
 * 6. Re-enable button
 *
 * @param {Event} event - The form submission event
 */
async function submitListing(event) {
    event.preventDefault();
    const resultDiv = document.getElementById('add-result');
    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
        const formData = new FormData();
        formData.append('title', document.getElementById('add-title').value.trim());
        formData.append('description', document.getElementById('add-description').value.trim());
        formData.append('price', document.getElementById('add-price').value);
        formData.append('city', document.getElementById('add-city').value);  // hidden, always "Embu"
        formData.append('area', document.getElementById('add-area').value);
        formData.append('listing_type', document.getElementById('add-type').value);
        formData.append('amenities', document.getElementById('add-amenities').value.trim());
        formData.append('landlord_name', document.getElementById('add-landlord-name').value.trim());
        formData.append('landlord_phone', document.getElementById('add-landlord-phone').value.trim());

        const lat = document.getElementById('add-latitude')?.value.trim();
        const lng = document.getElementById('add-longitude')?.value.trim();
        if (lat) formData.append('latitude', lat);
        if (lng) formData.append('longitude', lng);

        const fileInput = document.getElementById('add-images');
        if (!fileInput.files.length) {
            throw new Error('At least one photo is required.');
        }
        for (const file of fileInput.files) {
            formData.append('images', file);
        }

        await apiCreateListing(formData);
        resultDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle" style="color:#2E7D32;"></i> Listing submitted for review! It will appear once approved by an admin.</div>';
        event.target.reset();
    } catch (err) {
        resultDiv.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Listing';
    }
}

/**
 * Handle the "Contact Landlord" form submission on the detail page.
 *
 * @param {Event} event - The form submission event
 * @param {number} listingId - The listing ID to contact about
 */
async function submitContact(event, listingId) {
    event.preventDefault();
    const resultDiv = document.getElementById('contact-result');
    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        const data = {
            student_name: document.getElementById('contact-name').value.trim(),
            student_phone: document.getElementById('contact-phone').value.trim(),
            message: document.getElementById('contact-msg').value.trim(),
        };
        const res = await apiContactLandlord(listingId, data);
        resultDiv.innerHTML = `<div class="alert alert-success">${res.message}</div>`;
        event.target.reset();
    } catch (err) {
        resultDiv.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Enquiry';
    }
}


// =====================================================
// AUTH HANDLERS
// =====================================================

/**
 * Handle login form submission.
 */
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const error = document.getElementById('login-error');

    if (!email || !password) {
        error.textContent = 'Please fill in all fields.';
        error.style.display = 'block';
        return;
    }

    try {
        const res = await apiLogin({ email, password });
        AppState.authToken = res.access_token;
        AppState.currentUser = res.user;
        AppState.isLoggedIn = true;
        AppState.userRole = res.user.role;
        localStorage.setItem('auth_token', res.access_token);
        await loadFavoriteIds();
        navigate(AppState.userRole === 'landlord' ? '#/my-listings' : '#/');
    } catch (err) {
        error.textContent = err.message;
        error.style.display = 'block';
    }
}

/**
 * Handle registration form submission.
 */
async function handleRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const role = document.getElementById('reg-role').value;
    const idNumber = document.getElementById('reg-id-number').value.trim();
    const password = document.getElementById('reg-password').value;
    const error = document.getElementById('register-error');

    if (!name || !email || !phone || !password) {
        error.textContent = 'Please fill in all required fields.';
        error.style.display = 'block';
        return;
    }

    if (role === 'landlord' && !idNumber) {
        error.textContent = 'National ID number is required for landlord accounts.';
        error.style.display = 'block';
        return;
    }

    try {
        const data = {
            email, password, full_name: name, phone, role,
            id_number: role === 'landlord' ? idNumber : null,
        };
        const res = await apiRegister(data);
        AppState.authToken = res.access_token;
        AppState.currentUser = res.user;
        AppState.isLoggedIn = true;
        AppState.userRole = res.user.role;
        localStorage.setItem('auth_token', res.access_token);
        await loadFavoriteIds();
        navigate(AppState.userRole === 'landlord' ? '#/my-listings' : '#/');
    } catch (err) {
        error.textContent = err.message;
        error.style.display = 'block';
    }
}

/**
 * Restore session on app start by checking for existing token.
 * Called from app.js after DOMContentLoaded.
 */
async function restoreSession() {
    if (!AppState.authToken) return;
    try {
        const user = await apiGetMe();
        AppState.currentUser = user;
        AppState.isLoggedIn = true;
        AppState.userRole = user.role;
        await loadFavoriteIds();
    } catch {
        // Token expired or invalid — clear it
        AppState.authToken = null;
        AppState.currentUser = null;
        AppState.isLoggedIn = false;
        AppState.userRole = null;
        localStorage.removeItem('auth_token');
    }
}

// =====================================================
// ADMIN HANDLERS
// =====================================================

/**
 * Select a listing for editing.
 * Sets editingListingId in state and re-renders the admin page.
 *
 * @param {number} id - The listing ID to edit
 */
function editListing(id) {
    AppState.editingListingId = id;
    router();
}

/**
 * Cancel editing and go back to the admin table view.
 */
function cancelEdit() {
    AppState.editingListingId = null;
    router();
}

/**
 * Save changes for a listing being edited.
 * Collects form values from the admin edit form,
 * calls apiUpdateListing, then re-renders admin.
 *
 * @param {number} id - The listing ID being edited
 */
async function saveEdit(id) {
    const btn = document.querySelector('#admin-edit-form button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const data = {
            title: document.getElementById('admin-edit-title').value.trim(),
            price: parseFloat(document.getElementById('admin-edit-price').value),
            area: document.getElementById('admin-edit-area').value,
            listing_type: document.getElementById('admin-edit-type').value,
            landlord_name: document.getElementById('admin-edit-landlord-name').value.trim(),
            landlord_phone: document.getElementById('admin-edit-landlord-phone').value.trim(),
            amenities: document.getElementById('admin-edit-amenities').value.trim(),
            verified: document.getElementById('admin-edit-verified').checked,
        };
        await apiUpdateListing(id, data);
        AppState.editingListingId = null;
        router();
    } catch (err) {
        alert('Error saving: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
}

/**
 * Toggle the verified status of a listing.
 *
 * @param {number} id - The listing ID
 * @param {boolean} currentVerified - Current verified state
 */
async function toggleVerify(id, currentVerified) {
    try {
        await apiUpdateListing(id, { verified: !currentVerified });
        router();
    } catch (err) {
        alert('Error toggling verification: ' + err.message);
    }
}

/**
 * Delete a listing after user confirmation.
 *
 * @param {number} id - The listing ID to delete
 */
async function deleteListing(id) {
    if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) {
        return;
    }
    try {
        await apiDeleteListing(id);
        if (AppState.editingListingId === id) {
            AppState.editingListingId = null;
        }
        router();
    } catch (err) {
        alert('Error deleting listing: ' + err.message);
    }
}

/**
 * Add a new area (from the admin page).
 * Reads the area name input, calls the API, and re-renders admin.
 */
async function addArea() {
    const input = document.getElementById('admin-new-area-name');
    const name = input.value.trim();
    if (!name) return;

    const resultDiv = document.getElementById('admin-area-result');
    try {
        const area = await apiCreateArea(name);
        resultDiv.innerHTML = `<div class="alert alert-success">Area "${area.name}" added successfully.</div>`;
        input.value = '';
        // Re-fetch areas to update the dropdowns everywhere
        AppState.areas = await apiGetAreas();
        router();
    } catch (err) {
        resultDiv.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
}

/**
 * Delete an area (from the admin page).
 * Shows a confirmation dialog first.
 *
 * @param {number} id - The area ID to delete
 */
async function deleteArea(id) {
    if (!confirm('Are you sure you want to delete this area?')) {
        return;
    }
    const resultDiv = document.getElementById('admin-area-result');
    try {
        await apiDeleteArea(id);
        resultDiv.innerHTML = `<div class="alert alert-success">Area deleted.</div>`;
        AppState.areas = await apiGetAreas();
        router();
    } catch (err) {
        resultDiv.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
}

/**
 * Admin login: checks password against AppState.adminPassword.
 * On success, sets adminLoggedIn = true and navigates to #/jadmin.
 */
function adminLogin() {
    const input = document.getElementById('admin-login-password');
    const error = document.getElementById('admin-login-error');
    const pw = input ? input.value : '';

    if (pw === AppState.adminPassword) {
        AppState.adminLoggedIn = true;
        localStorage.setItem('admin_logged_in', 'true');
        navigate('#/jadmin');
    } else {
        if (error) {
            error.textContent = 'Incorrect password. Try again.';
            error.style.display = 'block';
        }
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

/**
 * Admin logout: clears login state and navigates to home.
 */
function adminLogout() {
    AppState.adminLoggedIn = false;
    localStorage.setItem('admin_logged_in', 'false');
    navigate('#/');
}

/**
 * Change admin password.
 * Validates current password, new password match, then updates
 * AppState.adminPassword and localStorage.
 */
function changePassword() {
    const currentPw = document.getElementById('admin-current-password').value;
    const newPw = document.getElementById('admin-new-password').value;
    const confirmPw = document.getElementById('admin-confirm-password').value;
    const result = document.getElementById('admin-password-result');

    if (currentPw !== AppState.adminPassword) {
        result.innerHTML = '<div class="alert alert-error">Current password is incorrect.</div>';
        return;
    }
    if (!newPw || newPw.length < 4) {
        result.innerHTML = '<div class="alert alert-error">New password must be at least 4 characters.</div>';
        return;
    }
    if (newPw !== confirmPw) {
        result.innerHTML = '<div class="alert alert-error">New passwords do not match.</div>';
        return;
    }

    AppState.adminPassword = newPw;
    localStorage.setItem('admin_password', newPw);
    document.getElementById('admin-current-password').value = '';
    document.getElementById('admin-new-password').value = '';
    document.getElementById('admin-confirm-password').value = '';
    result.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle" style="color:#2E7D32;"></i> Password updated successfully.</div>';
}

/**
 * Edit a listing from the landlord dashboard.
 * Sets editingListingId and re-renders to show edit panel.
 */
async function editMyListing(id) {
    AppState.editingListingId = id;
    router();
}

/**
 * Cancel editing and return to the my-listings table view.
 */
function cancelMyEdit() {
    AppState.editingListingId = null;
    router();
}

/**
 * Save changes to a listing from the landlord dashboard.
 */
async function saveMyEdit(id) {
    const btn = document.querySelector('#my-edit-form button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const data = {
            title: document.getElementById('my-edit-title').value.trim(),
            price: parseFloat(document.getElementById('my-edit-price').value),
            area: document.getElementById('my-edit-area').value,
            listing_type: document.getElementById('my-edit-type').value,
            amenities: document.getElementById('my-edit-amenities').value.trim(),
        };
        await apiUpdateListing(id, data);
        AppState.editingListingId = null;
        // Refresh listings
        const myListings = await apiGetListings({ owner_id: AppState.currentUser.id });
        AppState.listings = myListings;
        router();
    } catch (err) {
        const result = document.getElementById('my-edit-result');
        if (result) result.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
}

/**
 * Delete a listing from the landlord dashboard.
 */
async function deleteMyListing(id) {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    try {
        await apiDeleteListing(id);
        // Refresh the listings
        const myListings = await apiGetListings({ owner_id: AppState.currentUser.id });
        AppState.listings = myListings;
        router();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}


// =====================================================
// FAVORITE HANDLERS
// =====================================================

/**
 * Load the user's favorite IDs into AppState.favoriteIds.
 * Called after login/session restore.
 */
async function loadFavoriteIds() {
    if (!AppState.isLoggedIn) {
        AppState.favoriteIds = new Set();
        return;
    }
    try {
        const favs = await apiGetFavorites();
        AppState.favoriteIds = new Set(favs.map(f => f.listing_id));
    } catch {
        AppState.favoriteIds = new Set();
    }
}

/**
 * Toggle a listing as a favorite.
 * If already favorited, remove it; otherwise add it.
 * Updates the UI in-place without a full page reload.
 */
async function toggleFavorite(listingId) {
    if (!AppState.isLoggedIn) {
        navigate('#/login');
        return;
    }

    const wasFav = AppState.favoriteIds.has(listingId);

    try {
        if (wasFav) {
            await apiRemoveFavorite(listingId);
            AppState.favoriteIds.delete(listingId);
        } else {
            await apiAddFavorite(listingId);
            AppState.favoriteIds.add(listingId);
        }
        // Re-render the current page to reflect the change
        router();
    } catch (err) {
        alert('Error updating favorite: ' + err.message);
    }
}

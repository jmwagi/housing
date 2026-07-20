function navigate(hash) {
    window.location.hash = hash;
}

function getRouteParams() {
    const hash = window.location.hash.slice(1) || '/';
    const [pathPart, qs] = hash.split('?');
    const params = {};

    if (qs) {
        qs.split('&').forEach(pair => {
            const [k, v] = pair.split('=').map(decodeURIComponent);
            params[k] = v;
        });
    }

    const segments = pathPart.split('/');
    const route = segments[1] ? '/' + segments[1] : '/';
    if (segments[2]) {
        params.id = segments[2];
    }

    return { path: route, params };
}

async function router() {
    const { path, params } = getRouteParams();
    const app = document.getElementById('app');

    updateNav();

    app.innerHTML = renderLoading();

    try {
        switch (path) {
            case '/':
                navigate('#/browse');
                return;

            case '/browse':
                AppState.currentArea = params.area || null;
                AppState.filters.search = params.search || null;

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
                } catch (_) {}
                app.innerHTML = renderAddListing();
                break;

            case '/login':
                app.innerHTML = renderLogin();
                break;

            case '/register':
                app.innerHTML = renderRegister();
                break;

            case '/logout':
                AppState.authToken = null;
                AppState.currentUser = null;
                AppState.isLoggedIn = false;
                AppState.userRole = null;
                AppState.favoriteIds = new Set();
                localStorage.removeItem('auth_token');
                navigate('#/');
                break;

            case '/my-listings':
                if (!AppState.isLoggedIn || AppState.userRole !== 'landlord') {
                    navigate('#/login');
                    break;
                }
                const myListings = await apiGetListings({ owner_id: AppState.currentUser.id });
                AppState.listings = myListings;
                app.innerHTML = renderMyListings();
                break;

            case '/favorites':
                if (!AppState.isLoggedIn) {
                    navigate('#/login');
                    break;
                }
                const favs = await apiGetFavorites();
                AppState.favorites = favs;
                app.innerHTML = renderFavorites();
                break;

            case '/about':
                app.innerHTML = renderAbout();
                break;

            case '/terms':
                app.innerHTML = renderTerms();
                break;

            case '/privacy':
                app.innerHTML = renderPrivacy();
                break;

            case '/jadmin':
                if (!AppState.adminLoggedIn) {
                    app.innerHTML = renderAdminLogin();
                } else {
                    const allListings = await apiGetListings();
                    const allAreas = await apiGetAreas();
                    const allUsers = await apiGetUsers(AppState.adminPassword);
                    AppState.listings = allListings;
                    AppState.areas = allAreas;
                    AppState.allUsers = allUsers;
                    app.innerHTML = renderAdmin();
                }
                break;

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

function setFilter(key, value) {
    if (key === 'area') {
        AppState.currentArea = value || null;
    } else {
        AppState.filters[key] = value || null;
    }
    navigateToBrowse();
}

function setPriceFilter(min, max) {
    AppState.filters.min_price = min;
    AppState.filters.max_price = max;
    navigateToBrowse();
}

function onPriceSelect(value) {
    if (!value) {
        setPriceFilter(null, null);
        return;
    }
    const parts = value.split('-');
    const min = parts[0] ? Number(parts[0]) : null;
    const max = parts[1] ? Number(parts[1]) : null;
    setPriceFilter(min || null, max);
}

function navigateToBrowse() {
    let hash = '#/browse';
    const params = [];
    if (AppState.currentArea) params.push(`area=${encodeURIComponent(AppState.currentArea)}`);
    if (AppState.filters.search) params.push(`search=${encodeURIComponent(AppState.filters.search)}`);
    if (params.length) hash += '?' + params.join('&');
    navigate(hash);
}

function updateNav() {
    const publicLinks = document.getElementById('public-nav-links');
    const container = document.getElementById('auth-nav-links');
    if (!container || !publicLinks) return;
    if (AppState.isLoggedIn && AppState.currentUser) {
        if (AppState.userRole === 'landlord') {
            publicLinks.style.display = 'none';
            container.innerHTML = `
                <span style="color:#2E7D32;font-weight:600;font-size:0.9rem;">${AppState.currentUser.full_name}</span>
                <a href="#/my-listings" onclick="navigate('#/my-listings')">My Listings</a>
                <a href="#/logout" onclick="navigate('#/logout')">Logout</a>
            `;
        } else {
            publicLinks.style.display = 'none';
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
        formData.append('city', document.getElementById('add-city').value);
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
        navigate(AppState.userRole === 'landlord' ? '#/my-listings' : '#/browse');
    } catch (err) {
        error.textContent = err.message;
        error.style.display = 'block';
    }
}

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

    const termsChecked = document.getElementById('reg-terms').checked;
    if (!termsChecked) {
        error.textContent = 'You must agree to the Terms of Service and Privacy Policy.';
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
        navigate(AppState.userRole === 'landlord' ? '#/my-listings' : '#/browse');
    } catch (err) {
        error.textContent = err.message;
        error.style.display = 'block';
    }
}

async function restoreSession() {
    if (!AppState.authToken) return;
    try {
        const user = await apiGetMe();
        AppState.currentUser = user;
        AppState.isLoggedIn = true;
        AppState.userRole = user.role;
        await loadFavoriteIds();
    } catch {
        AppState.authToken = null;
        AppState.currentUser = null;
        AppState.isLoggedIn = false;
        AppState.userRole = null;
        localStorage.removeItem('auth_token');
    }
}

function editListing(id) {
    AppState.editingListingId = id;
    router();
}

function cancelEdit() {
    AppState.editingListingId = null;
    router();
}

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

async function toggleVerify(id, currentVerified) {
    try {
        await apiUpdateListing(id, { verified: !currentVerified });
        router();
    } catch (err) {
        alert('Error toggling verification: ' + err.message);
    }
}

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

async function addArea() {
    const input = document.getElementById('admin-new-area-name');
    const name = input.value.trim();
    if (!name) return;

    const resultDiv = document.getElementById('admin-area-result');
    try {
        const area = await apiCreateArea(name);
        resultDiv.innerHTML = `<div class="alert alert-success">Area "${area.name}" added successfully.</div>`;
        input.value = '';
        AppState.areas = await apiGetAreas();
        router();
    } catch (err) {
        resultDiv.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
}

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

function adminLogout() {
    AppState.adminLoggedIn = false;
    localStorage.setItem('admin_logged_in', 'false');
    navigate('#/');
}

async function adminResetPassword() {
    const userId = parseInt(document.getElementById('reset-user-id').value);
    const newPassword = document.getElementById('reset-new-password').value;
    const resultDiv = document.getElementById('admin-reset-result');

    if (!userId || !newPassword || newPassword.length < 4) {
        resultDiv.innerHTML = '<div class="alert alert-error">Select a user and enter a password with at least 4 characters.</div>';
        return;
    }

    try {
        await apiResetPassword(userId, newPassword, AppState.adminPassword);
        resultDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle" style="color:#2E7D32;"></i> Password reset successfully. Share the new password with the user.</div>';
        document.getElementById('reset-new-password').value = '';
        document.getElementById('reset-user-id').value = '';
    } catch (err) {
        resultDiv.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
}

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

async function editMyListing(id) {
    AppState.editingListingId = id;
    router();
}

function cancelMyEdit() {
    AppState.editingListingId = null;
    router();
}

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

async function deleteMyListing(id) {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    try {
        await apiDeleteListing(id);
        const myListings = await apiGetListings({ owner_id: AppState.currentUser.id });
        AppState.listings = myListings;
        router();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

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
        router();
    } catch (err) {
        alert('Error updating favorite: ' + err.message);
    }
}

import { AppState } from './state.js';
import {
    apiGetListings, apiGetListing, apiCreateListing, apiUpdateListing, apiDeleteListing,
    apiGetAreas, apiCreateArea, apiDeleteArea,
    apiContactLandlord, apiRegister, apiLogin, apiGetMe, apiGetUsers, apiResetPassword,
    apiAdminLogin, apiGetLandlordEnquiries, apiGetLandlords, apiGetFavorites,
    apiAddFavorite, apiRemoveFavorite,
} from './api.js';
import {
    renderHome, renderError, renderLoading, renderBrowse, renderDetail, renderAddListing,
    renderFavorites, renderAbout, renderLogin, renderRegister,
    renderAdminLogin, renderAdmin, renderMyListings, renderInbox,
    initDetailMap, initAddMap, renderTerms, renderPrivacy,
} from './render.js';

export function navigate(hash) {
    window.location.hash = hash;
}
window.navigate = navigate;

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

export async function router() {
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

                const browseParams = { city: 'Embu', verified: 'true', available: 'true' };
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
                setTimeout(initAddMap, 100);
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

            case '/inbox':
                if (!AppState.isLoggedIn || AppState.userRole !== 'landlord') {
                    navigate('#/login');
                    break;
                }
                const enquiries = await apiGetLandlordEnquiries();
                AppState.enquiries = enquiries;
                app.innerHTML = renderInbox();
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
                    const allUsers = await apiGetUsers(AppState.adminPassword || 'admin123');
                    const landlords = await apiGetLandlords();
                    AppState.listings = allListings;
                    AppState.areas = allAreas;
                    AppState.allUsers = allUsers;
                    AppState.landlords = landlords;
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
window.router = router;

export function setFilter(key, value) {
    if (key === 'area') {
        AppState.currentArea = value || null;
    } else {
        AppState.filters[key] = value || null;
    }
    navigateToBrowse();
}
window.setFilter = setFilter;

function setPriceFilter(min, max) {
    AppState.filters.min_price = min;
    AppState.filters.max_price = max;
    navigateToBrowse();
}

export function onPriceSelect(value) {
    if (!value) {
        setPriceFilter(null, null);
        return;
    }
    const parts = value.split('-');
    const min = parts[0] ? Number(parts[0]) : null;
    const max = parts[1] ? Number(parts[1]) : null;
    setPriceFilter(min || null, max);
}
window.onPriceSelect = onPriceSelect;

export function navigateToBrowse() {
    let hash = '#/browse';
    const params = [];
    if (AppState.currentArea) params.push(`area=${encodeURIComponent(AppState.currentArea)}`);
    if (AppState.filters.search) params.push(`search=${encodeURIComponent(AppState.filters.search)}`);
    if (params.length) hash += '?' + params.join('&');
    navigate(hash);
}
window.navigateToBrowse = navigateToBrowse;

export function updateNav() {
    const publicLinks = document.getElementById('public-nav-links');
    const container = document.getElementById('auth-nav-links');
    if (!container || !publicLinks) return;
    if (AppState.adminLoggedIn) {
        publicLinks.style.display = 'none';
        container.innerHTML = `
            <a href="#/jadmin" onclick="navigate('#/jadmin')" style="color:#FF9800;font-weight:600;">Admin</a>
            <a href="#/" onclick="adminLogout()">Logout</a>
        `;
    } else if (AppState.isLoggedIn && AppState.currentUser) {
        if (AppState.userRole === 'landlord') {
            publicLinks.style.display = 'none';
            container.innerHTML = `
                <span style="color:#2E7D32;font-weight:600;font-size:0.9rem;">${AppState.currentUser.full_name}</span>
                <a href="#/my-listings" onclick="navigate('#/my-listings')">My Listings</a>
                <a href="#/inbox" onclick="navigate('#/inbox')">Inbox</a>
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
window.updateNav = updateNav;

export async function submitListing(event) {
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

        const lat = document.getElementById('add-lat-hidden')?.value.trim();
        const lng = document.getElementById('add-lng-hidden')?.value.trim();
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
        navigate('#/my-listings');
    } catch (err) {
        resultDiv.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Listing';
    }
}
window.submitListing = submitListing;

export async function submitContact(event, listingId) {
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
window.submitContact = submitContact;

export async function handleLogin() {
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
        AppState.adminLoggedIn = false;
        AppState.adminToken = null;
        localStorage.removeItem('admin_token');
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
window.handleLogin = handleLogin;

export async function handleRegister() {
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
        AppState.adminLoggedIn = false;
        AppState.adminToken = null;
        localStorage.removeItem('admin_token');
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
window.handleRegister = handleRegister;

export async function restoreSession() {
    if (!AppState.authToken) {
        const adminToken = localStorage.getItem('admin_token');
        if (adminToken) {
            AppState.adminToken = adminToken;
            AppState.adminLoggedIn = true;
        }
        return;
    }
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
window.restoreSession = restoreSession;

export function editListing(id) {
    AppState.editingListingId = id;
    router();
}
window.editListing = editListing;

export function cancelEdit() {
    AppState.editingListingId = null;
    router();
}
window.cancelEdit = cancelEdit;

export async function saveEdit(id) {
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
window.saveEdit = saveEdit;

export async function toggleVerify(id, currentVerified) {
    try {
        await apiUpdateListing(id, { verified: !currentVerified });
        router();
    } catch (err) {
        alert('Error toggling verification: ' + err.message);
    }
}
window.toggleVerify = toggleVerify;

export async function deleteListing(id) {
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
window.deleteListing = deleteListing;

export async function addArea() {
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
window.addArea = addArea;

export async function deleteArea(id) {
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
window.deleteArea = deleteArea;

export async function adminLogin() {
    const input = document.getElementById('admin-login-password');
    const error = document.getElementById('admin-login-error');
    const pw = input ? input.value : '';

    if (!pw) {
        if (error) {
            error.textContent = 'Please enter the admin password.';
            error.style.display = 'block';
        }
        return;
    }

    try {
        const res = await apiAdminLogin(pw);
        AppState.isLoggedIn = false;
        AppState.userRole = null;
        AppState.currentUser = null;
        AppState.authToken = null;
        AppState.favoriteIds = new Set();
        localStorage.removeItem('auth_token');
        AppState.adminToken = res.access_token;
        AppState.adminLoggedIn = true;
        localStorage.setItem('admin_token', res.access_token);
        router();
    } catch (err) {
        if (error) {
            error.textContent = err.message;
            error.style.display = 'block';
        }
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}
window.adminLogin = adminLogin;

export function adminLogout() {
    AppState.adminLoggedIn = false;
    AppState.adminToken = null;
    localStorage.removeItem('admin_token');
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
        AppState.authToken = savedToken;
        restoreSession().then(() => { updateNav(); router(); });
    } else {
        navigate('#/');
    }
}
window.adminLogout = adminLogout;

export async function adminResetPassword() {
    const userId = parseInt(document.getElementById('reset-user-id').value);
    const newPassword = document.getElementById('reset-new-password').value;
    const resultDiv = document.getElementById('admin-reset-result');

    if (!userId || !newPassword || newPassword.length < 4) {
        resultDiv.innerHTML = '<div class="alert alert-error">Select a user and enter a password with at least 4 characters.</div>';
        return;
    }

    try {
        await apiResetPassword(userId, newPassword, AppState.adminPassword || 'admin123');
        resultDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle" style="color:#2E7D32;"></i> Password reset successfully. Share the new password with the user.</div>';
        document.getElementById('reset-new-password').value = '';
        document.getElementById('reset-user-id').value = '';
    } catch (err) {
        resultDiv.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
}
window.adminResetPassword = adminResetPassword;

export async function adminAddListing() {
    const resultDiv = document.getElementById('admin-add-result');
    const btn = document.querySelector('#admin-add-listing-form button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
        const formData = new FormData();
        formData.append('title', document.getElementById('admin-add-title').value.trim());
        formData.append('price', document.getElementById('admin-add-price').value);
        formData.append('city', 'Embu');
        formData.append('area', document.getElementById('admin-add-area').value);
        formData.append('listing_type', document.getElementById('admin-add-type').value);
        formData.append('amenities', document.getElementById('admin-add-amenities').value.trim());
        formData.append('landlord_name', document.getElementById('admin-add-landlord-name').value.trim());
        formData.append('landlord_phone', document.getElementById('admin-add-landlord-phone').value.trim());

        const ownerId = document.getElementById('admin-add-owner-id').value;
        if (ownerId) {
            formData.append('owner_id', ownerId);
        }

        const fileInput = document.getElementById('admin-add-images');
        if (!fileInput.files.length) {
            throw new Error('At least one photo is required.');
        }
        for (const file of fileInput.files) {
            formData.append('images', file);
        }

        await apiCreateListing(formData);
        resultDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle" style="color:#2E7D32;"></i> Listing created successfully! It will appear after verification.</div>';
        document.getElementById('admin-add-listing-form').reset();
        router();
    } catch (err) {
        resultDiv.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Listing';
    }
}
window.adminAddListing = adminAddListing;

export async function editMyListing(id) {
    AppState.editingListingId = id;
    router();
}
window.editMyListing = editMyListing;

export function cancelMyEdit() {
    AppState.editingListingId = null;
    router();
}
window.cancelMyEdit = cancelMyEdit;

export async function saveMyEdit(id) {
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
window.saveMyEdit = saveMyEdit;

export async function deleteMyListing(id) {
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
window.deleteMyListing = deleteMyListing;

export async function toggleAvailable(id, currentAvailable) {
    try {
        await apiUpdateListing(id, { available: currentAvailable === false ? true : false });
        const myListings = await apiGetListings({ owner_id: AppState.currentUser.id });
        AppState.listings = myListings;
        router();
    } catch (err) {
        alert('Error toggling availability: ' + err.message);
    }
}
window.toggleAvailable = toggleAvailable;

export async function loadFavoriteIds() {
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
window.loadFavoriteIds = loadFavoriteIds;

export async function toggleFavorite(listingId) {
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
window.toggleFavorite = toggleFavorite;

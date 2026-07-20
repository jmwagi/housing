import { AppState } from './state.js';

const API_BASE = '/api';

export async function apiFetch(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = { 'Accept': 'application/json', ...options.headers };

    if (AppState.authToken) {
        headers['Authorization'] = `Bearer ${AppState.authToken}`;
    } else if (AppState.adminToken && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${AppState.adminToken}`;
    }

    const res = await fetch(url, { headers, ...options });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Request failed (${res.status})`);
    }

    if (res.status === 204) return null;
    return res.json();
}
window.apiFetch = apiFetch;

export function apiGetListings(params = {}) {
    const qs = new URLSearchParams();
    if (params.city) qs.set('city', params.city);
    if (params.area) qs.set('area', params.area);
    if (params.min_price) qs.set('min_price', params.min_price);
    if (params.max_price) qs.set('max_price', params.max_price);
    if (params.listing_type) qs.set('listing_type', params.listing_type);
    if (params.verified) qs.set('verified', params.verified);
    if (params.search) qs.set('search', params.search);
    if (params.owner_id) qs.set('owner_id', params.owner_id);
    if (params.available !== undefined) qs.set('available', params.available);

    const query = qs.toString();
    return apiFetch(`/listings${query ? '?' + query : ''}`);
}
window.apiGetListings = apiGetListings;

export function apiGetListing(id) {
    return apiFetch(`/listings/${id}`);
}
window.apiGetListing = apiGetListing;

export async function apiCreateListing(formData) {
    const headers = {};
    if (AppState.authToken) {
        headers['Authorization'] = `Bearer ${AppState.authToken}`;
    }
    const res = await fetch(`${API_BASE}/listings`, {
        method: 'POST',
        body: formData,
        headers,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        let detail;
        try { detail = JSON.parse(text).detail; } catch { detail = text; }
        throw new Error(detail || 'Failed to create listing');
    }
    return res.json();
}
window.apiCreateListing = apiCreateListing;

export function apiUpdateListing(id, data) {
    return apiFetch(`/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}
window.apiUpdateListing = apiUpdateListing;

export function apiDeleteListing(id) {
    return apiFetch(`/listings/${id}`, { method: 'DELETE' });
}
window.apiDeleteListing = apiDeleteListing;

export function apiGetAreas() {
    return apiFetch('/areas');
}
window.apiGetAreas = apiGetAreas;

export function apiCreateArea(name) {
    return apiFetch('/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
}
window.apiCreateArea = apiCreateArea;

export function apiDeleteArea(id) {
    return apiFetch(`/areas/${id}`, { method: 'DELETE' });
}
window.apiDeleteArea = apiDeleteArea;

export function apiContactLandlord(listingId, data) {
    return apiFetch(`/contact/${listingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}
window.apiContactLandlord = apiContactLandlord;

export function apiRegister(data) {
    return apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}
window.apiRegister = apiRegister;

export function apiLogin(data) {
    return apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}
window.apiLogin = apiLogin;

export function apiGetMe() {
    return apiFetch('/auth/me');
}
window.apiGetMe = apiGetMe;

export function apiGetFavorites() {
    return apiFetch('/favorites');
}
window.apiGetFavorites = apiGetFavorites;

export function apiAddFavorite(listingId) {
    return apiFetch(`/favorites/${listingId}`, { method: 'POST' });
}
window.apiAddFavorite = apiAddFavorite;

export function apiRemoveFavorite(listingId) {
    return apiFetch(`/favorites/${listingId}`, { method: 'DELETE' });
}
window.apiRemoveFavorite = apiRemoveFavorite;

export function apiGetUsers(adminKey) {
    return apiFetch('/auth/users', {
        headers: { 'X-Admin-Key': adminKey },
    });
}
window.apiGetUsers = apiGetUsers;

export function apiResetPassword(userId, newPassword, adminKey) {
    return apiFetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, new_password: newPassword, admin_key: adminKey }),
    });
}
window.apiResetPassword = apiResetPassword;

export function apiAdminLogin(adminKey) {
    return apiFetch('/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_key: adminKey }),
    });
}
window.apiAdminLogin = apiAdminLogin;

export function apiGetLandlordEnquiries() {
    return apiFetch('/contact/landlord-enquiries');
}
window.apiGetLandlordEnquiries = apiGetLandlordEnquiries;

export function apiGetLandlords() {
    return apiFetch('/auth/landlords');
}
window.apiGetLandlords = apiGetLandlords;

export function imageUrl(filename) {
    if (!filename) return '';
    if (filename.startsWith('http')) return filename;
    return `https://abwrnzlzuaswcppmhggi.supabase.co/storage/v1/object/public/listing-images/${filename}`;
}
window.imageUrl = imageUrl;

export async function apiFetchWithAdmin(path, options = {}) {
    const headers = { ...options.headers };
    if (AppState.adminToken) {
        headers['Authorization'] = `Bearer ${AppState.adminToken}`;
    }
    return apiFetch(path, { ...options, headers });
}
window.apiFetchWithAdmin = apiFetchWithAdmin;

const API_BASE = '/api';

async function apiFetch(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = { 'Accept': 'application/json', ...options.headers };

    if (AppState.authToken) {
        headers['Authorization'] = `Bearer ${AppState.authToken}`;
    }

    const res = await fetch(url, { headers, ...options });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Request failed (${res.status})`);
    }

    if (res.status === 204) return null;
    return res.json();
}

function apiGetListings(params = {}) {
    const qs = new URLSearchParams();
    if (params.city) qs.set('city', params.city);
    if (params.area) qs.set('area', params.area);
    if (params.min_price) qs.set('min_price', params.min_price);
    if (params.max_price) qs.set('max_price', params.max_price);
    if (params.listing_type) qs.set('listing_type', params.listing_type);
    if (params.verified) qs.set('verified', params.verified);
    if (params.search) qs.set('search', params.search);

    const query = qs.toString();
    return apiFetch(`/listings${query ? '?' + query : ''}`);
}

function apiGetListing(id) {
    return apiFetch(`/listings/${id}`);
}

async function apiCreateListing(formData) {
    const res = await fetch(`${API_BASE}/listings`, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Failed to create listing');
    }
    return res.json();
}

function apiUpdateListing(id, data) {
    return apiFetch(`/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

function apiDeleteListing(id) {
    return apiFetch(`/listings/${id}`, { method: 'DELETE' });
}

function apiGetAreas() {
    return apiFetch('/areas');
}

function apiCreateArea(name) {
    return apiFetch('/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
}

function apiDeleteArea(id) {
    return apiFetch(`/areas/${id}`, { method: 'DELETE' });
}

function apiContactLandlord(listingId, data) {
    return apiFetch(`/contact/${listingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

function apiRegister(data) {
    return apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

function apiLogin(data) {
    return apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

function apiGetMe() {
    return apiFetch('/auth/me');
}

function apiGetFavorites() {
    return apiFetch('/favorites');
}

function apiAddFavorite(listingId) {
    return apiFetch(`/favorites/${listingId}`, { method: 'POST' });
}

function apiRemoveFavorite(listingId) {
    return apiFetch(`/favorites/${listingId}`, { method: 'DELETE' });
}

function imageUrl(filename) {
    if (!filename) return '';
    if (filename.startsWith('http')) return filename;
    return `https://abwrnzlzuaswcppmhggi.supabase.co/storage/v1/object/public/listing-images/${filename}`;
}

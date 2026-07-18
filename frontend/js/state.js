const AppState = {
    currentArea: null,
    currentListing: null,
    listings: [],
    areas: [],
    editingListingId: null,

    adminLoggedIn: localStorage.getItem('admin_logged_in') === 'true',
    adminPassword: localStorage.getItem('admin_password') || 'admin123',

    authToken: localStorage.getItem('auth_token'),
    currentUser: null,
    isLoggedIn: !!localStorage.getItem('auth_token'),
    userRole: null,

    favoriteIds: new Set(),

    filters: {
        listing_type: null,
        min_price: null,
        max_price: null,
        search: null,
    },
};

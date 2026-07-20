export const AppState = {
    currentArea: null,
    currentListing: null,
    listings: [],
    areas: [],
    editingListingId: null,
    allUsers: [],
    enquiries: [],
    landlords: [],

    adminToken: localStorage.getItem('admin_token'),
    adminLoggedIn: !!localStorage.getItem('admin_token'),

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
window.AppState = AppState;

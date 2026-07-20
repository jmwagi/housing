function renderLoading() {
    return '<div class="loading">Loading...</div>';
}

function renderError(message) {
    return `<div class="error-state"><h3>Something went wrong</h3><p>${message}</p></div>`;
}

function isFavorited(listingId) {
    return AppState.favoriteIds.has(listingId);
}

function renderCard(listing) {
    const imgStyle = listing.images
        ? `style="background-image: url('${imageUrl(listing.images.split(',')[0])}');"`
        : '';
    const imgContent = listing.images
        ? ''
        : '<div class="placeholder-img"><i class="fas fa-home" style="font-size:2rem;color:#fff;"></i></div>';
    const verified = listing.verified
        ? '<span class="verified-badge">✓ Verified</span>'
        : '';
    const typeLabel = {
        bedsit: 'Bedsit',
        single_room: 'Single Room',
        one_bedroom: '1-Bedroom',
        hostel: 'Hostel',
    }[listing.listing_type] || listing.listing_type;

    const amenities = listing.amenities
        ? listing.amenities.split(',').map(a => `<span class="amenity">${a.trim()}</span>`).join('')
        : '';

    const favHeart = AppState.isLoggedIn
        ? `<span class="fav-heart ${isFavorited(listing.id) ? 'fav-active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${listing.id})">${isFavorited(listing.id) ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>'}</span>`
        : '';

    return `
        <div class="card" onclick="navigate('#/listing/${listing.id}')">
            <div class="card-img" ${imgStyle}>
                ${favHeart}
                ${imgContent}
                ${verified}
            </div>
            <div class="card-content">
                <div class="price">KSh ${listing.price.toLocaleString()} / month</div>
                <div class="title">${listing.title}</div>
                <div class="location"><i class="fas fa-map-marker-alt" style="color:#e74c3c;"></i> ${listing.area}, ${listing.city}</div>
                <div class="amenities">${amenities}</div>
            </div>
        </div>
    `;
}

function renderHome() {
    const areas = AppState.areas;
    const listings = AppState.listings.slice(0, 6);

    const areaCards = areas.length
        ? areas.map(a => `
            <div class="city-card" onclick="navigate('#/browse?area=${encodeURIComponent(a.name)}')">
                <div class="icon"><i class="fas fa-map-marker-alt" style="color:#e74c3c;"></i></div>
                <div class="name">${a.name}</div>
                <div class="count">${a.count} listing${a.count !== 1 ? 's' : ''}</div>
            </div>
        `).join('')
        : '<p>No areas yet. Be the first to list!</p>';

    const featuredListings = listings.length
        ? listings.map(renderCard).join('')
        : '<div class="empty-state">No listings yet. Check back soon!</div>';

    return `
        <section class="hero">
            <h2>Find Student Housing Near University of Embu</h2>
            <p>Verified bedsits, single rooms, and apartments in Embu town and surrounding areas.</p>
            <div class="search-container">
                <input type="text" id="home-search" placeholder="Search by area or estate name..." onkeydown="if(event.key==='Enter') doHomeSearch()">
                <button onclick="doHomeSearch()">Search</button>
            </div>
        </section>
        <div class="container">
            <h3 style="margin-bottom:1rem;">Browse by Area</h3>
            <div class="city-grid">${areaCards}</div>
            <h3 style="margin-bottom:1rem;">Featured Listings</h3>
            <div class="listings-grid">${featuredListings}</div>
        </div>
    `;
}

function doHomeSearch() {
    const q = document.getElementById('home-search')?.value.trim();
    if (q) {
        navigate(`#/browse?search=${encodeURIComponent(q)}`);
    }
}

function doBrowseSearch() {
    const q = document.getElementById('browse-search-input')?.value.trim();
    if (q) {
        AppState.filters.search = q;
    } else {
        AppState.filters.search = null;
    }
    navigateToBrowse();
}

function renderBrowse() {
    const listings = AppState.listings;
    const activeType = AppState.filters.listing_type;
    const activeSearch = AppState.filters.search || '';
    const activeMin = AppState.filters.min_price;
    const activeMax = AppState.filters.max_price;
    const activeArea = AppState.currentArea;

    const title = activeArea
        ? `Listings in ${activeArea}`
        : 'All Listings in Embu';

    const typeDropdown = `
        <select class="filter-select" onchange="setFilter('listing_type', this.value)">
            <option value="" ${!activeType ? 'selected' : ''}>All Types</option>
            <option value="bedsit" ${activeType === 'bedsit' ? 'selected' : ''}>Bedsits</option>
            <option value="single_room" ${activeType === 'single_room' ? 'selected' : ''}>Single Rooms</option>
            <option value="one_bedroom" ${activeType === 'one_bedroom' ? 'selected' : ''}>1-Bedroom</option>
            <option value="hostel" ${activeType === 'hostel' ? 'selected' : ''}>Hostels</option>
        </select>
    `;

    const priceDropdown = `
        <select class="filter-select" onchange="onPriceSelect(this.value)">
            <option value="" ${!activeMin && !activeMax ? 'selected' : ''}>Any Price</option>
            <option value="0-5000" ${activeMin === null && activeMax === 5000 ? 'selected' : ''}>Under KSh 5,000</option>
            <option value="5000-8000" ${activeMin === 5000 && activeMax === 8000 ? 'selected' : ''}>KSh 5,000 - 8,000</option>
            <option value="8000-" ${activeMin === 8000 && activeMax === null ? 'selected' : ''}>KSh 8,000+</option>
        </select>
    `;

    const listingsHtml = listings.length
        ? listings.map(renderCard).join('')
        : '<div class="empty-state">No listings match your filters. Try adjusting them!</div>';

    const areaOptions = AppState.areas && AppState.areas.length
        ? `<option value="">All Areas</option>
            ${AppState.areas.map(a =>
                `<option value="${a.name}"${a.name === activeArea ? ' selected' : ''}>${a.name} (${a.count})</option>`
            ).join('')}`
        : '';

    return `
        <div class="container">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem;">
                <h2>${title}</h2>
            </div>
            <div class="browse-search">
                <input type="text" id="browse-search-input" placeholder="Search by title, area, description, or amenity..." value="${activeSearch}" onkeydown="if(event.key==='Enter') doBrowseSearch()">
                <button onclick="doBrowseSearch()"><i class="fas fa-search"></i> Search</button>
            </div>
            <div class="filters">
                <span>Area:</span>
                <select class="filter-select" onchange="setFilter('area', this.value)">
                    ${areaOptions}
                </select>
            </div>
            <div class="filters">
                ${typeDropdown}
                ${priceDropdown}
            </div>
            ${activeSearch ? `<p style="margin-bottom:1rem;color:#666;">Search results for: <strong>"${activeSearch}"</strong></p>` : ''}
            <div class="listings-grid">${listingsHtml}</div>
        </div>
    `;
}

function renderDetail() {
    const l = AppState.currentListing;
    if (!l) return renderError('Listing not found.');

    const imgStyle = l.images
        ? `style="background-image: url('${imageUrl(l.images.split(',')[0])}');"`
        : '';
    const imgContent = l.images
        ? ''
        : '<div class="placeholder-img"><i class="fas fa-home" style="font-size:3rem;color:#fff;"></i></div>';
    const verified = l.verified
        ? '<span class="verified-badge" style="font-size:0.85rem;">✓ Verified</span>'
        : '';

    const typeLabel = {
        bedsit: 'Bedsit',
        single_room: 'Single Room',
        one_bedroom: '1-Bedroom',
        hostel: 'Hostel',
    }[l.listing_type] || l.listing_type;

    const amenities = l.amenities
        ? l.amenities.split(',').map(a => `<span class="amenity">${a.trim()}</span>`).join('')
        : '<p style="color:#888;">No amenities listed.</p>';

    const description = l.description || 'No description provided.';

    const contactForm = AppState.isLoggedIn ? `
        <div class="contact-section">
            <h3><i class="fas fa-envelope"></i> Contact Landlord</h3>
            <form id="contact-form" onsubmit="submitContact(event, ${l.id})">
                <div class="form-group">
                    <label>Your Name</label>
                    <input type="text" id="contact-name" required placeholder="e.g. John Kimani">
                </div>
                <div class="form-group">
                    <label>Your Phone Number</label>
                    <input type="tel" id="contact-phone" required placeholder="e.g. 0712345678">
                </div>
                <div class="form-group">
                    <label>Message (optional)</label>
                    <textarea id="contact-msg" placeholder="Hi, I'm interested in this room. Is it still available?"></textarea>
                </div>
                <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-paper-plane"></i> Send Enquiry</button>
            </form>
            <div id="contact-result" style="margin-top:1rem;"></div>
        </div>
    ` : `
        <div class="contact-section" style="text-align:center;padding:1.5rem;background:#f9f9f9;border-radius:8px;">
            <p style="margin-bottom:0.8rem;"><i class="fas fa-sign-in-alt" style="font-size:1.5rem;color:#2E7D32;"></i></p>
            <p style="font-weight:600;color:#333;">Sign in to contact the landlord</p>
            <p style="font-size:0.9rem;color:#888;margin-bottom:1rem;">Create a free account to send enquiries and save your favourite listings.</p>
            <a href="#/login" onclick="navigate('#/login')" class="btn btn-primary" style="text-decoration:none;display:inline-block;"><i class="fas fa-sign-in-alt"></i> Sign In</a>
            <a href="#/register" onclick="navigate('#/register')" class="btn" style="text-decoration:none;display:inline-block;margin-left:0.5rem;background:#eee;"><i class="fas fa-user-plus"></i> Join Free</a>
        </div>
    `;

    return `
        <div class="detail-container">
            <div class="back-link" onclick="navigate('#/browse${AppState.currentArea ? '?area=' + encodeURIComponent(AppState.currentArea) : ''}")"><i class="fas fa-arrow-left"></i> Back to listings</div>
            <div class="detail-card">
                <div class="detail-img" ${imgStyle}>${imgContent}</div>
                <div class="detail-body">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;">
                        <div class="price">KSh ${l.price.toLocaleString()} / month</div>
                        ${AppState.isLoggedIn ? `<button class="btn btn-sm ${isFavorited(l.id) ? 'btn-primary' : ''}" onclick="toggleFavorite(${l.id})" style="font-size:1rem;">${isFavorited(l.id) ? '<i class="fas fa-heart"></i> Saved' : '<i class="far fa-heart"></i> Save'}</button>` : ''}
                    </div>
                    <div class="title">${l.title}</div>
                    <div class="location"><i class="fas fa-map-marker-alt" style="color:#e74c3c;"></i> ${l.area}, ${l.city} ${verified}</div>
                    <div class="detail-meta">
                        <div class="meta-item"><div class="label">Type</div><div class="value">${typeLabel}</div></div>
                        <div class="meta-item"><div class="label">Landlord</div><div class="value">${l.landlord_name}</div></div>
                        <div class="meta-item"><div class="label">Listed</div><div class="value">${new Date(l.created_at).toLocaleDateString()}</div></div>
                    </div>
                    <div class="description">${description}</div>
                    <h4 style="margin-bottom:0.5rem;">Amenities</h4>
                    <div class="amenities-list">${amenities}</div>
                    ${l.latitude && l.longitude ? `
                    <div class="map-section">
                        <h4 style="margin-bottom:0.5rem;"><i class="fas fa-map-marker-alt" style="color:#e74c3c;"></i> Location</h4>
                        <div id="detail-map" class="detail-map"></div>
                        <p id="distance-text" style="font-size:0.85rem;color:#555;margin-top:0.3rem;"></p>
                    </div>
                    ` : ''}
                    ${contactForm}
                </div>
            </div>
        </div>
    `;
}

function getAreaOptions(selected) {
    const areas = AppState.areas;
    if (areas.length) {
        return areas.map(a =>
            `<option value="${a.name}"${a.name === selected ? ' selected' : ''}>${a.name}</option>`
        ).join('');
    }
    const fallback = ['Gakwegori','Kangaru','Njukiri','Iveche','Kamiu','Koimugo','Town','Karurumo','Kanyakumu','Kianjokoma'];
    return fallback.map(a =>
        `<option value="${a}"${a === selected ? ' selected' : ''}>${a}</option>`
    ).join('');
}

function renderAddListing() {
    const nameValue = AppState.isLoggedIn && AppState.currentUser ? `value="${AppState.currentUser.full_name.replace(/"/g, '&quot;')}"` : '';
    const phoneValue = AppState.isLoggedIn && AppState.currentUser ? `value="${AppState.currentUser.phone.replace(/"/g, '&quot;')}"` : '';
    return `
        <div class="form-container">
            <h2>List Your Room in Embu</h2>
            <p style="margin-bottom:1.5rem;color:#666;">Fill in the details below. Rooms with photos and verifications get more views from University of Embu students.</p>
            <form id="add-listing-form" onsubmit="submitListing(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label>Title *</label>
                        <input type="text" id="add-title" required placeholder="e.g. Modern Tiled Bedsit">
                    </div>
                    <div class="form-group">
                        <label>Price (KSh) *</label>
                        <input type="number" id="add-price" required min="1" placeholder="e.g. 4500">
                    </div>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="add-description" rows="3" placeholder="Describe the room, location, nearby amenities..."></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Area / Estate *</label>
                        <select id="add-area" required>
                            <option value="">Select area...</option>
                            ${getAreaOptions()}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Type *</label>
                        <select id="add-type" required>
                            <option value="">Select type...</option>
                            <option value="bedsit">Bedsit</option>
                            <option value="single_room">Single Room</option>
                            <option value="one_bedroom">1-Bedroom</option>
                            <option value="hostel">Hostel</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Amenities</label>
                    <input type="text" id="add-amenities" placeholder="e.g. Wi-Fi, Inside Water, Gated Security">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Latitude</label>
                        <input type="text" id="add-latitude" placeholder="e.g. -0.5397 (optional)">
                    </div>
                    <div class="form-group">
                        <label>Longitude</label>
                        <input type="text" id="add-longitude" placeholder="e.g. 37.4598 (optional)">
                    </div>
                </div>
                <p style="font-size:0.8rem;color:#888;margin-top:-0.5rem;margin-bottom:1rem;"><i class="fas fa-map-marker-alt" style="color:#e74c3c;"></i> Pin your listing on the map. <a href="https://www.google.com/maps" target="_blank">Open Google Maps</a>, right-click your location and select <em>"What's here?"</em> to get coordinates.</p>
                <div class="form-group">
                    <label>Photos *</label>
                    <input type="file" id="add-images" accept="image/*" multiple capture="environment" required>
                </div>

                <input type="hidden" id="add-city" value="Embu">

                <hr style="margin:1.5rem 0;border:none;border-top:1px solid #eee;">
                <h4 style="margin-bottom:1rem;">Your Contact Details</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Your Name *</label>
                        <input type="text" id="add-landlord-name" required placeholder="e.g. Jane Wanjiku" ${nameValue}>
                    </div>
                    <div class="form-group">
                        <label>Phone Number *</label>
                        <input type="tel" id="add-landlord-phone" required placeholder="e.g. 0712345678" ${phoneValue}>
                    </div>
                </div>
                ${!AppState.isLoggedIn ? '' : '<p style="font-size:0.85rem;color:#888;margin-top:0.5rem;">Your name and phone are pre-filled from your account.</p>'}
                <button type="submit" class="btn btn-primary btn-block" style="margin-top:1rem;">Submit Listing</button>
            </form>
            <div id="add-result" style="margin-top:1rem;"></div>
        </div>
    `;
}

function renderFavorites() {
    const favs = AppState.favorites || [];

    if (!favs.length) {
        return `
            <div class="container" style="text-align:center;padding:4rem 1rem;">
                <h2><i class="fas fa-heart" style="color:#e74c3c;"></i> Saved Listings</h2>
                <p style="color:#888;margin-top:1rem;">You haven't saved any listings yet.</p>
                <a href="#/browse" onclick="navigate('#/browse')" style="display:inline-block;margin-top:1rem;font-weight:600;"><i class="fas fa-search"></i> Browse Listings</a>
            </div>
        `;
    }

    const listingsHtml = favs
        .map(f => renderCard(f.listing || f))
        .join('');

    return `
        <div class="container">
            <h2 style="margin-bottom:1rem;"><i class="fas fa-heart" style="color:#e74c3c;"></i> Saved Listings</h2>
            <div class="listings-grid">${listingsHtml}</div>
        </div>
    `;
}

function renderAbout() {
    return `
        <div class="about-container">
            <div class="about-card">
                <h2><i class="fas fa-home" style="color:#2E7D32;"></i> About Keja Go</h2>
                <p>Keja Go helps University of Embu students find safe, affordable, and verified housing near campus. We focus on Embu town and surrounding areas — from Gakwegori to Kangaru, Njukiri to Town.</p>
                <p>We partner with trusted landlords and verify listings so you can focus on your studies, not your housing.</p>
            </div>
            <div class="about-card">
                <h2><i class="fas fa-shield-alt" style="color:#2E7D32;"></i> Safety Tips for Students</h2>
                <ul>
                    <li><strong>Always view the room in person</strong> or request a video tour before paying anything.</li>
                    <li><strong>Never pay</strong> a deposit before viewing the property.</li>
                    <li><strong>Get a written agreement</strong> — a simple contract protects both you and the landlord.</li>
                    <li><strong>Check the neighbourhood</strong> — visit during the day and evening to assess safety.</li>
                    <li><strong>Ask about utilities</strong> — water, electricity, and Wi-Fi costs can add up.</li>
                    <li><strong>Share your location</strong> — let a friend or family member know where you're moving.</li>
                </ul>
            </div>
            <div class="about-card">
                <h2><i class="fas fa-users" style="color:#2E7D32;"></i> For Landlords</h2>
                <p>Have a room near University of Embu? List it for free on Keja Go and reach thousands of students actively looking for housing.</p>
                <p><a href="#/add" onclick="navigate('#/add')">List your room now <i class="fas fa-arrow-right"></i></a></p>
            </div>
            <div class="about-card">
                <h2><i class="fas fa-phone" style="color:#2E7D32;"></i> Contact Us</h2>
                <p>Have feedback or need help? Reach out to us on WhatsApp:</p>
                <p style="margin-top:0.5rem;">
                    <a href="https://wa.me/254799307739" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:0.5rem;background:#25D366;color:white;padding:0.7rem 1.5rem;border-radius:6px;font-weight:600;font-size:1rem;">
                        <i class="fab fa-whatsapp" style="font-size:1.3rem;"></i> Chat with us on WhatsApp
                    </a>
                </p>
                <p style="margin-top:0.8rem;font-size:0.85rem;color:#888;">Our team is available Monday–Saturday, 8 AM – 6 PM. We typically respond within a few hours.</p>
            </div>
        </div>
    `;
}

function renderLogin() {
    return `
        <div class="login-container">
            <div class="login-card">
                <h2 style="text-align:center;margin-bottom:0.5rem;">Welcome Back</h2>
                <p style="text-align:center;color:#666;margin-bottom:1.5rem;">Sign in to your Keja Go account</p>
                <form id="login-form" onsubmit="event.preventDefault(); handleLogin()">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="login-email" required placeholder="you@example.com">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="login-password" required placeholder="Enter your password">
                    </div>
                    <div style="text-align:right;margin-bottom:1rem;">
                        <a href="https://wa.me/254799307739?text=Hello%20Keja%20Go%2C%20I%20need%20help%20resetting%20my%20password" target="_blank" rel="noopener noreferrer" style="font-size:0.85rem;color:#25D366;"><i class="fab fa-whatsapp"></i> Forgot password?</a>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Sign In</button>
                    <div id="login-error" style="color:#c62828;margin-top:0.8rem;display:none;"></div>
                </form>
                <p style="text-align:center;margin-top:1.2rem;font-size:0.9rem;">
                    Don't have an account? <a href="#/register" onclick="navigate('#/register')">Create one</a>
                </p>
            </div>
        </div>
    `;
}

function renderRegister() {
    return `
        <div class="login-container">
            <div class="login-card" style="max-width:480px;">
                <h2 style="text-align:center;margin-bottom:0.5rem;">Create Account</h2>
                <p style="text-align:center;color:#666;margin-bottom:1.5rem;">Join Keja Go as a student or landlord</p>
                <form id="register-form" onsubmit="event.preventDefault(); handleRegister()">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" id="reg-name" required placeholder="e.g. John Kamau">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="reg-email" required placeholder="you@example.com">
                    </div>
                    <div class="form-group">
                        <label>Phone Number</label>
                        <input type="tel" id="reg-phone" required placeholder="0712 345 678">
                    </div>
                    <div class="form-group">
                        <label>I am a...</label>
                        <select id="reg-role" onchange="document.getElementById('reg-id-number-wrap').style.display=this.value==='landlord'?'block':'none'">
                            <option value="student">Student looking for housing</option>
                            <option value="landlord">Landlord with rooms to list</option>
                        </select>
                    </div>
                    <div class="form-group" id="reg-id-number-wrap" style="display:none;">
                        <label>National ID Number</label>
                        <input type="text" id="reg-id-number" placeholder="e.g. 12345678">
                        <span style="font-size:0.8rem;color:#888;">Required for landlord accounts — helps us prevent scams.</span>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="reg-password" required minlength="4" placeholder="At least 4 characters">
                    </div>
                    <div class="form-group" style="font-size:0.85rem;">
                        <label style="display:flex;align-items:flex-start;gap:8px;font-weight:normal;cursor:pointer;">
                            <input type="checkbox" id="reg-terms" style="margin-top:3px;">
                            I agree to the <a href="#/terms" onclick="navigate('#/terms')">Terms of Service</a> and <a href="#/privacy" onclick="navigate('#/privacy')">Privacy Policy</a>
                        </label>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Create Account</button>
                    <div id="register-error" style="color:#c62828;margin-top:0.8rem;display:none;"></div>
                </form>
                <p style="text-align:center;margin-top:1.2rem;font-size:0.9rem;">
                    Already have an account? <a href="#/login" onclick="navigate('#/login')">Sign in</a>
                </p>
            </div>
        </div>
    `;
}

function renderAdminLogin() {
    return `
        <div class="login-container">
            <div class="login-card">
                <h2><i class="fas fa-lock" style="color:#2E7D32;"></i> Admin Access</h2>
                <p style="color:#666;margin-bottom:1.5rem;">Enter the admin password to manage listings and areas.</p>
                <form id="admin-login-form" onsubmit="event.preventDefault(); adminLogin()">
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="admin-login-password" required placeholder="Enter admin password" autofocus>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Unlock Dashboard</button>
                    <div id="admin-login-error" style="color:#c62828;margin-top:0.8rem;display:none;"></div>
                </form>
            </div>
        </div>
    `;
}

function renderAdminUsers() {
    const users = AppState.allUsers || [];
    const rows = users.length
        ? users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${u.full_name}</td>
                <td>${u.email}</td>
                <td>${u.phone || '-'}</td>
                <td><span class="admin-role-badge ${u.role}">${u.role}</span></td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="6" style="text-align:center;color:#888;">No registered users yet.</td></tr>';

    return `
        <div class="admin-section">
            <h3><i class="fas fa-users" style="color:#2E7D32;"></i> Registered Users</h3>
            <p class="admin-hint">All students and landlords registered on the platform.</p>
            <div class="admin-table-wrapper">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Role</th>
                            <th>Registered</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function renderAdminResetPassword() {
    const users = AppState.allUsers || [];
    const options = users.length
        ? `<option value="">Select a user...</option>
            ${users.map(u => `<option value="${u.id}">${u.full_name} (${u.email}) — ${u.role}</option>`).join('')}`
        : '<option value="">No users found</option>';

    return `
        <div class="admin-section">
            <h3><i class="fas fa-key" style="color:#e67e22;"></i> Reset User Password</h3>
            <p class="admin-hint">Select a user and set a new password. Share the new password with them over WhatsApp or phone.</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;max-width:400px;">
                <select id="reset-user-id" style="padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
                    ${options}
                </select>
                <input type="text" id="reset-new-password" placeholder="New password (at least 4 characters)" required style="padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
                <button class="btn btn-primary btn-sm" onclick="adminResetPassword()">Reset Password</button>
                <div id="admin-reset-result" style="margin-top:0.5rem;"></div>
            </div>
        </div>
    `;
}

function renderAdmin() {
    const listings = AppState.listings;
    const areas = AppState.areas;
    const editId = AppState.editingListingId;
    const editListing = editId ? listings.find(l => l.id === editId) : null;

    const users = AppState.allUsers || [];
    const totalListings = listings.length;
    const verifiedCount = listings.filter(l => l.verified).length;
    const areaCount = areas.length;
    const userCount = users.length;

    const statsHtml = `
        <div class="admin-stats">
            <div class="admin-stat-card">
                <span class="admin-stat-number">${totalListings}</span>
                <span class="admin-stat-label">Total Listings</span>
            </div>
            <div class="admin-stat-card">
                <span class="admin-stat-number">${verifiedCount}</span>
                <span class="admin-stat-label">Verified</span>
            </div>
            <div class="admin-stat-card">
                <span class="admin-stat-number">${userCount}</span>
                <span class="admin-stat-label">Users</span>
            </div>
            <div class="admin-stat-card">
                <span class="admin-stat-number">${areaCount}</span>
                <span class="admin-stat-label">Areas</span>
            </div>
        </div>
    `;

    const areaBadges = areas.length
        ? areas.map(a => `<span class="admin-area-badge">${a.name}: ${a.count}</span>`).join('')
        : '<span style="color:#888;">No areas found.</span>';

    const areaManagementHtml = `
        <div class="admin-section">
            <h3>Manage Areas</h3>
            <p class="admin-hint">Areas are the neighbourhoods that appear in the add-listing dropdown. To add a new area, type a name and click "Add Area". To delete an area, click <i class="fas fa-times"></i> — only empty areas (0 listings) can be deleted.</p>
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
                ${areas.length
                    ? areas.map(a => `
                        <div class="admin-area-item">
                            <span>${a.name} (${a.count})</span>
                            <button class="btn btn-xs btn-danger" onclick="deleteArea(${a.id})" ${a.count > 0 ? 'disabled title="Cannot delete: ${a.count} listing(s) use this area"' : 'title="Delete area"'}><i class="fas fa-times"></i></button>
                        </div>
                    `).join('')
                    : '<span style="color:#888;">No areas. Add one below.</span>'
                }
            </div>
            <form onsubmit="event.preventDefault(); addArea()" style="display:flex;gap:0.5rem;max-width:400px;">
                <input type="text" id="admin-new-area-name" placeholder="New area name (e.g. Ruguru)" required style="flex:1;padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
                <button type="submit" class="btn btn-primary btn-sm">Add Area</button>
            </form>
            <div id="admin-area-result" style="margin-top:0.5rem;"></div>
        </div>
    `;

    const changePasswordHtml = `
        <div class="admin-section">
            <h3>Change Password</h3>
            <form id="admin-change-password-form" onsubmit="event.preventDefault(); changePassword()" style="display:flex;flex-direction:column;gap:0.5rem;max-width:400px;">
                <input type="password" id="admin-current-password" placeholder="Current password" required style="padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
                <input type="password" id="admin-new-password" placeholder="New password" required style="padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
                <input type="password" id="admin-confirm-password" placeholder="Confirm new password" required style="padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
                <button type="submit" class="btn btn-primary btn-sm">Update Password</button>
                <div id="admin-password-result" style="margin-top:0.5rem;"></div>
            </form>
        </div>
    `;

    const editImagesHtml = editListing && editListing.images
        ? `<div style="margin-bottom:0.8rem;">
            <label style="font-weight:600;font-size:0.9rem;display:block;margin-bottom:0.3rem;">Current Images</label>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                ${editListing.images.split(',').map(f =>
                    f.trim() ? `<img src="${imageUrl(f.trim())}" style="width:100px;height:75px;object-fit:cover;border-radius:4px;border:1px solid #ddd;">` : ''
                ).join('')}
            </div>
            <span style="font-size:0.8rem;color:#888;">To change images, delete and re-create the listing.</span>
        </div>`
        : '';

    const editFormHtml = editListing ? `
        <div class="admin-edit-panel">
            <h3>Editing: ${editListing.title}</h3>
            <form id="admin-edit-form" onsubmit="event.preventDefault(); saveEdit(${editListing.id})">
                ${editImagesHtml}
                <div class="form-row">
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" id="admin-edit-title" value="${editListing.title.replace(/"/g, '&quot;')}" required>
                    </div>
                    <div class="form-group">
                        <label>Price (KSh)</label>
                        <input type="number" id="admin-edit-price" value="${editListing.price}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Area</label>
                        <select id="admin-edit-area">
                            ${getAreaOptions(editListing.area)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Type</label>
                        <select id="admin-edit-type">
                            ${['bedsit','single_room','one_bedroom','hostel']
                                .map(t => `<option value="${t}"${t === editListing.listing_type ? ' selected' : ''}>${t.replace('_', ' ')}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Landlord Name</label>
                        <input type="text" id="admin-edit-landlord-name" value="${editListing.landlord_name.replace(/"/g, '&quot;')}">
                    </div>
                    <div class="form-group">
                        <label>Landlord Phone</label>
                        <input type="text" id="admin-edit-landlord-phone" value="${editListing.landlord_phone.replace(/"/g, '&quot;')}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Amenities (comma-separated)</label>
                    <input type="text" id="admin-edit-amenities" value="${editListing.amenities.replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group">
                    <label style="display:flex;align-items:center;gap:0.5rem;">
                        <input type="checkbox" id="admin-edit-verified"${editListing.verified ? ' checked' : ''}>
                        Verified listing
                    </label>
                </div>
                <div style="display:flex;gap:0.5rem;margin-top:1rem;">
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                    <button type="button" class="btn" onclick="cancelEdit()">Cancel</button>
                </div>
            </form>
        </div>
    ` : '';

    const tableRows = listings.length
        ? listings.map(l => {
            const isEditing = l.id === editId;
            const rowClass = isEditing ? 'admin-row-editing' : '';
            const verifiedLabel = l.verified
                ? '<span style="color:#2E7D32;font-weight:600;"><i class="fas fa-check" style="color:#2E7D32;"></i> Yes</span>'
                : '<span style="color:#999;"><i class="fas fa-times" style="color:#999;"></i> No</span>';
            return `
                <tr class="${rowClass}">
                    <td>${l.id}</td>
                    <td>${l.title}</td>
                    <td>${l.area}</td>
                    <td>KSh ${l.price.toLocaleString()}</td>
                    <td>${l.listing_type}</td>
                    <td>${l.landlord_name}</td>
                    <td>${l.landlord_phone}</td>
                    <td>${verifiedLabel}</td>
                    <td class="admin-actions">
                        <button class="btn btn-sm" onclick="navigate('#/listing/${l.id}')"><i class="fas fa-eye"></i> View</button>
                        <button class="btn btn-sm" onclick="editListing(${l.id})"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-sm ${l.verified ? 'btn-warning' : 'btn-primary'}" onclick="toggleVerify(${l.id}, ${l.verified})">
                            ${l.verified ? 'Unverify' : 'Verify'}
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteListing(${l.id})"><i class="fas fa-trash"></i> Delete</button>
                    </td>
                </tr>
            `;
        }).join('')
        : '<tr><td colspan="9" style="text-align:center;color:#888;">No listings found.</td></tr>';

    return `
        <div class="admin-container">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
                <h2>Admin Dashboard</h2>
                <button class="btn btn-sm btn-danger" onclick="adminLogout()" style="font-size:0.85rem;"><i class="fas fa-sign-out-alt"></i> Logout</button>
            </div>
            <div class="admin-section admin-intro">
                <p>Manage listings and areas on Keja Go. Use the table below to edit, verify, or delete listings. Use the <strong>Manage Areas</strong> section to add or remove neighbourhoods — new areas appear immediately in the add-listing form dropdown.</p>
            </div>
            ${statsHtml}
            ${renderAdminUsers()}
            ${areaManagementHtml}
            ${renderAdminResetPassword()}
            ${changePasswordHtml}
            ${editFormHtml}
            <div class="admin-table-wrapper">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Area</th>
                            <th>Price</th>
                            <th>Type</th>
                            <th>Landlord</th>
                            <th>Phone</th>
                            <th>Verified</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function renderMyListings() {
    const listings = AppState.listings;
    const rows = listings.length
        ? listings.map(l => {
            const verifiedBadge = l.verified
                ? '<span style="color:#2E7D32;font-weight:600;"><i class="fas fa-check-circle" style="color:#2E7D32;"></i> Verified</span>'
                : '<span style="color:#999;">Pending verification</span>';
            return `
                <tr>
                    <td>${l.id}</td>
                    <td>${l.title}</td>
                    <td>${l.area}</td>
                    <td>KSh ${l.price.toLocaleString()}</td>
                    <td>${l.listing_type}</td>
                    <td>${verifiedBadge}</td>
                    <td class="admin-actions">
                        <button class="btn btn-sm" onclick="navigate('#/listing/${l.id}')"><i class="fas fa-eye"></i> View</button>
                        <button class="btn btn-sm" onclick="editMyListing(${l.id})"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteMyListing(${l.id})"><i class="fas fa-trash"></i> Delete</button>
                    </td>
                </tr>
            `;
        }).join('')
        : '<tr><td colspan="7" style="text-align:center;color:#888;">You haven\'t listed any rooms yet.</td></tr>';

    const editId = AppState.editingListingId;
    const editListing = editId ? listings.find(l => l.id === editId) : null;
    const editFormHtml = editListing ? `
        <div class="admin-edit-panel">
            <h3>Editing: ${editListing.title}</h3>
            <form id="my-edit-form" onsubmit="event.preventDefault(); saveMyEdit(${editListing.id})">
                <div class="form-row">
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" id="my-edit-title" value="${editListing.title.replace(/"/g, '&quot;')}" required>
                    </div>
                    <div class="form-group">
                        <label>Price (KSh)</label>
                        <input type="number" id="my-edit-price" value="${editListing.price}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Area</label>
                        <select id="my-edit-area">
                            ${getAreaOptions(editListing.area)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Type</label>
                        <select id="my-edit-type">
                            ${['bedsit','single_room','one_bedroom','hostel']
                                .map(t => `<option value="${t}"${t === editListing.listing_type ? ' selected' : ''}>${t.replace('_', ' ')}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Amenities (comma-separated)</label>
                        <input type="text" id="my-edit-amenities" value="${editListing.amenities.replace(/"/g, '&quot;')}">
                    </div>
                </div>
                <div style="display:flex;gap:0.5rem;margin-top:1rem;">
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                    <button type="button" class="btn" onclick="cancelMyEdit()">Cancel</button>
                </div>
                <div id="my-edit-result" style="margin-top:0.5rem;"></div>
            </form>
        </div>
    ` : '';

    return `
        <div class="admin-container">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
                <h2>My Listings</h2>
                <a href="#/add" class="btn btn-primary" onclick="navigate('#/add')">+ Add New Listing</a>
            </div>
            <div class="admin-section" style="margin-top:1rem;">
                <p style="color:#666;">Manage your rental listings below. New listings start as "Pending verification" until an admin approves them.</p>
            </div>
            ${editFormHtml}
            <div class="admin-table-wrapper" style="margin-top:1rem;">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Area</th>
                            <th>Price</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function initDetailMap() {
    const el = document.getElementById('detail-map');
    if (!el) return;

    if (el._leaflet_map) {
        el._leaflet_map.invalidateSize();
        return;
    }

    const l = AppState.currentListing;
    if (!l || !l.latitude || !l.longitude) return;

    const lat = parseFloat(l.latitude);
    const lng = parseFloat(l.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    const map = L.map(el, { zoomControl: false }).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
    }).addTo(map);
    L.marker([lat, lng]).addTo(map);

    const uoe = L.latLng(-0.5397, 37.4598);
    const dist = map.distance(uoe, L.latLng(lat, lng));
    const km = (dist / 1000).toFixed(1);
    const distEl = document.getElementById('distance-text');
    if (distEl) distEl.innerHTML = '<i class="fas fa-university" style="color:#2E7D32;"></i> ' + km + ' km from University of Embu';

    el._leaflet_map = map;
    setTimeout(() => map.invalidateSize(), 200);
}

function renderTerms() {
    return `
        <div class="about-container">
            <div class="about-card">
                <h2>Terms of Service</h2>
                <p><em>Last updated: July 2026</em></p>
                <h3>1. Acceptance of Terms</h3>
                <p>By using Keja Go, you agree to these Terms of Service. If you do not agree, do not use the platform.</p>
                <h3>2. Description of Service</h3>
                <p>Keja Go connects students with verified housing listings near University of Embu. We are a listing platform only — we do not own, manage, or lease any property listed on the site.</p>
                <h3>3. User Responsibilities</h3>
                <p>You agree to provide accurate information when creating an account or listing a property. Landlords are responsible for the accuracy of their listings. Students should always view a property in person before making any payment.</p>
                <h3>4. Prohibited Conduct</h3>
                <p>You may not use Keja Go for fraudulent activity, misrepresent a property, or attempt to harm other users or the platform itself.</p>
                <h3>5. Limitation of Liability</h3>
                <p>Keja Go is not liable for any disputes, damages, or losses arising from interactions between users. All property arrangements are solely between the landlord and tenant.</p>
                <h3>6. Changes to Terms</h3>
                <p>We reserve the right to update these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
                <p style="margin-top:1.5rem;"><a href="#/register" onclick="navigate('#/register')">&larr; Back to registration</a></p>
            </div>
        </div>
    `;
}

function renderPrivacy() {
    return `
        <div class="about-container">
            <div class="about-card">
                <h2>Privacy Policy</h2>
                <p><em>Last updated: July 2026</em></p>
                <h3>1. Information We Collect</h3>
                <p>We collect information you provide when creating an account: name, email, phone number, role (student or landlord), and national ID (landlords only). We also collect listing data submitted by landlords.</p>
                <h3>2. How We Use Your Information</h3>
                <p>Your information is used to operate the platform, verify listings, facilitate communication between students and landlords, and improve our services.</p>
                <h3>3. Data Sharing</h3>
                <p>We do not sell your personal data. Listing information (including landlord contact details) is displayed publicly on the platform to enable students to inquire about properties.</p>
            </div>
        </div>
    `;
}

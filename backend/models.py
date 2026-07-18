LISTINGS_COLUMNS = [
    "id", "title", "description", "price", "city", "area",
    "latitude", "longitude", "listing_type", "amenities", "images",
    "verified", "landlord_name", "landlord_phone", "owner_id",
    "created_at", "updated_at",
]

AREAS_COLUMNS = ["id", "name", "latitude", "longitude"]

USERS_COLUMNS = [
    "id", "email", "password_hash", "full_name", "phone",
    "role", "id_number", "is_verified", "created_at",
]

FAVORITES_COLUMNS = ["id", "user_id", "listing_id", "created_at"]

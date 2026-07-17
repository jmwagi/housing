"""
  =====================================================
  listings.py — Listing CRUD API Routes
  =====================================================
  This router handles ALL operations related to listings:
  - GET  /api/listings       → List listings (with filters)
  - GET  /api/listings/:id   → Get one listing
  - POST /api/listings       → Create a listing
  - PUT  /api/listings/:id   → Update a listing
  - DELETE /api/listings/:id → Delete a listing

  CRUD stands for Create, Read, Update, Delete.
  These are the four basic operations for persistent storage.

  Each route function is an async Python function that:
  1. Receives URL parameters and/or request body
  2. Gets a database session (from the get_db dependency)
  3. Performs database operations
  4. Returns a response (Pydantic model or dict)
  5. If something goes wrong, raises HTTPException

  HOW FASTAPI ROUTES WORK:
  @router.get("/path") — decorator that registers this function
  to handle GET requests at the given path.
  The function parameters define what FastAPI expects:
  - Query params (city, min_price, etc.): just name them
  - Path params ({listing_id}): match the URL pattern
  - Request body (data: ListingCreate): validated by Pydantic
  - Dependencies (db: AsyncSession = Depends(get_db)): injected
"""

import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import Listing
from backend.schemas import ListingCreate, ListingResponse, ListingUpdate
from backend.routers.auth import get_current_user_optional


def get_supabase():
    from supabase import create_client, Client
    return create_client(
        os.getenv("SUPABASE_URL", ""),
        os.getenv("SUPABASE_SERVICE_KEY", ""),
    )

router = APIRouter(prefix="/api/listings", tags=["listings"])


# ===================== LIST (with filters) =====================
@router.get("", response_model=list[ListingResponse])
async def list_listings(
    # Query parameters (optional — user can include none, some, or all)
    city: Optional[str] = None,           # Filter by city name (defaults to Embu on frontend)
    area: Optional[str] = None,           # Filter by specific area/estate (e.g., "Gakwegori")
    min_price: Optional[float] = None,    # Minimum price (KSh)
    max_price: Optional[float] = None,    # Maximum price (KSh)
    listing_type: Optional[str] = None,   # "bedsit", "single_room", "one_bedroom"
    verified: Optional[bool] = None,      # Filter by verification status (admin: show all, public: show only verified)
    owner_id: Optional[int] = None,       # Filter by landlord (owner) ID
    search: Optional[str] = None,         # Text search across title, area, description, city
    db: AsyncSession = Depends(get_db),   # Database session from FastAPI dependency injection
):
    """
    GET /api/listings
    Returns a list of listings, newest first.
    All filter parameters are optional — omit them to get everything.

    SQLAlchemy: Building queries with .where()
    We start with a base query (select all, newest first) and
    chain .where() calls for each active filter.
    ilike() is case-insensitive LIKE — matches "nairobi", "Nairobi", "NAIROBI".
    The % symbols are SQL wildcards — %search% matches any string containing "search".
    """

    # Base query: select all listings, ordered by newest first
    stmt = select(Listing).order_by(Listing.created_at.desc())

    # Apply filters one by one if they're provided
    if city:
        # ilike does case-insensitive matching
        stmt = stmt.where(Listing.city.ilike(f"%{city}%"))
    if area:
        # Exact match on area (case-insensitive)
        stmt = stmt.where(Listing.area.ilike(f"%{area}%"))
    if min_price is not None:
        # >= means "greater than or equal to"
        stmt = stmt.where(Listing.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Listing.price <= max_price)
    if listing_type:
        # Exact match on listing_type
        stmt = stmt.where(Listing.listing_type == listing_type)
    if verified is not None:
        # Filter by verification status (True = verified, False = unverified)
        stmt = stmt.where(Listing.verified == verified)
    if owner_id is not None:
        # Filter by listing owner (landlord account)
        stmt = stmt.where(Listing.owner_id == owner_id)
    if search:
        # Search across multiple fields using OR (|)
        like = f"%{search}%"
        stmt = stmt.where(
            Listing.title.ilike(like)
            | Listing.area.ilike(like)              # Area/estate name
            | Listing.description.ilike(like)        # Full description
            | Listing.city.ilike(like)               # City name
            | Listing.amenities.ilike(like)           # Amenities
        )

    # Execute the query and get all results
    result = await db.execute(stmt)
    listings = result.scalars().all()
    return listings


# ===================== GET ONE =====================
@router.get("/{listing_id}", response_model=ListingResponse)
async def get_listing(
    listing_id: int,                              # From URL path: /api/listings/5
    db: AsyncSession = Depends(get_db),
):
    """
    GET /api/listings/{listing_id}
    Returns a single listing by its ID.
    If not found, returns 404 with an error message.
    """
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


# ===================== CREATE =====================
@router.post("", response_model=ListingResponse, status_code=201)
async def create_listing(
    # Form fields (not JSON!) because the client sends multipart/form-data with images
    title: str = Form(...),
    description: str = Form(""),
    price: float = Form(...),
    city: str = Form(...),
    area: str = Form(...),
    listing_type: str = Form(...),
    amenities: str = Form(""),
    landlord_name: str = Form(...),
    landlord_phone: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    # Uploaded files — list of files, default empty
    images: list[UploadFile] = File(default=[]),
    current_user = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    saved_images = []
    for img in images:
        if not img.filename:
            continue
        ext = os.path.splitext(img.filename)[1] if img.filename else ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        content = await img.read()
        get_supabase().storage.from_("listing-images").upload(filename, content)
        saved_images.append(filename)

    if not saved_images:
        raise HTTPException(status_code=400, detail="At least one photo is required.")

    listing = Listing(
        title=title,
        description=description,
        price=price,
        city=city,
        area=area,
        listing_type=listing_type,
        amenities=amenities,
        images=",".join(saved_images),
        landlord_name=landlord_name,
        landlord_phone=landlord_phone,
        latitude=latitude,
        longitude=longitude,
        owner_id=current_user.id if current_user else None,
    )

    # Add to database session, commit, and refresh
    # refresh() reloads the object from DB (gets the auto-generated id, timestamps)
    db.add(listing)
    await db.commit()
    await db.refresh(listing)
    return listing


# ===================== UPDATE =====================
@router.put("/{listing_id}", response_model=ListingResponse)
async def update_listing(
    listing_id: int,
    data: ListingUpdate,
    current_user = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.owner_id is not None and current_user and listing.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't have permission to edit this listing")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(listing, key, value)

    await db.commit()
    await db.refresh(listing)
    return listing


# ===================== DELETE =====================
@router.delete("/{listing_id}", status_code=204)
async def delete_listing(
    listing_id: int,
    current_user = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.owner_id is not None and current_user and listing.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't have permission to delete this listing")

    images = listing.images.split(",") if listing.images else []
    for img in images:
        img = img.strip()
        if img:
            try:
                get_supabase().storage.from_("listing-images").remove([img])
            except Exception:
                pass

    await db.delete(listing)
    await db.commit()

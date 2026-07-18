import os
import json
import uuid
from typing import Optional
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form

from backend.database import get_db
from backend.schemas import ListingCreate, ListingResponse, ListingUpdate
from backend.routers.auth import get_current_user_optional


SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


def storage_upload(filename: str, data: bytes):
    req = Request(
        method="POST",
        url=f"{SUPABASE_URL}/storage/v1/object/listing-images/{filename}",
        data=data,
        headers={
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/octet-stream",
        },
    )
    with urlopen(req) as resp:
        return resp.status


def storage_delete(filenames: list[str]):
    req = Request(
        method="DELETE",
        url=f"{SUPABASE_URL}/storage/v1/object/listing-images",
        data=json.dumps({"prefixes": filenames}).encode(),
        headers={
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        },
    )
    with urlopen(req) as resp:
        return resp.status


router = APIRouter(prefix="/api/listings", tags=["listings"])


@router.get("", response_model=list[ListingResponse])
async def list_listings(
    city: Optional[str] = None,
    area: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    listing_type: Optional[str] = None,
    verified: Optional[bool] = None,
    owner_id: Optional[int] = None,
    search: Optional[str] = None,
    db=Depends(get_db),
):
    filters = {}
    if city:
        filters["city"] = f"ilike.*{city}*"
    if area:
        filters["area"] = f"ilike.*{area}*"
    if min_price is not None:
        filters["price"] = f"gte.{min_price}"
    if max_price is not None:
        filters["price"] = f"lte.{max_price}"
    if listing_type:
        filters["listing_type"] = f"eq.{listing_type}"
    if verified is not None:
        filters["verified"] = f"eq.{str(verified).lower()}"
    if owner_id is not None:
        filters["owner_id"] = f"eq.{owner_id}"
    if search:
        like = f"ilike.*{search}*"
        filters["or"] = (
            f"(title.{like},area.{like},description.{like},"
            f"city.{like},amenities.{like})"
        )

    return await db.select("listings", filters=filters, order="created_at.desc")


@router.get("/{listing_id}", response_model=ListingResponse)
async def get_listing(listing_id: int, db=Depends(get_db)):
    results = await db.select("listings", filters={"id": f"eq.{listing_id}"})
    if not results:
        raise HTTPException(status_code=404, detail="Listing not found")
    return results[0]


@router.post("", response_model=ListingResponse, status_code=201)
async def create_listing(
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
    images: list[UploadFile] = File(default=[]),
    current_user=Depends(get_current_user_optional),
    db=Depends(get_db),
):
    saved_images = []
    for img in images:
        if not img.filename:
            continue
        ext = os.path.splitext(img.filename)[1] if img.filename else ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        content = await img.read()
        storage_upload(filename, content)
        saved_images.append(filename)

    if not saved_images:
        raise HTTPException(status_code=400, detail="At least one photo is required.")

    data = {
        "title": title,
        "description": description,
        "price": price,
        "city": city,
        "area": area,
        "listing_type": listing_type,
        "amenities": amenities,
        "images": ",".join(saved_images),
        "landlord_name": landlord_name,
        "landlord_phone": landlord_phone,
        "latitude": latitude,
        "longitude": longitude,
        "owner_id": current_user.id if current_user else None,
    }

    return await db.insert("listings", data)


@router.put("/{listing_id}", response_model=ListingResponse)
async def update_listing(
    listing_id: int,
    data: ListingUpdate,
    current_user=Depends(get_current_user_optional),
    db=Depends(get_db),
):
    results = await db.select("listings", filters={"id": f"eq.{listing_id}"})
    if not results:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing = results[0]
    if listing.get("owner_id") is not None and current_user and listing["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="You don't have permission to edit this listing")

    update_data = data.model_dump(exclude_unset=True)
    result = await db.update("listings", update_data, {"id": f"eq.{listing_id}"})
    return result


@router.delete("/{listing_id}", status_code=204)
async def delete_listing(
    listing_id: int,
    current_user=Depends(get_current_user_optional),
    db=Depends(get_db),
):
    results = await db.select("listings", filters={"id": f"eq.{listing_id}"})
    if not results:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing = results[0]
    if listing.get("owner_id") is not None and current_user and listing["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="You don't have permission to delete this listing")

    images = listing.get("images", "").split(",") if listing.get("images") else []
    to_delete = [img.strip() for img in images if img.strip()]
    if to_delete:
        try:
            storage_delete(to_delete)
        except Exception:
            pass

    await db.delete("listings", {"id": f"eq.{listing_id}"})

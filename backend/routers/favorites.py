from fastapi import APIRouter, Depends, HTTPException

from backend.database import get_db
from backend.schemas import FavoriteResponse
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


@router.get("", response_model=list[FavoriteResponse])
async def list_favorites(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    favs = await db.select(
        "favorites",
        filters={"user_id": f"eq.{current_user['id']}"},
        order="created_at.desc",
    )
    results = []
    for fav in favs:
        listing = await db.select(
            "listings",
            filters={"id": f"eq.{fav['listing_id']}"},
        )
        listing_data = listing[0] if listing else None
        results.append(FavoriteResponse(
            id=fav["id"],
            user_id=fav["user_id"],
            listing_id=fav["listing_id"],
            created_at=fav["created_at"],
            listing=listing_data,
        ))
    return results


@router.post("/{listing_id}", response_model=FavoriteResponse, status_code=201)
async def add_favorite(
    listing_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    listing = await db.select("listings", filters={"id": f"eq.{listing_id}"})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    existing = await db.select(
        "favorites",
        filters={
            "user_id": f"eq.{current_user['id']}",
            "listing_id": f"eq.{listing_id}",
        },
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already in favorites")

    fav = await db.insert("favorites", {
        "user_id": current_user["id"],
        "listing_id": listing_id,
    })
    listing_data = listing[0]
    return FavoriteResponse(
        id=fav["id"],
        user_id=fav["user_id"],
        listing_id=fav["listing_id"],
        created_at=fav["created_at"],
        listing=listing_data,
    )


@router.delete("/{listing_id}", status_code=204)
async def remove_favorite(
    listing_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    existing = await db.select(
        "favorites",
        filters={
            "user_id": f"eq.{current_user['id']}",
            "listing_id": f"eq.{listing_id}",
        },
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Favorite not found")

    await db.delete("favorites", {"id": f"eq.{existing[0]['id']}"})

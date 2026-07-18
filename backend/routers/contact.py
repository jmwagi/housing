from fastapi import APIRouter, Depends, HTTPException

from backend.database import get_db
from backend.schemas import ContactRequest
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/api/contact", tags=["contact"])


@router.post("/{listing_id}")
async def contact_landlord(
    listing_id: int,
    data: ContactRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    results = await db.select("listings", filters={"id": f"eq.{listing_id}"})
    if not results:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing = results[0]
    return {
        "success": True,
        "message": f"Your enquiry has been sent to {listing['landlord_name']}. They will contact you at {data.student_phone}.",
        "landlord_name": listing["landlord_name"],
        "landlord_phone": listing["landlord_phone"],
    }

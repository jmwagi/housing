from fastapi import APIRouter, Depends, HTTPException

from backend.database import get_db
from backend.schemas import AreaInfo, AreaCreate

router = APIRouter(prefix="/api/areas", tags=["areas"])


@router.get("", response_model=list[AreaInfo])
async def list_areas(db=Depends(get_db)):
    areas = await db.select("areas", order="name")
    listings = await db.select("listings", columns="area,city")

    embu_counts = {}
    for l in listings:
        if l.get("city") == "Embu":
            embu_counts[l["area"]] = embu_counts.get(l["area"], 0) + 1

    return [
        AreaInfo(
            id=a["id"],
            name=a["name"],
            count=embu_counts.get(a["name"], 0),
            latitude=a.get("latitude"),
            longitude=a.get("longitude"),
        )
        for a in areas
    ]


@router.post("", response_model=AreaInfo, status_code=201)
async def create_area(data: AreaCreate, db=Depends(get_db)):
    existing = await db.select("areas", filters={"name": f"eq.{data.name}"})
    if existing:
        raise HTTPException(status_code=400, detail="Area already exists")

    result = await db.insert("areas", data.model_dump(exclude_unset=True))
    return AreaInfo(
        id=result["id"],
        name=result["name"],
        count=0,
        latitude=result.get("latitude"),
        longitude=result.get("longitude"),
    )


@router.delete("/{area_id}", status_code=204)
async def delete_area(area_id: int, db=Depends(get_db)):
    areas = await db.select("areas", filters={"id": f"eq.{area_id}"})
    if not areas:
        raise HTTPException(status_code=404, detail="Area not found")

    area = areas[0]
    listings = await db.select(
        "listings",
        filters={"area": f"eq.{area['name']}"},
        limit=1,
    )
    if listings:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete area '{area['name']}' — it still has active listings. Delete or reassign them first.",
        )

    await db.delete("areas", {"id": f"eq.{area_id}"})

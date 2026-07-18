import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from backend.database import supabase, get_db
from backend.routers import listings, areas, contact, auth, favorites


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Keja Go", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(listings.router)
app.include_router(areas.router)
app.include_router(contact.router)
app.include_router(auth.router)
app.include_router(favorites.router)


@app.get("/api/health")
async def health():
    try:
        await supabase.select("listings", limit=1)
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)[:200]}


FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
os.makedirs(str(FRONTEND_DIR), exist_ok=True)

if FRONTEND_DIR.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(FRONTEND_DIR), html=True),
        name="frontend",
    )

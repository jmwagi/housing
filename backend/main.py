"""
  =====================================================
  main.py — FastAPI Application Entry Point
  =====================================================
  This is the file you run to start the server:
      uvicorn backend.main:app --reload --port 8000

  It creates the FastAPI application, registers:
  - CORS middleware (so the frontend can make requests)
  - API routers (listings, cities, contact)
  - Static file mounts for uploaded images and frontend files

  APPLICATION LIFECYCLE:
  When the server starts:
  1. lifespan() runs → database tables are created
  2. The server starts listening for requests

  When a request comes in:
  1. FastAPI matches the URL to a route
  2. Runs middleware (CORS checks)
  3. Calls the route function
  4. Returns the response

  STATIC FILE SERVING:
  FastAPI serves our frontend HTML/CSS/JS files directly
  using StaticFiles. This means we don't need a separate
  web server like nginx for development. The frontend is
  served at http://localhost:8000/ and the API at /api/...
"""

import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from backend.database import init_db, get_db
from sqlalchemy import text
from backend.routers import listings, areas, contact, auth, favorites


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan handler — runs code on startup and shutdown.
    Here we initialize the database tables when the app starts.
    """
    try:
        await init_db()
    except Exception as e:
        print(f"DB init error (non-fatal): {e}")
    yield


# Create the FastAPI application instance
app = FastAPI(
    title="Keja Go",
    version="1.0.0",
    lifespan=lifespan,              # Register the lifecycle handler
)


# ===================== CORS MIDDLEWARE =====================
# CORS (Cross-Origin Resource Sharing) controls which websites
# can make requests to our API. In development, the frontend and
# backend are on the same domain (:8000), so CORS isn't strictly
# needed. But it's good practice to have it for future use
# (e.g., a separate mobile app or different domain).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],             # Allow requests from any origin
    allow_credentials=True,
    allow_methods=["*"],             # Allow all HTTP methods
    allow_headers=["*"],             # Allow all headers
)


# ===================== API ROUTES =====================
# Register our three API routers.
# Each router has its own prefix defined in the router file.
app.include_router(listings.router)   # /api/listings/*
app.include_router(areas.router)      # /api/areas/*
app.include_router(contact.router)    # /api/contact/*
app.include_router(auth.router)       # /api/auth/*
app.include_router(favorites.router)  # /api/favorites/*


# ===================== HEALTH CHECK =====================
@app.get("/api/health")
async def health(db=Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)[:200]}


# ===================== STATIC FILES: FRONTEND =====================
# Mount the entire frontend directory at "/" (root).
# html=True means index.html is served automatically when
# a directory is requested (e.g., "/" serves frontend/index.html).
# This is how our SPA shell gets loaded.
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
os.makedirs(str(FRONTEND_DIR), exist_ok=True)

if FRONTEND_DIR.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(FRONTEND_DIR), html=True),
        name="frontend",
    )

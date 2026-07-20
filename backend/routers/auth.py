import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.database import get_db
from backend.schemas import UserCreate, UserLogin, UserResponse, TokenResponse, AdminResetPassword

router = APIRouter(prefix="/api/auth", tags=["auth"])

ADMIN_KEY = os.getenv("ADMIN_KEY", "admin123")
SECRET_KEY = os.getenv("JWT_SECRET", "keja-go-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


async def get_current_user_optional(
    request: Request,
    db=Depends(get_db),
):
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    token = auth.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            return None
        user_id = int(user_id_str)
    except JWTError:
        return None

    results = await db.select("users", filters={"id": f"eq.{user_id}"})
    return results[0] if results else None


async def get_current_user(
    request: Request,
    db=Depends(get_db),
):
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = int(user_id_str)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    results = await db.select("users", filters={"id": f"eq.{user_id}"})
    if not results:
        raise HTTPException(status_code=401, detail="User not found")
    return results[0]


async def get_current_admin(
    request: Request,
    db=Depends(get_db),
):
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role = payload.get("role")
        if role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        user_id = int(payload.get("sub"))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    results = await db.select("users", filters={"id": f"eq.{user_id}"})
    if not results:
        raise HTTPException(status_code=401, detail="User not found")
    return results[0]


@router.post("/admin-login")
async def admin_login(data: dict, db=Depends(get_db)):
    admin_key = data.get("admin_key", "")
    if admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")

    results = await db.select("users", filters={"role": f"eq.admin"})
    if results:
        admin_user = results[0]
    else:
        admin_user = await db.insert("users", {
            "email": "admin@keja-go.co.ke",
            "password_hash": hash_password(ADMIN_KEY),
            "full_name": "Admin",
            "phone": "",
            "role": "admin",
            "id_number": None,
        })

    token = create_access_token({"sub": str(admin_user["id"]), "role": "admin"})
    return {"access_token": token, "token_type": "bearer", "user": admin_user}


@router.post("/reset-password")
async def admin_reset_password(data: AdminResetPassword, db=Depends(get_db)):
    if data.admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")

    user = await db.select("users", filters={"id": f"eq.{data.user_id}"})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.update("users", {"password_hash": hash_password(data.new_password)}, {"id": f"eq.{data.user_id}"})
    return {"success": True, "message": "Password updated successfully"}


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: UserCreate, db=Depends(get_db)):
    existing_email = await db.select("users", filters={"email": f"eq.{data.email}"})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_phone = await db.select("users", filters={"phone": f"eq.{data.phone}"})
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    if data.role not in ("student", "landlord"):
        raise HTTPException(status_code=400, detail="Role must be 'student' or 'landlord'")

    user = await db.insert("users", {
        "email": data.email,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name,
        "phone": data.phone,
        "role": data.role,
        "id_number": data.id_number if data.role == "landlord" else None,
    })

    token = create_access_token({"sub": str(user["id"])})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db=Depends(get_db)):
    results = await db.select("users", filters={"email": f"eq.{data.email}"})
    if not results:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = results[0]
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user["id"])})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/users")
async def list_users(request: Request, db=Depends(get_db)):
    auth = request.headers.get("X-Admin-Key", "")
    if auth == ADMIN_KEY:
        pass
    else:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=403, detail="Invalid admin key")
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("role") != "admin":
                raise HTTPException(status_code=403, detail="Admin access required")
        except JWTError:
            raise HTTPException(status_code=403, detail="Invalid admin key")

    return await db.select("users", columns="id,email,full_name,phone,role,created_at")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    return current_user


@router.get("/landlords")
async def list_landlords(request: Request, db=Depends(get_db)):
    return await db.select("users", filters={"role": f"eq.landlord"}, columns="id,email,full_name,phone")

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ListingCreate(BaseModel):
    title: str
    description: str = ""
    price: float
    city: str
    area: str
    listing_type: str
    amenities: str = ""
    landlord_name: str
    landlord_phone: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    listing_type: Optional[str] = None
    amenities: Optional[str] = None
    area: Optional[str] = None
    landlord_name: Optional[str] = None
    landlord_phone: Optional[str] = None
    verified: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ListingResponse(BaseModel):
    id: int
    title: str
    description: str
    price: float
    city: str
    area: str
    listing_type: str
    amenities: str
    images: str
    verified: bool
    landlord_name: str
    landlord_phone: str
    owner_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class AreaInfo(BaseModel):
    id: int
    name: str
    count: int = 0
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class AreaCreate(BaseModel):
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    phone: str
    role: str
    id_number: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: str
    role: str
    id_number: Optional[str] = None
    is_verified: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    listing_id: int
    created_at: datetime
    listing: Optional[ListingResponse] = None


class CityInfo(BaseModel):
    name: str
    count: int


class ContactRequest(BaseModel):
    student_name: str
    student_phone: str
    message: str = ""

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Dict, Any
from datetime import datetime

class UserPreference(BaseModel):
    email: bool
    push: bool 

class UserPreferenceResponse(UserPreference):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        form_attributes = True


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    push_token: Optional[str] = None
    preferences: UserPreference
    password: str

    @field_validator('password')
    def password_strength(cls, p):
        if len(p) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return p
    
class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    password: str
    push_token: Optional[str] = None
    preferences: UserPreferenceResponse
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        form_attributes = True

class PaginationMeta(BaseModel):
    total: int
    limit: int
    page: int
    total_pages: int
    has_next: bool
    has_previous: bool

class APIResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    message: str
    meta: Optional[PaginationMeta] = None




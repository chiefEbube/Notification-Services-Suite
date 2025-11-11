from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

class UserPreference(BaseModel):
    email: bool
    push: bool 

class UserPreferenceResponse(UserPreference):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


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
    
class UserUpdate(BaseModel):
    push_token: Any

    
class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    push_token: Optional[str] = None
    preferences: UserPreferenceResponse
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True





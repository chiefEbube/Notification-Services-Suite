from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

class UserPreference(BaseModel):
    email: bool = True
    push: bool = True

class UserPreferenceResponse(UserPreference):
    id: uuid.UUID
    user_id: uuid.UUID
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
    push_token: Optional[str] = None

    
class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    push_token: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    preferences: UserPreferenceResponse

    class Config:
        from_attributes = True


class PasswordVerify(BaseModel):
    email: EmailStr
    password: str


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

    @field_validator('new_password')
    def password_strength(cls, np):
        if len(np) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return np
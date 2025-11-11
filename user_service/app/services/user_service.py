from fastapi import HTTPException, Status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schema.response import APIResponse, PaginationMeta
from app.schema.user import UserCreate, UserUpdate, UserPreference
from app.models.user import User, UserPreferences
from app.core.security import hash_password, verify_password
from app.core.redis import redis_client
import json


class UserService:

    @staticmethod
    def _cache_user(user: User): #caches user data in redis
        cache_key = f"user:{user.id}"
        user_data = {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "push_token": user.push_token,
            "preferences": {
                "email": user.preferences.email if user.preferences else None,
                "push": user.preferences.push if user.preferences else None
            }
        }
        redis_client.set(cache_key, user_data, ex=3600)  #caches data for 1 hour

    @staticmethod
    def create_user(db: Session, user: UserCreate): #creates user and user preferences in the main database
        exist_user = db.query(User).filter(User.email == user.email)
        if exist_user():
            raise HTTPException(status_code=Status.HTTP_400_BAD_REQUEST, detail="User with this email already exists.")
        hashed_password = hash_password(user.password)
        new_user = User(
            name = user.name,
            email = user.email,
            push_token = user.push_token,
            password = hashed_password
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        user_preferences = UserPreferences(
            user_id = new_user.id,
            email = user.preferences.email,
            push = user.preferences.push
        )
        db.add(user_preferences)
        db.commit()
        db.refresh(user_preferences)

        db.refresh(new_user) #did this so the new user can have preferences

        UserService._cache_user(new_user)

        return new_user
    
    @staticmethod
    def get_user(db: Session, user_id: str):
        cache_key = f"user:{user_id}"
        cached_user = redis_client.get(cache_key)

        if cached_user:
            print(f"User {user_id} fetched from cache")
            return cached_user
        
        print(f"User {user_id} not found in cache, fetching from database")
        user = db.query(User).filter(User.id == user_id).first() #incase the user sn't cached get it from the postgresql
        if not user:
            raise HTTPException(status_code=Status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found.")
        UserService._cache_user(user)
        return user
    
    @staticmethod
    def get_user_preferences(db: Session, user_id: str):
        cache_key  = f"user_preference:{user_id}"
        cached_preference = redis_client.get(cache_key)

        if cached_preference:
            print(f"User preferences for {user_id} fetched from cache")
            return cached_preference
        
        print(f"User preferences for {user_id} not found in cache, fetching from database")
        preference = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()

        if not preference:
            raise HTTPException(status_code=Status.HTTP_404_NOT_FOUND, detail=f"Preference for user {user_id} not found.")
        UserService._cache_user(preference)
        return preference
    
    @staticmethod
    def update_push_token(db: Session, user_id: str, token: UserUpdate):
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=Status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found.")
        
        if token.push_token is not None:
            user.push_token = token.push_token
        else:
            user.push_token = user.push_token

        db.commit()
        db.refresh(user)

        UserService._cache_user(user)

        return user
    
    @staticmethod
    def get_all_users(db: Session, page: int, limit: int):
        skip = (page - 1) * limit
        users = db.query(User).offset(skip).limit(limit).all()
        total = db.query(User).count()
        return users, total
    
    @staticmethod
    def delete_user(db:Session, user_id: str):
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=Status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found.")
        
        db.delete(user)
        db.commit()

        cache_key = f"user:{user_id}"
        redis_client.delete(cache_key)

        return True

        



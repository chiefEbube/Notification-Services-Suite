from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.schema.user import UserCreate, UserUpdate, UserPreference, PasswordUpdate, PasswordVerify
from app.models.user import User, UserPreferences
from app.core.security import hash_password, verify_password
from app.core.redis import redis_client


class UserService:

    @staticmethod
    def _cache_user_preference(user_preference: UserPreferences):
        cache_pref_data = {
            "id": str(user_preference.user_id),
            "email": user_preference.email,
            "push": user_preference.push
        }
        
        redis_client.set(f"user:id:{user_preference.user_id}", cache_pref_data, expire=3600)

    @staticmethod
    def create_user(db: Session, user: UserCreate): #creates user and user preferences in the main database
        exist_user = db.query(User).filter(User.email == user.email).first()
        if exist_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User with this email already exists.")
        hashed_password = hash_password(user.password)
        new_user = User(
            name = user.name,
            email = user.email,
            password = hashed_password,
            push_token = user.push_token
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        user_preference = UserPreferences(
            user_id = new_user.id,
            email = user.preferences.email,
            push = user.preferences.push
        )
        db.add(user_preference)
        db.commit()
        db.refresh(user_preference)
        
        UserService._cache_user_preference(user_preference)

        return new_user
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: str):
        user = db.query(User).filter(User.id == user_id).first() 
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found.")
        return user
    
    @staticmethod
    def get_user_by_email(db: Session, user_email: str):
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User not found.")
        return user
    
    @staticmethod
    def get_user_preference(db: Session, user_id: str):
        cache_key  = f"user_preference:{user_id}"
        cached_preference = redis_client.get(cache_key)

        if cached_preference:
            print(f"User preferences for {user_id} fetched from cache")
            return cached_preference
        
        print(f"User preferences for {user_id} not found in cache, fetching from database")
        preference = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()

        if not preference:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Preference for user {user_id} not found.")
        
        UserService._cache_user_preference(preference)
        return preference
    
    @staticmethod
    def update_push_token(db: Session, user_id: str, token: UserUpdate):
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found.")
        
        if token.push_token is not None:
            user.push_token = token.push_token
        else:
            user.push_token = user.push_token

        db.commit()
        db.refresh(user)

        return user
    
    @staticmethod
    def update_user_preference(db: Session, user_id: str, preference: UserPreference):
        user_preference = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()
        if not user_preference:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Preference for user {user_id} not found.")
        
        user_preference.email = preference.email
        user_preference.push = preference.push

        db.commit()
        db.refresh(user_preference)

        redis_client.delete(f"user:preference:{user_id}")
        UserService._cache_user_preference(user_preference)

        return user_preference
    
    @staticmethod
    def verify_user_password(db: Session, password: PasswordVerify):
        user = db.query(User).filter(User.email == password.email).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User not found.")
        
        if not verify_password(password.password, user.password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password.")
        
        return user
    
    @staticmethod
    def update_user_password(db: Session, user_id: str, password: PasswordUpdate):
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found.")
        
        if not verify_password(password.current_password, user.password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect.")
        
        user.password = hash_password(password.new_password)
        db.commit()
        db.refresh(user)

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
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found.")
        
        db.delete(user)
        db.commit()

        cache_key = f"user:preference:{user_id}"
        redis_client.delete(cache_key)

        return True

        



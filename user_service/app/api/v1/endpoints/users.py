from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schema.response import APIResponse, PaginationMeta
from app.schema.user import UserCreate, UserResponse, UserUpdate, UserPreferenceResponse, UserPreference, PasswordVerify, PasswordUpdate
from app.services.user_service import UserService
import sqlalchemy, redis
from functools import wraps
import math

router = APIRouter()

def for_error_responses(message, error):
    return APIResponse(
        success=False,
        message=message,
        error=error,
        meta=None
    )

def handle_api_exceptions(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except HTTPException as e:
            return JSONResponse(
                status_code=e.status_code,
                content=for_error_responses("Server error", f"Error: {str(e)}").model_dump())
        except ValueError as e:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=for_error_responses("Validation error", str(e)).model_dump())    
        except sqlalchemy.exc.SQLAlchemyError as e:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content=for_error_responses("Database error", f"Database operation failed: {str(e)}").model_dump())
        except redis.RedisError as e:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content=for_error_responses("Cache error", f"Redis operation failed: {str(e)}").model_dump())
        except Exception as e:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content=for_error_responses("Internal server error", f"An unexpected error occurred: {str(e)}").model_dump())
    return wrapper

@router.post("/create-user", response_model=APIResponse, status_code=201)
@handle_api_exceptions
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    new_user = UserService.create_user(db, user)

    user_response = UserResponse.model_validate(new_user)
    return APIResponse(
        success=True,
        data=user_response, 
        message="User created successfully."
    )
    
    
@router.get("/{user_id}", response_model=APIResponse)
@handle_api_exceptions
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = UserService.get_user_by_id(db, user_id)

    user_response = UserResponse.model_validate(user)
    return APIResponse(
        success=True,
        data=user_response,
        message="User retrieved successfully."
    )

@router.get("/email/{email}", response_model=APIResponse)
@handle_api_exceptions
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    user = UserService.get_user_by_email(db, email)

    user_response = UserResponse.model_validate(user)
    return APIResponse(
        success=True,
        data=user_response,
        message="User retrieved successfully."
    )
 
@router.put("/update-push-token/{user_id}", response_model=APIResponse)
@handle_api_exceptions
def update_user_push_token(user_id: str, token: UserUpdate, db: Session = Depends(get_db)):
    updated_user = UserService.update_push_token(db, user_id, token)
    user_response = UserResponse.model_validate(updated_user)
    return APIResponse(
        success=True,
        data=user_response,
        message="Push token updated successfully."
    )
    
@router.get("/preferences/{user_id}", response_model=APIResponse)
@handle_api_exceptions
def get_user_preferences(user_id: str, db: Session = Depends(get_db)):
    user_preference = UserService.get_user_preference(db, user_id)
    preference_response = UserPreferenceResponse.model_validate(user_preference)
    return APIResponse(
        success=True,
        data=preference_response,
        message="User preferences retrieved successfully."
    )

@router.put("/{user_id}/preferences", response_model=APIResponse)
@handle_api_exceptions
def update_user_preferences(user_id: str, preferences: UserPreference, db: Session = Depends(get_db)):
    updated_preference = UserService.update_user_preference(db, user_id, preferences)
    preference_response = UserPreferenceResponse.model_validate(updated_preference)
    return APIResponse(
        success=True,
        data=preference_response,
        message="User preferences updated successfully."
    )

@router.post("/verify-password", response_model=APIResponse)
@handle_api_exceptions
def verify_user_password(password: PasswordVerify, db: Session = Depends(get_db)):
    user = UserService.verify_user_password(db, password)
    user_response = UserResponse.model_validate(user)
    return APIResponse(
        success=True,
        data=user_response,
        message="Password verified successfully."
    )

@router.put("/update-password/{user_id}", response_model=APIResponse)
@handle_api_exceptions
def update_user_password(user_id: str, password_update: PasswordUpdate, db: Session = Depends(get_db)):
    updated_user_password = UserService.update_user_password(db, user_id, password_update)
    user_response = UserResponse.model_validate(updated_user_password)
    return APIResponse(
        success=True,
        data=user_response,
        message="Password updated successfully."
    )

   
@router.get("/all/users", response_model=APIResponse)
@handle_api_exceptions
def get_all_users(db: Session = Depends(get_db), page: int = Query(1, ge=1), limit: int = Query(5, ge=1, le=100)):
    users, total = UserService.get_all_users(db, page, limit)
    user_responses = [UserResponse.model_validate(user) for user in users]

    if total > 0:
        total_pages = math.ceil(total / limit)

    meta = PaginationMeta(
        total=total,
        limit=limit,
        page=page,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1
    )

    return APIResponse(
        success=True,
        data={"users": user_responses},
        message="Users retrieved successfully.",
        meta=meta
    )

@router.delete("/{user_id}", response_model=APIResponse)
@handle_api_exceptions
def delete_user(user_id: str, db: Session = Depends(get_db)):
        UserService.delete_user(db, user_id)
        return APIResponse(
            success=True,
            message="User deleted successfully."
        )
    



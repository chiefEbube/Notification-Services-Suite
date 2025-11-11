from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schema.response import APIResponse, PaginationMeta
from app.schema.user import UserCreate, UserResponse, UserUpdate, UserPreferenceResponse, UserPreference
from app.services.user_service import UserService
import sqlalchemy, redis

router = APIRouter()

#note: done with this file yet, need to customize the responses and error handling

@router.post("/create-user", response_model=APIResponse, status_code=201)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    try:
        new_user = UserService.create_user(db, user)

        user_response = UserResponse.model_validate(new_user)
        return APIResponse(
            success=True,
            data=user_response, 
            message="User created successfully."
        )
    except HTTPException as e:
        raise e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except sqlalchemy.exc.SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error occurred.{str(e)}")
    except redis.RedisError as e:
        raise HTTPException(status_code=500, detail=f"Cache error occurred.{str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred.{str(e)}")
    
@router.get("/{user_id}", response_model=APIResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    try:
        user = UserService.get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        
        error = APIResponse(
            success=False,
            error=str(e),
            message="Failed to retrieve user."
        )
        user_response = UserResponse.model_validate(user)
        return APIResponse(
            success=True,
            data=user_response,
            message="User retrieved successfully."
        )
    
    except HTTPException as e:
        raise e
    except sqlalchemy.exc.SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error occurred.{str(e)}")
    except redis.RedisError as e:
        raise HTTPException(status_code=500, detail=f"Cache error occurred.{str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred.{str(e)}")
    

@router.get("/all", response_model=APIResponse)
def get_all_users(db: Session = Depends(get_db), page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100)):
    try:
        users, total = UserService.get_all_users(db, page, limit)
        user_responses = [UserResponse.model_validate(user) for user in users]

        if total > 0:
            total_pages = total // limit
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
    
    except HTTPException as e:
        raise e
    except sqlalchemy.exc.SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error occurred.{str(e)}")
    except redis.RedisError as e:
        raise HTTPException(status_code=500, detail=f"Cache error occurred.{str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred.{str(e)}")
  
@router.put("/{user_id}/update-push-token", response_model=APIResponse)
def update_push_token(user_id: str, token: UserUpdate, db: Session = Depends(get_db)):
    try:
        updated_user = UserService.update_push_token(db, user_id, token)
        user_response = UserResponse.model_validate(updated_user)
        return APIResponse(
            success=True,
            data=user_response,
            message="Push token updated successfully."
        )
    
    except HTTPException as e:
        raise e
    except sqlalchemy.exc.SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error occurred.{str(e)}")
    except redis.RedisError as e:
        raise HTTPException(status_code=500, detail=f"Cache error occurred.{str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred.{str(e)}")

@router.delete("/{user_id}", response_model=APIResponse)
def delete_user(user_id: str, db: Session = Depends(get_db)):
    try:
        UserService.delete_user(db, user_id)
        return APIResponse(
            success=True,
            message="User deleted successfully."
        )
    
    except HTTPException as e:
        raise e
    except sqlalchemy.exc.SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error occurred.{str(e)}")
    except redis.RedisError as e:
        raise HTTPException(status_code=500, detail=f"Cache error occurred.{str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred.{str(e)}")
    


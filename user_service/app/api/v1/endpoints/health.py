from fastapi import APIRouter
from app.core.redis import redis_client
from app.db.database import engine

router = APIRouter()

@router.get("/health")
def health_check():

#need to make a response model for this
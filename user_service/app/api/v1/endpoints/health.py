from fastapi import APIRouter, Response
from app.core.redis import redis_client
from app.db.database import engine
from sqlalchemy import text

router = APIRouter()

@router.get("/")
def health_check(response: Response):

    healthchecks = {
        "status": "healthy",
        "service": "user-service",
        "database": "unknown",
        "redis": "unknown"
    }

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        healthchecks["database"] = "connected"
    except Exception as e:
        healthchecks["database"] = F"error: {str(e)}"
        healthchecks["status"] = "unhealthy"

    try:
        if redis_client.ping():
            healthchecks["redis"] = "connected"
        else:
            healthchecks["redis"] = "disconnected"
            healthchecks["status"] = "unhealthy"
    except Exception as e:
        healthchecks["redis"] = F"error: {str(e)}"
        healthchecks["status"] = "unhealthy"

    if healthchecks["status"] == "healthy":
        response.status_code = 200 
    else:
        response.status_code = 503

    return healthchecks
        


from pydantic_settings import BaseSettings
from typing import Optional


class UserServiceSettings(BaseSettings):
    PROJECT_NAME: str = "User Service"
    PROJECT_VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int 
    DEBUG: bool = False
    DATABASE_URL: str
    REDIS_URL: str
    REDIS_PORT: int
    USER_SERVICE_REDIS_DB: int
    REDIS_PASSWORD: Optional[str] = None
    SECRET_KEY: str

    class Config:
        env_file = ".env"

settings = UserServiceSettings()
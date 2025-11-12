from pydantic import BaseModel
from typing import Optional, TypeVar, Generic

T = TypeVar('T')

class PaginationMeta(BaseModel):
    total: int
    limit: int
    page: int
    total_pages: int
    has_next: bool
    has_previous: bool

class APIResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None
    message: str
    meta: Optional[PaginationMeta] = None

    class Config:
        arbitrary_types_allowed = True #used this because im not sure what meta and daat would return
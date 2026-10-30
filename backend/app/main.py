# Import router từ module ai_pet_description
from app.routers import ai_pet_description

# Đăng ký router (Nên gắn kèm Dependency xác thực Token nếu Backend đã có)
app.include_router(
    ai_pet_description.router,
    prefix="/api/ai",
    tags=["AI Features"]
)

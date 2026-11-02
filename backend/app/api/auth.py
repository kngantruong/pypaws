from fastapi import APIRouter,Depends,HTTPException
from app.core.database import get_supabase
from app.core.security import create_access_token,hash_password,verify_password
from app.schemas.auth import AuthResponse,LoginRequest,RegisterRequest,UserResponse
router=APIRouter(prefix="/auth",tags=["Auth"])
def _rpc(name,args):
    try:return get_supabase().rpc(name,args).execute()
    except Exception as exc:
        if "unique" in str(exc).lower():raise HTTPException(409,"Email already registered.")
        raise HTTPException(500,"Authentication database operation failed.") from exc
def _user(row):return UserResponse(user_id=row["user_id"],email=row["email"],full_name=row.get("full_name"),phone=row.get("phone"),user_type=row.get("user_type","INDIVIDUAL"),created_at=row["created_at"])
@router.post("/register",response_model=AuthResponse,status_code=201)
def register(p:RegisterRequest):
    r=_rpc("create_user",{"p_email":p.email,"p_password_hash":hash_password(p.password),"p_full_name":p.full_name,"p_phone":p.phone})
    if not r.data:raise HTTPException(500,"Registration returned no user.")
    uid=int(r.data); u=_rpc("get_user_by_email",{"p_email":p.email}).data
    if not u:raise HTTPException(500,"User lookup failed.")
    return AuthResponse(access_token=create_access_token(uid),user=_user(u[0]))
@router.post("/login",response_model=AuthResponse)
def login(p:LoginRequest):
    u=_rpc("get_user_by_email",{"p_email":p.email}).data
    if not u or not verify_password(p.password,u[0]["password"]):raise HTTPException(401,"Email or password is incorrect.")
    return AuthResponse(access_token=create_access_token(int(u[0]["user_id"])),user=_user(u[0]))


from app.core.auth import get_current_user_id

@router.get("/me", response_model=UserResponse)
def me(user_id: int = Depends(get_current_user_id)):
    result = get_supabase().table("users").select(
        "user_id,email,full_name,phone,user_type,created_at"
    ).eq("user_id", user_id).limit(1).execute()
    if not result.data:
        raise HTTPException(404, "User not found.")
    return _user(result.data[0])

from datetime import datetime
from pydantic import BaseModel,EmailStr,Field
class RegisterRequest(BaseModel):
    email:EmailStr; password:str=Field(min_length=8,max_length=128); full_name:str|None=Field(None,max_length=100); phone:str|None=Field(None,max_length=20)
class LoginRequest(BaseModel): email:EmailStr; password:str
class UserResponse(BaseModel):
    user_id:int; email:EmailStr; full_name:str|None=None; phone:str|None=None; user_type:str; created_at:datetime
class AuthResponse(BaseModel):
    access_token:str; token_type:str="bearer"; user:UserResponse

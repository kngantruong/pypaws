from fastapi import Depends,HTTPException
from fastapi.security import HTTPAuthorizationCredentials,HTTPBearer
from app.core.security import decode_access_token,decode_access_token_claims
bearer=HTTPBearer(auto_error=False)
def get_current_user_id(credentials:HTTPAuthorizationCredentials|None=Depends(bearer))->int:
    if not credentials: raise HTTPException(401,"Authentication required.")
    try:return decode_access_token(credentials.credentials)
    except Exception as exc:raise HTTPException(401,"Invalid or expired access token.") from exc
def get_current_user_claims(credentials:HTTPAuthorizationCredentials|None=Depends(bearer))->dict:
    if not credentials: raise HTTPException(401,"Authentication required.")
    try:return decode_access_token_claims(credentials.credentials)
    except Exception as exc:raise HTTPException(401,"Invalid or expired access token.") from exc

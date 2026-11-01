"""Password hashing and stateless bearer-token helpers."""
from __future__ import annotations
import base64, hashlib, hmac, json, os, time
_ITERATIONS=310_000
def hash_password(password: str) -> str:
    if len(password)<8: raise ValueError("Password must contain at least 8 characters.")
    salt=os.urandom(16); digest=hashlib.pbkdf2_hmac("sha256",password.encode(),salt,_ITERATIONS)
    return "pbkdf2_sha256$%s$%s$%s" % (_ITERATIONS,base64.urlsafe_b64encode(salt).decode(),base64.urlsafe_b64encode(digest).decode())
def verify_password(password: str, encoded: str) -> bool:
    try:
        scheme,it,salt,digest=encoded.split("$",3)
        if scheme!="pbkdf2_sha256": return False
        actual=hashlib.pbkdf2_hmac("sha256",password.encode(),base64.urlsafe_b64decode(salt),int(it))
        return hmac.compare_digest(actual,base64.urlsafe_b64decode(digest))
    except (ValueError,TypeError): return False
def _secret() -> bytes: return os.getenv("AUTH_SECRET_KEY","pypaws-development-secret-change-me").encode()
def create_access_token(user_id:int) -> str:
    payload={"sub":str(user_id),"exp":int(time.time())+86400}
    raw=base64.urlsafe_b64encode(json.dumps(payload,separators=(",",":")).encode()).decode().rstrip("=")
    sig=hmac.new(_secret(),raw.encode(),hashlib.sha256).hexdigest()
    return raw+"."+sig
def decode_access_token(token:str) -> int:
    raw,sig=token.split(".",1); expected=hmac.new(_secret(),raw.encode(),hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig,expected): raise ValueError("Invalid token")
    payload=json.loads(base64.urlsafe_b64decode(raw+"="*((4-len(raw)%4)%4)))
    if int(payload["exp"])<int(time.time()): raise ValueError("Token expired")
    return int(payload["sub"])
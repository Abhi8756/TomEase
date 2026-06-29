"""
Authentication router — JWT-based auth for website + mobile app shared accounts.
Routes:
  POST /auth/register  — Create account
  POST /auth/login     — Get access + refresh token
  POST /auth/refresh   — Get new access token
  GET  /auth/me        — Get current user profile
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy import Column, String, Integer, DateTime, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timedelta
from typing import Optional
import uuid
import os

try:
    import bcrypt
    from jose import jwt, JWTError
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "tomease-dev-secret-change-in-production-please-use-long-random-string")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24        # 1 day
REFRESH_TOKEN_EXPIRE_DAYS = 30

# ── Pydantic models ──────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    created_at: str

from .database import database as db

def _hash_password(pw: str) -> str:
    if not CRYPTO_AVAILABLE:
        return pw  # fallback (not secure, only for dev without bcrypt)
    
    # bcrypt limits passwords to 72 bytes
    pw_bytes = pw.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')

def _verify_password(pw: str, hashed: str) -> bool:
    if not CRYPTO_AVAILABLE:
        return pw == hashed
    try:
        pw_bytes = pw.encode('utf-8')[:72]
        return bcrypt.checkpw(pw_bytes, hashed.encode('utf-8'))
    except Exception:
        return False

def _create_token(data: dict, expires_delta: timedelta) -> str:
    payload = {**data, "exp": datetime.utcnow() + expires_delta}
    if not CRYPTO_AVAILABLE:
        import json, base64
        return base64.b64encode(json.dumps(payload, default=str).encode()).decode()
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def _decode_token(token: str) -> dict:
    if not CRYPTO_AVAILABLE:
        import json, base64
        try:
            return json.loads(base64.b64decode(token.encode()).decode())
        except Exception:
            raise HTTPException(401, "Invalid token")
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not credentials:
        raise HTTPException(401, "Not authenticated")
    payload = _decode_token(credentials.credentials)
    email = payload.get("sub")
    if not email:
        raise HTTPException(401, "Invalid token format")
    
    user = await db.get_user_by_email(email)
    if not user:
        raise HTTPException(401, "User not found")
    return user

# ── Routes ───────────────────────────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    existing_user = await db.get_user_by_email(req.email)
    if existing_user:
        raise HTTPException(400, "Email already registered")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    user_id = str(uuid.uuid4())
    # First registered user becomes admin
    total_users = await db.get_total_users()
    role = "admin" if total_users == 0 else "user"
    password_hash = _hash_password(req.password)

    await db.create_user(
        user_id=user_id,
        email=req.email,
        name=req.name,
        password_hash=password_hash,
        role=role
    )

    access_token = _create_token({"sub": req.email, "role": role}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = _create_token({"sub": req.email, "type": "refresh"}, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    user = await db.get_user_by_email(req.email)
    if not user or not _verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")

    access_token = _create_token({"sub": req.email, "role": user["role"]}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = _create_token({"sub": req.email, "type": "refresh"}, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(req: RefreshRequest):
    payload = _decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid refresh token")
    email = payload.get("sub")
    
    user = await db.get_user_by_email(email)
    if not user:
        raise HTTPException(401, "User not found")

    access_token = _create_token({"sub": email, "role": user["role"]}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    new_refresh = _create_token({"sub": email, "type": "refresh"}, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    return TokenResponse(access_token=access_token, refresh_token=new_refresh)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        created_at=current_user["created_at"],
    )

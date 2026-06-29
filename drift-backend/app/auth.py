import os
import datetime
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from .database import get_db
from . import models

# Load env variables
load_dotenv()

# JWT Config
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkeychangeinproduction1234567890abcdef")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

import hashlib
import binascii

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # 1. Try pbkdf2 verification (our new method)
    try:
        if not (hashed_password.startswith('$2') or hashed_password.startswith('$argon2')):
            hash_bytes = binascii.unhexlify(hashed_password.encode('utf-8'))
            if len(hash_bytes) > 16:
                salt = hash_bytes[:16]
                expected_hash = hash_bytes[16:]
                actual_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000)
                if actual_hash == expected_hash:
                    return True
    except Exception:
        pass

    # 2. Try bcrypt verification (for old passwords) if bcrypt is available and works
    try:
        import bcrypt
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        pass

    # 3. Plaintext fallback for test/dev migrations if applicable
    return plain_password == hashed_password

def get_password_hash(password: str) -> str:
    # Use standard library pbkdf2_hmac to avoid C-dependency crashes (e.g. bcrypt/argon2 DLL errors on Windows/Docker)
    salt = os.urandom(16)
    db_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return binascii.hexlify(salt + db_hash).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

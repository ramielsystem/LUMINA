from fastapi import FastAPI, APIRouter, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Lumina Auth API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------- Models ----------
class SessionRequest(BaseModel):
    session_token: str


class UserOut(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None


class BackupIn(BaseModel):
    ciphertext: str
    iv: str
    salt: str
    version: int = 1
    device_name: Optional[str] = None


class BackupOut(BaseModel):
    ciphertext: str
    iv: str
    salt: str
    version: int
    updated_at: str
    device_name: Optional[str] = None


# ---------- Auth helper ----------
async def get_current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session.get("expires_at")
    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------- Public routes ----------
@api_router.get("/")
async def root():
    return {"service": "Lumina Auth", "status": "ok"}


@api_router.post("/auth/session", response_model=UserOut)
async def create_session(payload: SessionRequest):
    """Exchange the Emergent session_token for a verified user & persist session."""
    async with httpx.AsyncClient(timeout=15.0) as http:
        try:
            resp = await http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": payload.session_token},
            )
        except Exception as e:
            logger.exception("session-data call failed: %s", e)
            raise HTTPException(status_code=502, detail="Auth service unreachable")
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session token")
    data = resp.json()
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Missing email in session data")

    # Upsert user by email
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", ""), "picture": data.get("picture")}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc),
        })

    # Store session (session_token from response is the persistent one)
    session_token = data.get("session_token") or payload.session_token
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "session_token": session_token,
            "user_id": user_id,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return UserOut(user_id=user_id, email=email, name=data.get("name", ""), picture=data.get("picture"))


@api_router.get("/auth/me", response_model=UserOut)
async def auth_me(user: dict = None, authorization: Optional[str] = Header(default=None)):
    user = await get_current_user(authorization)
    return UserOut(**{k: user.get(k) for k in ("user_id", "email", "name", "picture")})


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ---------- Encrypted backup ----------
@api_router.get("/backup", response_model=Optional[BackupOut])
async def get_backup(authorization: Optional[str] = Header(default=None)):
    user = await get_current_user(authorization)
    doc = await db.vault_backups.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        return JSONResponse(content=None)
    return BackupOut(
        ciphertext=doc["ciphertext"],
        iv=doc["iv"],
        salt=doc["salt"],
        version=doc.get("version", 1),
        updated_at=doc["updated_at"].isoformat() if isinstance(doc.get("updated_at"), datetime) else str(doc.get("updated_at")),
        device_name=doc.get("device_name"),
    )


@api_router.post("/backup", response_model=BackupOut)
async def put_backup(payload: BackupIn, authorization: Optional[str] = Header(default=None)):
    user = await get_current_user(authorization)
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user["user_id"],
        "ciphertext": payload.ciphertext,
        "iv": payload.iv,
        "salt": payload.salt,
        "version": payload.version,
        "device_name": payload.device_name,
        "updated_at": now,
    }
    await db.vault_backups.update_one({"user_id": user["user_id"]}, {"$set": doc}, upsert=True)
    return BackupOut(
        ciphertext=payload.ciphertext,
        iv=payload.iv,
        salt=payload.salt,
        version=payload.version,
        updated_at=now.isoformat(),
        device_name=payload.device_name,
    )


@api_router.delete("/backup")
async def delete_backup(authorization: Optional[str] = Header(default=None)):
    user = await get_current_user(authorization)
    await db.vault_backups.delete_one({"user_id": user["user_id"]})
    return {"ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.vault_backups.create_index("user_id", unique=True)
    logger.info("Lumina Auth API started, indexes ensured.")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

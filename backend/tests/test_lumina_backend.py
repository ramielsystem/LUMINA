"""Backend API tests for Lumina Auth."""
import os
import pytest
import requests
from pymongo import MongoClient


BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://totp-guard.preview.emergentagent.com").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Public / health ----------
class TestHealth:
    def test_root_status(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("service") == "Lumina Auth"
        assert data.get("status") == "ok"


# ---------- Auth ----------
class TestAuth:
    def test_session_invalid_token_returns_401(self, api):
        r = api.post(f"{BASE_URL}/api/auth/session", json={"session_token": "invalid-token-xyz"})
        # 401 (invalid) or 502 if upstream unreachable - accept 401 only per spec
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"

    def test_session_missing_field_returns_422(self, api):
        r = api.post(f"{BASE_URL}/api/auth/session", json={})
        assert r.status_code == 422

    def test_me_without_bearer_returns_401(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_bad_bearer_returns_401(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer nonexistent-token"})
        assert r.status_code == 401

    def test_me_with_wrong_scheme_returns_401(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Basic abc"})
        assert r.status_code == 401


# ---------- Backup (all require auth) ----------
class TestBackupAuth:
    def test_get_backup_without_auth_returns_401(self, api):
        r = api.get(f"{BASE_URL}/api/backup")
        assert r.status_code == 401

    def test_post_backup_without_auth_returns_401(self, api):
        r = api.post(f"{BASE_URL}/api/backup", json={
            "ciphertext": "aaa", "iv": "bbb", "salt": "ccc", "version": 1,
        })
        assert r.status_code == 401

    def test_delete_backup_without_auth_returns_401(self, api):
        r = api.delete(f"{BASE_URL}/api/backup")
        assert r.status_code == 401

    def test_get_backup_bad_bearer_returns_401(self, api):
        r = api.get(f"{BASE_URL}/api/backup", headers={"Authorization": "Bearer bad"})
        assert r.status_code == 401


# ---------- MongoDB indexes (created on startup) ----------
class TestMongoIndexes:
    @pytest.fixture(scope="class")
    def db(self):
        c = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        return c[DB_NAME]

    def _index_keys(self, coll):
        return {name: info for name, info in coll.index_information().items()}

    def test_users_email_unique(self, db):
        idx = self._index_keys(db.users)
        assert any(
            info.get("key") == [("email", 1)] and info.get("unique")
            for info in idx.values()
        ), f"users.email unique index missing: {idx}"

    def test_users_user_id_unique(self, db):
        idx = self._index_keys(db.users)
        assert any(
            info.get("key") == [("user_id", 1)] and info.get("unique")
            for info in idx.values()
        ), f"users.user_id unique index missing: {idx}"

    def test_sessions_token_unique(self, db):
        idx = self._index_keys(db.user_sessions)
        assert any(
            info.get("key") == [("session_token", 1)] and info.get("unique")
            for info in idx.values()
        ), f"user_sessions.session_token unique missing: {idx}"

    def test_sessions_expires_at_ttl(self, db):
        idx = self._index_keys(db.user_sessions)
        assert any(
            info.get("key") == [("expires_at", 1)] and "expireAfterSeconds" in info
            for info in idx.values()
        ), f"user_sessions.expires_at TTL missing: {idx}"

    def test_vault_backups_user_id_unique(self, db):
        idx = self._index_keys(db.vault_backups)
        assert any(
            info.get("key") == [("user_id", 1)] and info.get("unique")
            for info in idx.values()
        ), f"vault_backups.user_id unique missing: {idx}"


# ---------- Auth flow via seeded session (bypasses OAuth) ----------
class TestBackupCRUDWithSeededSession:
    """Seed a session directly in DB to exercise authenticated backup endpoints."""

    @pytest.fixture(scope="class")
    def seeded(self):
        from datetime import datetime, timezone, timedelta
        c = MongoClient(MONGO_URL)
        db = c[DB_NAME]
        user_id = "TEST_user_lumina_pytest"
        session_token = "TEST_session_lumina_pytest"
        db.users.update_one(
            {"user_id": user_id},
            {"$set": {"user_id": user_id, "email": "TEST_lumina_pytest@example.com",
                      "name": "Pytest User", "picture": None,
                      "created_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        db.user_sessions.update_one(
            {"session_token": session_token},
            {"$set": {"session_token": session_token, "user_id": user_id,
                      "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
                      "created_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        yield {"user_id": user_id, "session_token": session_token, "db": db}
        # Cleanup
        db.user_sessions.delete_one({"session_token": session_token})
        db.users.delete_one({"user_id": user_id})
        db.vault_backups.delete_one({"user_id": user_id})

    def test_me_with_valid_session(self, api, seeded):
        r = api.get(f"{BASE_URL}/api/auth/me",
                    headers={"Authorization": f"Bearer {seeded['session_token']}"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user_id"] == seeded["user_id"]
        assert data["email"] == "TEST_lumina_pytest@example.com"

    def test_get_backup_empty_returns_null(self, api, seeded):
        r = api.get(f"{BASE_URL}/api/backup",
                    headers={"Authorization": f"Bearer {seeded['session_token']}"})
        assert r.status_code == 200
        # Empty -> null
        assert r.json() is None

    def test_put_get_backup_roundtrip(self, api, seeded):
        payload = {
            "ciphertext": "TEST_ct_data",
            "iv": "TEST_iv_val",
            "salt": "TEST_salt_val",
            "version": 1,
            "device_name": "pytest-device",
        }
        r = api.post(f"{BASE_URL}/api/backup", json=payload,
                     headers={"Authorization": f"Bearer {seeded['session_token']}"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ciphertext"] == payload["ciphertext"]
        assert body["iv"] == payload["iv"]
        assert body["salt"] == payload["salt"]
        assert body["version"] == 1
        assert body["device_name"] == "pytest-device"
        assert isinstance(body["updated_at"], str)

        r2 = api.get(f"{BASE_URL}/api/backup",
                     headers={"Authorization": f"Bearer {seeded['session_token']}"})
        assert r2.status_code == 200
        got = r2.json()
        assert got["ciphertext"] == payload["ciphertext"]
        assert got["device_name"] == "pytest-device"

    def test_delete_backup(self, api, seeded):
        r = api.delete(f"{BASE_URL}/api/backup",
                       headers={"Authorization": f"Bearer {seeded['session_token']}"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

        r2 = api.get(f"{BASE_URL}/api/backup",
                     headers={"Authorization": f"Bearer {seeded['session_token']}"})
        assert r2.status_code == 200
        assert r2.json() is None

    def test_logout_deletes_session(self, api, seeded):
        # Create a temp session to delete
        from datetime import datetime, timezone, timedelta
        db = seeded["db"]
        tmp_token = "TEST_session_lumina_pytest_tmp"
        db.user_sessions.update_one(
            {"session_token": tmp_token},
            {"$set": {"session_token": tmp_token, "user_id": seeded["user_id"],
                      "expires_at": datetime.now(timezone.utc) + timedelta(days=1)}},
            upsert=True,
        )
        r = api.post(f"{BASE_URL}/api/auth/logout",
                     headers={"Authorization": f"Bearer {tmp_token}"})
        assert r.status_code == 200
        # Token no longer works
        r2 = api.get(f"{BASE_URL}/api/auth/me",
                     headers={"Authorization": f"Bearer {tmp_token}"})
        assert r2.status_code == 401

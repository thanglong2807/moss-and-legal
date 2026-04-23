"""API tests cho auth endpoints."""
import pytest


class TestLogin:
    def test_login_success(self, client, auth_headers):
        res = client.post("/api/v1/auth/login", data={
            "username": "test@cenvi.vn", "password": "test123"
        })
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == "test@cenvi.vn"

    def test_login_wrong_password(self, client, auth_headers):
        res = client.post("/api/v1/auth/login", data={
            "username": "test@cenvi.vn", "password": "wrong"
        })
        assert res.status_code == 401

    def test_login_unknown_user(self, client):
        res = client.post("/api/v1/auth/login", data={
            "username": "nobody@cenvi.vn", "password": "x"
        })
        assert res.status_code == 401


class TestMe:
    def test_me_authenticated(self, client, auth_headers):
        res = client.get("/api/v1/auth/me", headers=auth_headers)
        assert res.status_code == 200
        assert "permissions" in res.json()

    def test_me_unauthenticated(self, client):
        res = client.get("/api/v1/auth/me")
        assert res.status_code in (401, 403)

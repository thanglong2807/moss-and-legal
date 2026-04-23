"""API tests cho company (TLDN) endpoints."""
import pytest


COMPANY_PAYLOAD = {
    "company_type": 1,
    "company_full_name": "Công ty Test",
    "company_info": {"address": {}, "contact": {}, "name": {}},
    "persons": [],
    "industries": [],
}


class TestCompanyCRUD:
    def test_create(self, client, auth_headers):
        res = client.post("/api/v1/company/", json=COMPANY_PAYLOAD, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["code"].startswith(("DN-", "TLDN-"))
        assert data["company_type"] == 1

    def test_list(self, client, auth_headers):
        res = client.get("/api/v1/company/", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data

    def test_search(self, client, auth_headers):
        client.post("/api/v1/company/", json={**COMPANY_PAYLOAD, "company_full_name": "UniqueCompanyABC"}, headers=auth_headers)
        res = client.get("/api/v1/company/?search=UniqueCompanyABC", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["total"] >= 1

    def test_get_by_id(self, client, auth_headers):
        created = client.post("/api/v1/company/", json=COMPANY_PAYLOAD, headers=auth_headers).json()
        res = client.get(f"/api/v1/company/{created['id']}", headers=auth_headers)
        assert res.status_code == 200

    def test_update(self, client, auth_headers):
        created = client.post("/api/v1/company/", json=COMPANY_PAYLOAD, headers=auth_headers).json()
        res = client.put(f"/api/v1/company/{created['id']}",
                         json={**COMPANY_PAYLOAD, "company_full_name": "Tên Công Ty Mới"},
                         headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["company_full_name"] == "Tên Công Ty Mới"

    def test_delete(self, client, auth_headers):
        created = client.post("/api/v1/company/", json=COMPANY_PAYLOAD, headers=auth_headers).json()
        res = client.delete(f"/api/v1/company/{created['id']}", headers=auth_headers)
        assert res.status_code == 200

    def test_positions(self, client, auth_headers):
        res = client.get("/api/v1/company/positions", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

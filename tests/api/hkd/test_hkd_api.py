"""API tests cho HKD endpoints."""
import pytest


HKD_PAYLOAD = {
    "company_full_name": "Hộ KD API Test",
    "company_info": {"address": {}, "contact": {}},
    "owner": {"personal_info": {"full_name": "Trần Thị B"}},
    "industries": [],
}


class TestHKDCRUD:
    def test_create(self, client, auth_headers):
        res = client.post("/api/v1/hkd/", json=HKD_PAYLOAD, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["code"].startswith("HKD-")
        assert data["company_full_name"] == "Hộ KD API Test"

    def test_list(self, client, auth_headers):
        res = client.get("/api/v1/hkd/", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data

    def test_list_search(self, client, auth_headers):
        client.post("/api/v1/hkd/", json={**HKD_PAYLOAD, "company_full_name": "UniqueXYZ123"}, headers=auth_headers)
        res = client.get("/api/v1/hkd/?search=UniqueXYZ123", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["total"] >= 1

    def test_get_by_id(self, client, auth_headers):
        created = client.post("/api/v1/hkd/", json=HKD_PAYLOAD, headers=auth_headers).json()
        res = client.get(f"/api/v1/hkd/{created['id']}", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["id"] == created["id"]

    def test_update(self, client, auth_headers):
        created = client.post("/api/v1/hkd/", json=HKD_PAYLOAD, headers=auth_headers).json()
        res = client.put(f"/api/v1/hkd/{created['id']}",
                         json={**HKD_PAYLOAD, "company_full_name": "Đã cập nhật"},
                         headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["company_full_name"] == "Đã cập nhật"

    def test_delete(self, client, auth_headers):
        created = client.post("/api/v1/hkd/", json=HKD_PAYLOAD, headers=auth_headers).json()
        res = client.delete(f"/api/v1/hkd/{created['id']}", headers=auth_headers)
        assert res.status_code == 200
        res2 = client.get(f"/api/v1/hkd/{created['id']}", headers=auth_headers)
        assert res2.status_code == 404

    def test_unauthenticated(self, client):
        res = client.get("/api/v1/hkd/")
        assert res.status_code in (401, 403)

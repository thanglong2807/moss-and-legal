"""API tests cho customers endpoints."""
import pytest


CUSTOMER_PAYLOAD = {"name": "Khách Test", "phone": "0901234567"}


class TestCustomerCRUD:
    def test_create(self, client, auth_headers):
        res = client.post("/api/v1/customers/", json=CUSTOMER_PAYLOAD, headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["name"] == "Khách Test"

    def test_list_returns_paginated(self, client, auth_headers):
        res = client.get("/api/v1/customers/?limit=10", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data

    def test_search(self, client, auth_headers):
        client.post("/api/v1/customers/", json={"name": "SearchUnique999", "phone": "0999999999"}, headers=auth_headers)
        res = client.get("/api/v1/customers/?search=SearchUnique999", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["total"] >= 1

    def test_update(self, client, auth_headers):
        created = client.post("/api/v1/customers/", json=CUSTOMER_PAYLOAD, headers=auth_headers).json()
        res = client.put(f"/api/v1/customers/{created['id']}",
                         json={"name": "Tên Mới"}, headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["name"] == "Tên Mới"

    def test_delete(self, client, auth_headers):
        created = client.post("/api/v1/customers/", json=CUSTOMER_PAYLOAD, headers=auth_headers).json()
        res = client.delete(f"/api/v1/customers/{created['id']}", headers=auth_headers)
        assert res.status_code == 200

"""API tests cho export endpoints."""
import pytest


class TestExportHKD:
    def test_export_missing_template(self, client, auth_headers):
        # Tạo HKD trước
        hkd = client.post("/api/v1/hkd/", json={
            "company_full_name": "Test Export",
            "company_info": {"address": {}, "contact": {}},
            "owner": {},
            "industries": [],
        }, headers=auth_headers).json()

        # Template không tồn tại → 404 hoặc 400
        res = client.post(f"/api/v1/export/hkd/{hkd['id']}",
                          json={"template_ids": ["999"]},
                          headers=auth_headers)
        assert res.status_code in (400, 404, 422)

    def test_export_unauthenticated(self, client):
        res = client.post("/api/v1/export/hkd/1", json={"template_ids": ["001"]})
        assert res.status_code in (401, 403)

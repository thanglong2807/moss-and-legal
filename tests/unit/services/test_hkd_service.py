"""Unit tests cho HKD service."""
import pytest
from app.services.hkd_service import hkd_service
from app.schemas.hkd import HKDCreate


class TestHKDCreate:
    def test_create_basic(self, db):
        data = HKDCreate(
            company_full_name="Hộ KD Test",
            company_info={"address": {}, "contact": {}},
            owner={"personal_info": {"full_name": "Nguyễn Văn A"}},
            industries=[],
        )
        hkd = hkd_service.create(db, data)
        assert hkd.id is not None
        assert hkd.code.startswith("HKD-")
        assert hkd.company_full_name == "Hộ KD Test"

    def test_create_generates_unique_code(self, db):
        def make():
            return hkd_service.create(db, HKDCreate(
                company_full_name="Test",
                company_info={"address": {}, "contact": {}},
                owner={},
                industries=[],
            ))
        h1, h2 = make(), make()
        assert h1.code != h2.code


class TestHKDList:
    def test_returns_dict_with_items_and_total(self, db):
        result = hkd_service.get_list(db)
        assert "items" in result
        assert "total" in result
        assert isinstance(result["items"], list)
        assert isinstance(result["total"], int)

    def test_pagination(self, db):
        r1 = hkd_service.get_list(db, skip=0, limit=2)
        r2 = hkd_service.get_list(db, skip=2, limit=2)
        ids1 = {h.id for h in r1["items"]}
        ids2 = {h.id for h in r2["items"]}
        assert ids1.isdisjoint(ids2)

"""Unit tests cho các helper function trong export/base.py"""
import pytest
from app.services.export.base import (
    _fmt_money_dot,
    _so_thanh_chu,
    _gender_str,
    _fmt_date,
    _join_address,
)
from datetime import date


class TestFmtMoneyDot:
    def test_billion(self):
        result = _fmt_money_dot(1_000_000_000)
        assert "1.000.000.000" in result

    def test_zero(self):
        result = _fmt_money_dot(0)
        assert result is not None and result != ""

    def test_none(self):
        result = _fmt_money_dot(None)
        assert result is not None


class TestSoThanhChu:
    def test_basic(self):
        result = _so_thanh_chu(1_000_000)
        assert "triệu" in result.lower() or "một" in result.lower()

    def test_zero(self):
        assert _so_thanh_chu(0) != ""


class TestGenderStr:
    def test_male(self):
        assert _gender_str(0) == "Nam"

    def test_female(self):
        assert _gender_str(1) == "Nữ"

    def test_none(self):
        assert _gender_str(None) == ""


class TestFmtDate:
    def test_date_obj(self):
        assert _fmt_date(date(1990, 5, 15)) == "15/05/1990"

    def test_string(self):
        result = _fmt_date("1990-05-15")
        assert "1990" in result and "05" in result and "15" in result

    def test_none(self):
        assert _fmt_date(None) in ("", None)


class TestJoinAddress:
    def test_full(self):
        result = _join_address("123 Lý Thường Kiệt", "Phường 1", "TP.HCM")
        assert "123 Lý Thường Kiệt" in result
        assert "TP.HCM" in result

    def test_partial(self):
        result = _join_address("", "", "Hà Nội")
        assert "Hà Nội" in result

    def test_empty(self):
        result = _join_address("", "", "")
        assert isinstance(result, str)

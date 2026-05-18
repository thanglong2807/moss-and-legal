from pydantic import BaseModel
from typing import Optional, List


class ViettelContractRequest(BaseModel):
    company_id: int
    rep_id_date: Optional[str] = None
    rep_id_place: Optional[str] = None
    company_biz_reg_place: Optional[str] = None


class ViettelDocxRequest(BaseModel):
    company_id: int
    rep_place: Optional[str] = None
    rep_date: Optional[str] = None


class ViettelMergeData(BaseModel):
    rep_place: Optional[str] = None
    rep_date: Optional[str] = None


class ViettelMergeGroup(BaseModel):
    ids: List[str] = []
    data: ViettelMergeData = ViettelMergeData()


class MossLegalMergeData(BaseModel):
    pass


class MossLegalMergeGroup(BaseModel):
    ids: List[str] = []
    data: Optional[MossLegalMergeData] = None


class MergeAllRequest(BaseModel):
    company_id: int
    viettel: ViettelMergeGroup = ViettelMergeGroup()
    moss_legal: Optional[MossLegalMergeGroup] = None

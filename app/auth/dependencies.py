from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.service import decode_token
from app.auth.user_service import get_user_by_id

bearer = HTTPBearer(auto_error=False)

_ACTION_FIELD = {
    "view": "can_view",
    "create": "can_create",
    "update": "can_update",
    "delete": "can_delete",
}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Chưa đăng nhập")

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token không hợp lệ")

    user = get_user_by_id(db, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tài khoản không tồn tại hoặc bị khoá")
    return user


def require_permission(module: str, action: str = "view"):
    """Factory: trả về dependency kiểm tra quyền module/action."""
    field = _ACTION_FIELD[action]

    def _check(current_user=Depends(get_current_user)):
        if not current_user.role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản chưa được gán vai trò")
        perm = next((p for p in current_user.role.permissions if p.module == module), None)
        if perm is None or not getattr(perm, field):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Không có quyền {action} trên module '{module}'")
        return current_user

    return _check


def require_admin(current_user=Depends(get_current_user)):
    if not current_user.role or current_user.role.name != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ ADMIN mới có quyền này")
    return current_user

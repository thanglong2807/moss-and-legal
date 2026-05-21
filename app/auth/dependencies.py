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
        # Super admin có toàn quyền — bypass permission check
        if current_user.is_super_admin:
            return current_user
        if not current_user.role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản chưa được gán vai trò")
        perm = next((p for p in current_user.role.permissions if p.module == module), None)
        if perm is None or not getattr(perm, field):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Không có quyền {action} trên module '{module}'")
        return current_user

    return _check


def require_admin(current_user=Depends(get_current_user)):
    # SuperAdmin hoặc bất kỳ role nào có level=1 đều được phép
    if current_user.is_super_admin:
        return current_user
    if not current_user.role or current_user.role.level != 1:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ ADMIN mới có quyền này")
    return current_user


def require_super_admin(current_user=Depends(get_current_user)):
    if not current_user.is_super_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ Super Admin mới có quyền này")
    return current_user


def require_tenant_admin(current_user=Depends(get_current_user)):
    if current_user.is_super_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admin không truy cập được tài nguyên tenant")
    if not current_user.role or current_user.role.level != 1:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ Tenant Admin mới có quyền này")
    return current_user


def get_tenant_id(current_user=Depends(get_current_user)) -> int:
    """Trả về tenant_id của user hiện tại. Lỗi 400 nếu là super admin."""
    if current_user.is_super_admin or current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Endpoint này chỉ dành cho tenant users")
    return current_user.tenant_id

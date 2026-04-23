"""
Backward-compatibility shim — re-exports from app.services.export.hkd.
The export endpoint imports from here; new code should import from the subpackage.
"""
from app.services.export.hkd import (  # noqa: F401
    get_full_data,
    export_templates,
    registry,
    TEMPLATE_DIR,
)

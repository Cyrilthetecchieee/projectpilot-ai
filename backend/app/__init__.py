import sys
from pathlib import Path

# Ensure 'backend' directory is in sys.path so 'import app...' works from root or anywhere
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

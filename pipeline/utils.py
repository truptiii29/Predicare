import json, math
import numpy as np


def clean(o):
    """Make objects JSON-safe (NaN -> None, numpy -> python)."""
    if isinstance(o, dict):
        return {str(k): clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if isinstance(o, np.ndarray):
        return clean(o.tolist())
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating, float)):
        return None if (math.isnan(float(o)) or math.isinf(float(o))) else float(o)
    return o


def save_json(obj, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(clean(obj), f, indent=1)
    print("wrote", path)

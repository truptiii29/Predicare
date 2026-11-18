"""Dataset loading, cohort construction and target generation (notebook methodology)."""
import numpy as np
import pandas as pd
from config import DATASET_FILES, FEATURE_COLS, TARGET


def load_raw() -> pd.DataFrame:
    frames = []
    for years, path in DATASET_FILES.items():
        if not path.exists():
            raise FileNotFoundError(f"Missing dataset file: {path}")
        f = pd.read_excel(path)
        f["followup_years"] = years
        frames.append(f)
    raw = pd.concat(frames, ignore_index=True)
    required = {"patientid", "timed", "type_3", "age", "sex", "weight", "height", "glu", "HbA1c", "SBP", "DBP", "rate"}
    missing = required - set(raw.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")
    return raw


def add_derived(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    for c in ["age", "weight", "height", "glu", "HbA1c", "rate", "SBP", "DBP", "sex"]:
        frame[c] = pd.to_numeric(frame[c], errors="coerce")
    frame.loc[~frame["height"].between(100, 230), "height"] = np.nan
    frame.loc[~frame["weight"].between(20, 350), "weight"] = np.nan
    frame["bmi"] = frame["weight"] / (frame["height"] / 100) ** 2
    frame.loc[~frame["bmi"].between(10, 80), "bmi"] = np.nan
    frame["pulse_pressure"] = frame["SBP"] - frame["DBP"]
    return frame


def build_cohort(raw: pd.DataFrame):
    """Baseline (timed=1, type_3=1 prediabetes) joined to follow-up (timed=2) outcome.

    Returns (cohort_df, audit_dict). Follow-up type_3 == 2 -> progressed (notebook rule).
    """
    baseline = raw.loc[raw["timed"] == 1].copy()
    followup = raw.loc[raw["timed"] == 2, ["patientid", "type_3"]].rename(columns={"type_3": "type_3_followup"})
    if baseline["patientid"].duplicated().any() or followup["patientid"].duplicated().any():
        raise ValueError("Duplicate patient IDs in baseline or follow-up records.")
    merged = baseline.merge(followup, on="patientid", how="inner", validate="one_to_one")
    prediabetic = merged.loc[merged["type_3"] == 1].copy()
    prediabetic[TARGET] = (prediabetic["type_3_followup"] == 2).astype(int)
    audit = {
        "baseline_followup_pairs": int(len(merged)),
        "baseline_prediabetes": int(len(prediabetic)),
        "followup_status_missing_counted_as_no_progression": int(prediabetic["type_3_followup"].isna().sum()),
        "followup_status_counts": {str(k): int(v) for k, v in prediabetic["type_3_followup"].value_counts(dropna=False).items()},
        "transition_table_baseline_vs_followup": {
            str(b): {str(f): int(n) for f, n in row.items()}
            for b, row in pd.crosstab(merged["type_3"], merged["type_3_followup"]).iterrows()
        },
    }
    prediabetic = add_derived(prediabetic)
    df = prediabetic[["patientid", "followup_years"] + FEATURE_COLS + [TARGET]].reset_index(drop=True)
    if df.empty or df[TARGET].nunique() != 2:
        raise ValueError("Eligible cohort must contain both classes.")
    return df, audit

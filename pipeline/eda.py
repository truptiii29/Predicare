"""Chart data for the Dataset Analytics page - computed from the real workbooks."""
import numpy as np
import pandas as pd
from config import FEATURE_COLS, FEATURE_LABELS, TARGET, FOLLOWUP_YEARS

DIST_FEATURES = ["age", "bmi", "glu", "HbA1c", "SBP", "DBP", "rate"]


def histogram(df, col, bins=24):
    s = df[col].dropna()
    edges = np.histogram_bin_edges(s, bins=bins)
    out = {"edges": edges.tolist(), "groups": {}}
    for label, g in [("No progression", df[df[TARGET] == 0]), ("Progressed", df[df[TARGET] == 1])]:
        counts, _ = np.histogram(g[col].dropna(), bins=edges)
        out["groups"][label] = counts.tolist()
    return out


def box_stats(s):
    s = s.dropna()
    q1, med, q3 = s.quantile([.25, .5, .75])
    iqr = q3 - q1
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    inside = s[(s >= lo) & (s <= hi)]
    return {"n": int(len(s)), "min": s.min(), "q1": q1, "median": med, "q3": q3, "max": s.max(),
            "lower_whisker": inside.min(), "upper_whisker": inside.max(),
            "n_outliers": int(((s < lo) | (s > hi)).sum()),
            "outlier_pct": float(((s < lo) | (s > hi)).mean() * 100),
            "outliers_sample": s[(s < lo) | (s > hi)].round(2).head(60).tolist()}


def build(raw, df, audit):
    per_cohort = []
    for y in FOLLOWUP_YEARS:
        r = raw[raw.followup_years == y]
        c = df[df.followup_years == y]
        per_cohort.append({
            "followup_years": y, "records": int(len(r)), "unique_patients": int(r.patientid.nunique()),
            "baseline_prediabetes": int(len(c)), "progressed": int(c[TARGET].sum()),
            "not_progressed": int((c[TARGET] == 0).sum()),
            "progression_rate": float(c[TARGET].mean()) if len(c) else None,
        })
    corr_cols = ["age", "bmi", "glu", "HbA1c", "SBP", "DBP", "rate", "sex", TARGET]
    corr = df[corr_cols].corr()
    labels = [FEATURE_LABELS.get(c, "Progressed") for c in corr_cols]
    corr_features = df[FEATURE_COLS].corr()
    return {
        "totals": {"records": int(len(raw)), "unique_patients": int(raw.patientid.nunique()),
                   "eligible_cohort": int(len(df)), "progressed": int(df[TARGET].sum()),
                   "not_progressed": int((df[TARGET] == 0).sum()),
                   "progression_rate": float(df[TARGET].mean()), "n_features": len(FEATURE_COLS)},
        "per_cohort": per_cohort,
        "missing_by_feature": [{"feature": FEATURE_LABELS[c], "missing_pct": float(df[c].isna().mean() * 100),
                                "missing_n": int(df[c].isna().sum())} for c in FEATURE_COLS],
        "histograms": {FEATURE_LABELS[c]: histogram(df, c) for c in DIST_FEATURES},
        "boxplots": {FEATURE_LABELS[c]: box_stats(df[c]) for c in FEATURE_COLS},
        "boxplots_by_outcome": {FEATURE_LABELS[c]: {"No progression": box_stats(df.loc[df[TARGET] == 0, c]),
                                                    "Progressed": box_stats(df.loc[df[TARGET] == 1, c])}
                                for c in FEATURE_COLS if c != "sex"},
        "correlation": {"labels": labels, "matrix": corr.values.round(4).tolist()},
        "correlation_features": {"labels": [FEATURE_LABELS[c] for c in FEATURE_COLS],
                                 "matrix": corr_features.values.round(4).tolist()},
        "sex_progression": [{"sex": int(k), "n": int(v["count"]), "rate": float(v["mean"])}
                            for k, v in df.groupby("sex")[TARGET].agg(["count", "mean"]).iterrows()],
        "descriptives": {FEATURE_LABELS[c]: {k: (None if pd.isna(v) else float(v)) for k, v in
                         df[c].describe().items()} for c in FEATURE_COLS},
        "audit": audit,
    }

"""Central configuration for the PrediCare pipeline (mirrors the notebook)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = ROOT / "data"
RESULTS_DIR = ROOT / "results"
RESULTS_DIR.mkdir(exist_ok=True)

RANDOM_STATE = 42
FOLLOWUP_YEARS = [4, 5, 6, 7, 8]
DATASET_FILES = {y: DATASET_DIR / f"{y}_years_datas.xlsx" for y in FOLLOWUP_YEARS}

# Notebook feature set (9 baseline predictors)
FEATURE_COLS = ["age", "sex", "bmi", "glu", "HbA1c", "SBP", "DBP", "pulse_pressure", "rate"]
FEATURE_LABELS = {
    "age": "Age", "sex": "Sex", "bmi": "BMI", "glu": "Glucose", "HbA1c": "HbA1c",
    "SBP": "SBP", "DBP": "DBP", "pulse_pressure": "Pulse Pressure", "rate": "Heart Rate",
}
HMM_FEATURES = ["age", "bmi", "glu", "HbA1c", "SBP", "DBP", "rate"]
TARGET = "progressed_to_t2d"

CV_FOLDS = 5
TEST_FRACTION = 0.15   # 70 / 15 / 15 split
VAL_FRACTION = 0.15

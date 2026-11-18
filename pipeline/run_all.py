"""Run the full pipeline and write JSON results to ../results/. Usage: python run_all.py"""
import time
from config import RESULTS_DIR
from utils import save_json
import data_processing, eda, train_models, clustering, hmm_model, report


def main():
    t = time.time()
    raw = data_processing.load_raw()
    df, audit = data_processing.build_cohort(raw)
    print("cohort", df.shape)
    save_json(eda.build(raw, df, audit), RESULTS_DIR / "eda.json")
    sup = train_models.run(df)
    save_json({k: v for k, v in sup.items() if k != "importance"}, RESULTS_DIR / "classification.json")
    save_json(sup["importance"], RESULTS_DIR / "importance.json")
    save_json(report.build(sup), RESULTS_DIR / "interpretation.json")
    save_json(clustering.run(df), RESULTS_DIR / "clustering.json")
    save_json(hmm_model.run(raw, df), RESULTS_DIR / "hmm.json")
    save_json({"generated_by": "pipeline/run_all.py", "seconds": round(time.time() - t, 1),
               "datasets": [f"{y}_years_datas.xlsx" for y in (4, 5, 6, 7, 8)]}, RESULTS_DIR / "meta.json")


if __name__ == "__main__":
    main()

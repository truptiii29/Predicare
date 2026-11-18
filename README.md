# PrediCare — Predicting Progression from Prediabetes to Type 2 Diabetes

Academic research demonstration (not a medical diagnosis system). Every number on the website is computed from the five supplied Excel workbooks by `pipeline/run_all.py` and stored as JSON; the frontend only reads those files.

## Structure
```
predicare/
├── README.md
├── requirements.txt
├── data/                    4_years_datas.xlsx … 8_years_datas.xlsx
├── notebooks/
│   ├── Unit1_2_PrediCare.ipynb
│   └── Unit3_4_PrediCare.ipynb
├── results/                 JSON figures, tables, and saved metrics
├── report/                  Final project report (PDF)
├── LICENSE
├── pipeline/                Reproducible data and model pipeline
├── web/                     8 HTML pages, CSS, and JavaScript
└── serve.py                 Local static server
```

## Run
```bash
pip install -r requirements.txt
python pipeline/run_all.py     # ~1 minute; regenerates results/*.json
python serve.py                # open http://localhost:8000
```
Pages fetch `../results/*.json`, so they must be served over HTTP (not opened via `file://`). Plotly and Google Fonts load from CDNs, so an internet connection is needed for charts. If the JSON files are missing, each page shows an empty state telling you what to run. No Django is needed: the backend is the Python pipeline plus static JSON (you can serve `results/` from Django static files if you later prefer).

## Methodology notes
* Outcome verified: baseline `timed=1` & `type_3=1` (prediabetes); progressed if follow-up `timed=2` `type_3=2`. Baseline predictors only.
* Notebook preserved: median imputation + standard scaling inside the pipeline (fitted per training fold), class-balanced models, 5-fold stratified CV on train+validation, selection by mean CV ROC-AUC (ties → lower std), K-Means k by silhouette, GMM k by BIC.
* Patient IDs are unique in the cohort and are asserted not to cross train/test.
* **Flagged issue:** 44 eligible patients have a blank follow-up `type_3`; the notebook rule labels them “did not progress”. Kept for reproducibility and shown on the Study design page. Consider excluding them as a sensitivity analysis.
* The validation split is used only inside the CV pool (as in the notebook), not for separate tuning.
* HMM: fitted on two-visit sequences, exploratory only; limitations are shown with it.
* The two duplicate `*_1.xlsx` uploads were byte-identical to the originals and are not included.

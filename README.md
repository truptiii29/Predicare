# PrediCare

**Predicting Progression from Prediabetes to Type 2 Diabetes**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

PrediCare is an academic machine-learning project that studies whether baseline clinical measurements can estimate the risk of progression from prediabetes to type 2 diabetes. The project combines an exploratory data pipeline, model comparison, clustering, hidden Markov modelling, generated interpretations, and an interactive website for presenting the results.

> **Research demonstration only:** PrediCare is not a medical diagnosis system and must not be used for clinical decisions. Results require external validation before any real-world use.

## Table of Contents

- [Project Overview](#project-overview)
- [Repository Structure](#repository-structure)
- [Research Methodology](#research-methodology)
- [Dataset](#dataset)
- [Installation](#installation)
- [Running the Project](#running-the-project)
- [Website Pages](#website-pages)
- [Generated Outputs](#generated-output)
- [Notebook Files](#notebook-files)
- [Important Data and Modeling Notes](#important-data-and-modeling-notes)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Project Overview

The repository contains two main components:

1. **A reproducible Python pipeline** that loads the Excel datasets, builds the study cohort, trains and evaluates machine-learning models, performs unsupervised analyses, and writes JSON result files.
2. **A static website** that reads the generated JSON files and presents charts, tables, model comparisons, interpretation, and study limitations.

The five input workbooks represent follow-up cohorts of 4, 5, 6, 7, and 8 years. The pipeline merges and processes the eligible observations, uses baseline measurements as predictors, and evaluates progression to type 2 diabetes.

## Repository Structure

```text
Predicare/
├── README.md
├── requirements.txt
├── LICENSE
├── data/
│   ├── 4_years_datas.xlsx
│   ├── 5_years_datas.xlsx
│   ├── 6_years_datas.xlsx
│   ├── 7_years_datas.xlsx
│   └── 8_years_datas.xlsx
├── notebooks/
│   ├── Unit1_2_PrediCare.ipynb
│   ├── Unit3_4_PrediCare.ipynb
│   └── Unit5_PrediCare.ipynb
├── pipeline/
│   ├── config.py
│   ├── data_processing.py
│   ├── eda.py
│   ├── train_models.py
│   ├── clustering.py
│   ├── hmm_model.py
│   ├── report.py
│   ├── utils.py
│   └── run_all.py
├── results/
│   ├── eda.json
│   ├── classification.json
│   ├── importance.json
│   ├── interpretation.json
│   ├── clustering.json
│   ├── hmm.json
│   └── meta.json
├── report/
│   └── Final project report (PDF)
├── web/
│   ├── index.html
│   ├── study.html
│   ├── analytics.html
│   ├── models.html
│   ├── features.html
│   ├── clustering.html
│   ├── hmm.html
│   ├── interpretation.html
│   ├── css/
│   └── js/
└── serve.py
```

## Research Methodology

### Outcome Definition

The baseline population is identified by:

- `timed == 1`
- `type_3 == 1`

Progression is identified when the follow-up visit has:

- `timed == 2`
- `type_3 == 2`

All predictors are derived from baseline measurements. Follow-up status is used only to construct the target outcome.

### Baseline Predictors

The primary feature set contains:

| Feature | Description |
|---|---|
| `age` | Age |
| `sex` | Sex |
| `bmi` | Body mass index |
| `glu` | Glucose |
| `HbA1c` | Glycated haemoglobin |
| `SBP` | Systolic blood pressure |
| `DBP` | Diastolic blood pressure |
| `pulse_pressure` | Systolic minus diastolic blood pressure |
| `rate` | Heart rate |

### Data Preparation

- Excel workbooks are loaded and merged.
- Numeric and categorical fields are cleaned where applicable.
- Missing numeric values are handled with median imputation.
- Predictors are standardized within the training pipeline.
- Patient identity checks help prevent the same patient appearing across training and test partitions.

### Classification

The pipeline compares class-balanced machine-learning classifiers using a 70/15/15 split:

- 70% training
- 15% validation
- 15% test

The validation portion is included in the five-fold cross-validation pool, rather than used as a separate tuning set. Model selection is based primarily on mean cross-validation ROC-AUC, with standard deviation used as a tie-breaker.

Evaluation metrics include:

- Accuracy
- Precision
- Recall
- F1 score
- ROC-AUC
- Precision-recall AUC

### Clustering

K-Means and Gaussian Mixture Models are evaluated using clustering metrics and principal-component projections:

- K-Means: silhouette-based model selection
- GMM: BIC-based model selection
- PCA: two-dimensional visualization

### Hidden Markov Model

An exploratory Gaussian HMM is fitted to two-visit sequences using selected baseline and follow-up measurements. HMM results are descriptive and are not presented as clinically validated longitudinal risk predictions.

## Dataset

The data directory contains:

- `4_years_datas.xlsx`
- `5_years_datas.xlsx`
- `6_years_datas.xlsx`
- `7_years_datas.xlsx`
- `8_years_datas.xlsx`

The generated metadata records these five workbook names. To change datasets or follow-up periods, update `FOLLOWUP_YEARS`, `DATASET_FILES`, or the relevant processing logic in `pipeline/config.py` and `pipeline/data_processing.py`.

## Installation

### Requirements

- Python 3.10 or newer is recommended
- Internet access for Plotly and Google Fonts used by the website
- Microsoft Excel-compatible `.xlsx` files

### Setup

From the project root:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Running the Project

### 1. Generate all results

```powershell
python pipeline/run_all.py
```

The pipeline can take approximately one minute, depending on hardware and the supplied data. It regenerates the JSON files in `results/`.

### 2. Start the local website

```powershell
python serve.py
```

Then open:

```text
http://localhost:8000
```

The server redirects `/` to `/web/index.html`. Do not open the HTML files directly with `file://`; the JavaScript uses HTTP requests to read JSON from `results/`.

## Website Pages

| Page | Purpose |
|---|---|
| Home | Project summary and key computed statistics |
| Study Design | Cohort construction and data-quality limitations |
| Dataset Analytics | Exploratory distributions and cohort summaries |
| Model Results | Cross-validation and test-set model comparison |
| Feature Importance | Predictor importance and model explanation |
| Clustering | K-Means and GMM clustering results |
| HMM | Exploratory longitudinal sequence analysis |
| Interpretation | Automated interpretation of the generated results |

## Generated Output

Running `python pipeline/run_all.py` creates:

| File | Contents |
|---|---|
| `results/eda.json` | Dataset analytics and exploratory summaries |
| `results/classification.json` | Split sizes and classifier metrics |
| `results/importance.json` | Predictor importance values |
| `results/interpretation.json` | Automatically generated result summaries |
| `results/clustering.json` | Cluster metrics, profiles, and projections |
| `results/hmm.json` | HMM status and exploratory results |
| `results/meta.json` | Dataset names and pipeline runtime metadata |

The website only reads these JSON files and does not rerun the machine-learning pipeline in the browser.

## Notebook Files

- `notebooks/Unit1_2_PrediCare.ipynb`
- `notebooks/Unit3_4_PrediCare.ipynb`
- `notebooks/Unit5_PrediCare.ipynb`

These notebooks document exploratory and methodological work associated with the project. The Python pipeline is the reproducible source for generated website results.

## Important Data and Modeling Notes

- **Unknown follow-up status:** Some eligible patients have a blank follow-up `type_3`. The notebook rule currently treats `type_3_followup == 2` as progression and all other nonprogression values as no observed progression. This is preserved for reproducibility and is not a true outcome for unknown cases.
- **Missing outcomes should be reviewed:** Excluding records with unknown follow-up status may be appropriate in a sensitivity analysis.
- **Validation design:** The validation split is part of the cross-validation pool in this project, not an independent tuning set.
- **Reproducibility:** The random state is fixed in `pipeline/config.py`.
- **Patient leakage:** The pipeline includes patient-ID checks intended to keep individuals out of multiple dataset partitions.
- **External validity:** The supplied cohort and models require independent validation before clinical or population-level use.
- **HMM limitations:** Fitting is exploratory, uses limited random starts, and does not establish a clinical longitudinal model.

## Troubleshooting

### No website results appear

Run:

```powershell
python pipeline/run_all.py
python serve.py
```

Then open `http://localhost:8000` instead of opening a `.html` file directly.

### Package installation fails

Upgrade the package manager and install dependencies into a virtual environment:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### HMM status is unavailable

Make sure `hmmlearn` is installed:

```powershell
python -m pip install hmmlearn
python pipeline/run_all.py
```

### Dataset or output mismatch

Confirm that all five files remain in `data/` and that the workbook columns match the format expected by `pipeline/data_processing.py`. Delete and regenerate `results/` only after the source data has been verified.

## License

This project is licensed under the [MIT License](LICENSE).

"""Supervised training and evaluation - 70/15/15 split, 5-fold CV on train+validation (notebook design)."""
import warnings
import numpy as np
import pandas as pd
import xgboost as xgb
import shap
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
                             average_precision_score, confusion_matrix, roc_curve, precision_recall_curve)
from sklearn.inspection import permutation_importance
from config import FEATURE_COLS, FEATURE_LABELS, TARGET, RANDOM_STATE, CV_FOLDS, TEST_FRACTION, VAL_FRACTION

warnings.filterwarnings("ignore")
SCORING = ["accuracy", "precision", "recall", "f1", "roc_auc", "average_precision"]


def thin(x, y, n=200):
    idx = np.unique(np.linspace(0, len(x) - 1, min(n, len(x))).astype(int))
    return np.asarray(x)[idx].round(5).tolist(), np.asarray(y)[idx].round(5).tolist()


def run(df):
    assert not df["patientid"].duplicated().any(), "patient appears more than once - use grouped split"
    X, y = df[FEATURE_COLS].copy(), df[TARGET].astype(int)
    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=TEST_FRACTION + VAL_FRACTION,
                                                        stratify=y, random_state=RANDOM_STATE)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, stratify=y_temp,
                                                    random_state=RANDOM_STATE)
    assert not (set(df.loc[X_train.index, "patientid"]) & set(df.loc[X_test.index, "patientid"]))
    X_tv, y_tv = pd.concat([X_train, X_val]), pd.concat([y_train, y_val])

    preprocess = ColumnTransformer([("numeric", Pipeline([("imputer", SimpleImputer(strategy="median")),
                                                           ("scaler", StandardScaler())]), FEATURE_COLS)])
    neg, pos = np.bincount(y_tv)
    spw = neg / pos
    models = {
        "Logistic Regression": LogisticRegression(max_iter=2000, class_weight="balanced", random_state=RANDOM_STATE),
        "Random Forest": RandomForestClassifier(n_estimators=400, max_depth=6, min_samples_leaf=5,
                                                class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1),
        "XGBoost": xgb.XGBClassifier(n_estimators=300, max_depth=3, learning_rate=0.05, scale_pos_weight=spw,
                                     eval_metric="logloss", random_state=RANDOM_STATE, n_jobs=-1),
        "SVM (RBF)": SVC(kernel="rbf", C=1.0, gamma="scale", probability=True, class_weight="balanced",
                         random_state=RANDOM_STATE),
    }
    hyper = {
        "Logistic Regression": "max_iter=2000, class_weight=balanced",
        "Random Forest": "n_estimators=400, max_depth=6, min_samples_leaf=5, class_weight=balanced",
        "XGBoost": f"n_estimators=300, max_depth=3, learning_rate=0.05, scale_pos_weight={spw:.3f}",
        "SVM (RBF)": "kernel=rbf, C=1.0, gamma=scale, probability=True, class_weight=balanced",
    }
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    out = {"split": {"train": len(X_train), "validation": len(X_val), "test": len(X_test),
                     "train_progressed": int(y_train.sum()), "validation_progressed": int(y_val.sum()),
                     "test_progressed": int(y_test.sum()), "cv_folds": CV_FOLDS,
                     "cv_pool": "train + validation (n=%d)" % len(X_tv),
                     "class_weight_neg_over_pos": float(spw)},
           "models": {}}
    pipes = {}
    for name, est in models.items():
        entry = {"status": "trained", "hyperparameters": hyper[name]}
        try:
            pipe = Pipeline([("preprocess", preprocess), ("model", est)])
            cvr = cross_validate(pipe, X_tv, y_tv, cv=cv, scoring=SCORING, n_jobs=-1, error_score="raise")
            entry["cv"] = {}
            for m in SCORING:
                v = cvr[f"test_{m}"]
                entry["cv"]["pr_auc" if m == "average_precision" else m] = {"mean": float(v.mean()), "std": float(v.std()),
                                                                           "folds": v.round(4).tolist()}
            pipe.fit(X_tv, y_tv)
            pipes[name] = pipe
            pred = pipe.predict(X_test)
            prob = pipe.predict_proba(X_test)[:, 1]
            tn, fp, fn, tp = confusion_matrix(y_test, pred, labels=[0, 1]).ravel()
            entry["test"] = {"accuracy": accuracy_score(y_test, pred), "precision": precision_score(y_test, pred, zero_division=0),
                             "recall": recall_score(y_test, pred, zero_division=0), "f1": f1_score(y_test, pred, zero_division=0),
                             "roc_auc": roc_auc_score(y_test, prob), "pr_auc": average_precision_score(y_test, prob),
                             "specificity": tn / max(1, tn + fp)}
            entry["confusion_matrix"] = {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}
            fpr, tpr, _ = roc_curve(y_test, prob)
            p, r, _ = precision_recall_curve(y_test, prob)
            entry["roc_curve"] = dict(zip(["fpr", "tpr"], thin(fpr, tpr)))
            entry["pr_curve"] = dict(zip(["recall", "precision"], thin(r, p)))
        except Exception as e:  # report real status, never fabricate
            entry = {"status": f"failed: {type(e).__name__}: {e}", "hyperparameters": hyper[name]}
        out["models"][name] = entry

    ok = [n for n, e in out["models"].items() if e["status"] == "trained"]
    # Notebook selection rule: highest mean CV ROC-AUC, ties broken by lower CV ROC-AUC std
    ranking = sorted(ok, key=lambda n: (-out["models"][n]["cv"]["roc_auc"]["mean"], out["models"][n]["cv"]["roc_auc"]["std"]))
    out["selection"] = {"criterion": "Highest mean 5-fold CV ROC-AUC (ties: lower std), as in the notebook",
                        "ranking": ranking, "selected": ranking[0] if ranking else None}
    out["test_prevalence"] = float(y_test.mean())

    # ---- importance ----
    imp = {"features": [FEATURE_LABELS[c] for c in FEATURE_COLS], "model_specific": {}, "permutation": {}, "shap": None}
    for name in ok:
        pipe = pipes[name]
        m = pipe.named_steps["model"]
        if name == "Logistic Regression":
            imp["model_specific"][name] = {"type": "Standardised coefficient (log-odds per 1 SD)", "values": m.coef_[0].tolist()}
        elif name in ("Random Forest", "XGBoost"):
            imp["model_specific"][name] = {"type": "Impurity / gain importance", "values": m.feature_importances_.tolist()}
        pi = permutation_importance(pipe, X_test, y_test, n_repeats=20, random_state=RANDOM_STATE, scoring="roc_auc", n_jobs=-1)
        imp["permutation"][name] = {"mean": pi.importances_mean.tolist(), "std": pi.importances_std.tolist(),
                                    "metric": "Drop in test ROC-AUC after permuting the feature (20 repeats)"}
    trees = [n for n in ["XGBoost", "Random Forest"] if n in ok]
    if trees:
        best_tree = max(trees, key=lambda n: out["models"][n]["cv"]["roc_auc"]["mean"])
        try:
            pipe = pipes[best_tree]
            Xt = pd.DataFrame(pipe.named_steps["preprocess"].transform(X_test), columns=FEATURE_COLS, index=X_test.index)
            raw_sv = shap.TreeExplainer(pipe.named_steps["model"]).shap_values(Xt)
            sv = raw_sv[1] if isinstance(raw_sv, list) else (raw_sv[:, :, 1] if np.ndim(raw_sv) == 3 else raw_sv)
            imp["shap"] = {"model": best_tree, "mean_abs": np.abs(sv).mean(0).tolist(),
                           "beeswarm": [{"feature": FEATURE_LABELS[c], "points": [
                               {"shap": float(sv[i, j]), "value": float(Xt.iloc[i, j])} for i in range(0, len(Xt), max(1, len(Xt) // 120))]}
                               for j, c in enumerate(FEATURE_COLS)]}
        except Exception as e:
            imp["shap"] = {"status": f"failed: {type(e).__name__}: {e}"}
    out["importance"] = imp
    return out

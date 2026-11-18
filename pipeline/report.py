"""Automated interpretation built only from computed results."""
LABELS = {"accuracy": "accuracy", "precision": "precision", "recall": "recall", "f1": "F1-score",
          "roc_auc": "ROC-AUC", "pr_auc": "PR-AUC", "specificity": "specificity"}

LIMITATIONS = {
    "Logistic Regression": "Assumes linear log-odds in the features; cannot capture interactions unless engineered. Balanced class weights raise recall at the cost of precision.",
    "Random Forest": "Less interpretable than coefficients; impurity importance can favour continuous features; depth/leaf limits were fixed, not tuned.",
    "XGBoost": "Many hyperparameters; was not tuned beyond notebook defaults; can overfit a cohort this small without careful validation.",
    "SVM (RBF)": "Probabilities come from internal Platt scaling; no native feature importance; scales poorly and is sensitive to C and gamma (untuned).",
}


def build(sup):
    ms = {n: e for n, e in sup["models"].items() if e["status"] == "trained"}
    if not ms:
        return {"available": False, "message": "No classifier trained successfully."}
    best = lambda split, m, hi=True: (max if hi else min)(ms, key=lambda n: ms[n][split][m] if split == "test" else ms[n]["cv"][m]["mean"])
    findings = {}
    for m in ["accuracy", "recall", "roc_auc", "f1", "precision", "pr_auc", "specificity"]:
        n = best("test", m)
        findings[m] = {"model": n, "value": ms[n]["test"][m]}
    cons = min(ms, key=lambda n: ms[n]["cv"]["roc_auc"]["std"])
    gaps = {n: ms[n]["cv"]["roc_auc"]["mean"] - ms[n]["test"]["roc_auc"] for n in ms}
    prev = sup["test_prevalence"]
    sel = sup["selection"]["selected"]
    sm = ms[sel]
    cm = sm["confusion_matrix"]
    lines = [
        f"By the notebook criterion (highest mean 5-fold CV ROC-AUC), {sel} is selected: CV ROC-AUC {sm['cv']['roc_auc']['mean']:.3f} ± {sm['cv']['roc_auc']['std']:.3f}.",
        f"On the held-out test set the highest accuracy is {findings['accuracy']['model']} ({findings['accuracy']['value']:.3f}), highest recall is {findings['recall']['model']} ({findings['recall']['value']:.3f}), best F1 is {findings['f1']['model']} ({findings['f1']['value']:.3f}) and highest ROC-AUC is {findings['roc_auc']['model']} ({findings['roc_auc']['value']:.3f}).",
        f"The most stable model across CV folds (smallest ROC-AUC standard deviation) is {cons} ({ms[cons]['cv']['roc_auc']['std']:.4f}).",
        f"Test prevalence of progression is {prev:.1%}; a model predicting 'no progression' for everyone would reach {1 - prev:.1%} accuracy, so accuracy alone is not used to pick a model.",
        f"{sel} on the test set: {cm['tp']} true positives, {cm['fn']} missed progressors (false negatives), {cm['fp']} false alarms, {cm['tn']} true negatives.",
    ]
    return {"available": True, "selected": sel, "highest_by_metric": findings, "most_consistent_cv": cons,
            "cv_minus_test_roc_auc": gaps, "summary_lines": lines, "limitations": {n: LIMITATIONS[n] for n in ms},
            "tradeoffs": {"recall": "Share of true progressors flagged. Low recall = missed people who will progress (false negatives).",
                          "precision": "Share of flagged people who truly progress. Low precision = unnecessary follow-up (false positives).",
                          "why_recall_matters": "In progression screening research a missed progressor delays lifestyle or clinical attention, whereas a false alarm usually costs an extra test. Recall therefore deserves weight, but must be read together with precision and specificity."},
            "caveat": "Single held-out test split of a modest cohort: small differences between models are within sampling noise. External validation is required before any clinical use."}

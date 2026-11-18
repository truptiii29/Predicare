"""Exploratory Gaussian HMM on two-visit sequences. Reports real status; never invents metrics."""
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from config import HMM_FEATURES, RANDOM_STATE, FEATURE_LABELS
from data_processing import add_derived


def run(raw, df):
    result = {"status": "Not fitted", "reason": None, "note":
              "With only two visits per patient the HMM is exploratory; hidden states are statistical patterns, not disease stages."}
    try:
        from hmmlearn.hmm import GaussianHMM
    except ImportError:
        result["status"] = "Not fitted: hmmlearn unavailable"
        return result
    try:
        seq = add_derived(raw[raw["patientid"].isin(set(df["patientid"])) & raw["timed"].isin([1, 2])])
        seq = seq.sort_values(["patientid", "timed"])
        arrs = []
        for pid, g in seq.groupby("patientid"):
            g = g.drop_duplicates("timed").sort_values("timed")
            if set(g["timed"]) == {1, 2}:
                arrs.append(g[HMM_FEATURES].to_numpy(float))
        if len(arrs) < 20:
            result["reason"] = "Fewer than 20 complete two-visit sequences."
            return result
        M = np.vstack(arrs)
        lengths = [2] * len(arrs)
        M = StandardScaler().fit_transform(SimpleImputer(strategy="median").fit_transform(M))
        raw_means = np.vstack(arrs)
        m = GaussianHMM(n_components=3, covariance_type="diag", n_iter=200, random_state=RANDOM_STATE, min_covar=1e-3)
        m.fit(M, lengths)
        states = m.predict(M, lengths)
        medians = np.nanmedian(raw_means, axis=0)
        filled = np.where(np.isnan(raw_means), medians, raw_means)
        state_means = [filled[states == s].mean(0).round(3).tolist() if (states == s).any() else None for s in range(3)]
        visit = np.tile([1, 2], len(arrs))
        visit_state = [[int(((states == s) & (visit == v)).sum()) for s in range(3)] for v in (1, 2)]
        # empirical state change between visit 1 and visit 2
        pair = states.reshape(-1, 2)
        empirical = np.zeros((3, 3))
        for a, b in pair:
            empirical[a, b] += 1
        result.update({
            "status": "Fitted (exploratory)", "n_states": 3, "n_sequences": len(arrs), "n_observations": int(len(M)),
            "converged": bool(m.monitor_.converged), "iterations": int(m.monitor_.iter),
            "loglik_total": float(m.score(M, lengths)), "loglik_per_observation": float(m.score(M, lengths) / len(M)),
            "transition_matrix": m.transmat_.round(4).tolist(), "start_probabilities": m.startprob_.round(4).tolist(),
            "state_counts": [int((states == s).sum()) for s in range(3)],
            "state_by_visit": {"visit1": visit_state[0], "visit2": visit_state[1]},
            "empirical_transition_counts": empirical.astype(int).tolist(),
            "state_feature_means": {"features": [FEATURE_LABELS.get(c, c) for c in HMM_FEATURES], "values": state_means},
            "limitations": ["Only two observations per patient: transition estimates rest on one step per patient.",
                            "Visit gaps differ by cohort (4-8 years) but the model treats each step identically.",
                            "Single random start, no model-order selection: results depend on initialisation.",
                            "State labels are arbitrary and not matched to clinical categories."],
        })
        if not result["converged"]:
            result["status"] = "Fitted (exploratory, EM did not converge)"
    except Exception as e:
        result["status"] = f"Not fitted: {type(e).__name__}"
        result["reason"] = str(e)
    return result

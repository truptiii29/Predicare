"""K-Means and Gaussian Mixture Model on baseline features (notebook settings)."""
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.mixture import GaussianMixture
from sklearn.decomposition import PCA
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score, adjusted_rand_score
from config import FEATURE_COLS, FEATURE_LABELS, TARGET, RANDOM_STATE


def sil(X, labels):
    return silhouette_score(X, labels, sample_size=min(3000, len(X)), random_state=RANDOM_STATE)


def run(df):
    X = Pipeline([("i", SimpleImputer(strategy="median")), ("s", StandardScaler())]).fit_transform(df[FEATURE_COLS])
    rows, km_models, gm_models = [], {}, {}
    for k in range(2, 7):
        km = KMeans(n_clusters=k, n_init=20, random_state=RANDOM_STATE)
        kl = km.fit_predict(X)
        gm = GaussianMixture(n_components=k, covariance_type="diag", n_init=3, max_iter=300,
                             random_state=RANDOM_STATE, reg_covar=1e-4)
        gl = gm.fit_predict(X)
        km_models[k], gm_models[k] = (km, kl), (gm, gl)
        rows.append({"model": "K-Means", "k": k, "inertia": km.inertia_, "silhouette": sil(X, kl),
                     "davies_bouldin": davies_bouldin_score(X, kl), "calinski_harabasz": calinski_harabasz_score(X, kl),
                     "aic": None, "bic": None})
        rows.append({"model": "GMM", "k": k, "inertia": None, "silhouette": sil(X, gl),
                     "davies_bouldin": davies_bouldin_score(X, gl), "calinski_harabasz": calinski_harabasz_score(X, gl),
                     "aic": gm.aic(X), "bic": gm.bic(X)})
    km_rows = [r for r in rows if r["model"] == "K-Means"]
    gm_rows = [r for r in rows if r["model"] == "GMM"]
    k_km = max(km_rows, key=lambda r: r["silhouette"])["k"]      # notebook: highest silhouette
    k_gm = min(gm_rows, key=lambda r: r["bic"])["k"]             # notebook: lowest BIC
    km, kl = km_models[k_km]
    gm, gl = gm_models[k_gm]
    summary = {m: next(r for r in rows if r["model"] == m and r["k"] == k) for m, k in [("K-Means", k_km), ("GMM", k_gm)]}

    pca = PCA(n_components=2, random_state=RANDOM_STATE)
    P = pca.fit_transform(X)
    rng = np.random.RandomState(RANDOM_STATE)
    idx = np.sort(rng.choice(len(X), size=min(1500, len(X)), replace=False))
    probs = gm.predict_proba(X)
    maxp = probs.max(1)

    def profiles(labels):
        d = df[FEATURE_COLS + [TARGET]].copy()
        d["c"] = labels
        g = d.groupby("c")
        means = g[FEATURE_COLS].mean()
        z = (means - df[FEATURE_COLS].mean()) / df[FEATURE_COLS].std()
        return {"clusters": [int(c) for c in means.index], "features": [FEATURE_LABELS[c] for c in FEATURE_COLS],
                "means": means.values.round(3).tolist(), "zscores": z.values.round(3).tolist(),
                "sizes": g.size().tolist(), "progression_rate": g[TARGET].mean().round(4).tolist()}

    return {
        "note": "Clusters are exploratory statistical groups, not confirmed medical categories.",
        "candidates": rows, "selected": {"K-Means": {"k": k_km, "rule": "highest silhouette", **summary["K-Means"]},
                                          "GMM": {"k": k_gm, "rule": "lowest BIC", **summary["GMM"]}},
        "pca": {"explained_variance": pca.explained_variance_ratio_.tolist(),
                "points": [{"x": float(P[i, 0]), "y": float(P[i, 1]), "kmeans": int(kl[i]), "gmm": int(gl[i]),
                            "gmm_maxprob": float(maxp[i])} for i in idx], "n_total": int(len(X))},
        "kmeans_profiles": profiles(kl), "gmm_profiles": profiles(gl),
        "gmm_membership": {"mean_max_probability": float(maxp.mean()),
                           "share_above_0.9": float((maxp > 0.9).mean()),
                           "histogram": {"edges": np.linspace(0, 1, 11).tolist(),
                                         "counts": np.histogram(maxp, bins=np.linspace(0, 1, 11))[0].tolist()},
                           "mean_probability_by_component": probs.mean(0).round(4).tolist()},
        "agreement": {"adjusted_rand_index": float(adjusted_rand_score(kl, gl))},
        "variance_note": "Silhouette is estimated on a random subsample of up to 3000 patients (notebook setting).",
    }

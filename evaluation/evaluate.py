#!/usr/bin/env python3
"""
evaluate.py — Evaluasi Model Bayesian Weibull AFT
Move Again: Prediksi Pemulihan Pasca Stroke

Prasyarat:
  pip install pandas numpy matplotlib scikit-learn scipy

Jalankan setelah export_for_python.R:
  python evaluation/evaluate.py
"""

import sys
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.metrics import (
    roc_auc_score, roc_curve,
    average_precision_score, precision_recall_curve,
)

# ── Path ───────────────────────────────────────────────────────
EVAL_DIR   = Path(__file__).resolve().parent
DATA_DIR   = EVAL_DIR / "data"
OUTPUT_DIR = EVAL_DIR / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

BLUE  = "#2563eb"
RED   = "#ef4444"
GRAY  = "#94a3b8"
AMBER = "#f59e0b"
GREEN = "#22c55e"

plt.rcParams.update({
    "figure.dpi": 150, "font.size": 10,
    "axes.spines.top": False, "axes.spines.right": False,
})

# ══════════════════════════════════════════════════════════════
print("=" * 54)
print("  Move Again — Evaluasi Model (Python)")
print("  Bayesian Weibull AFT, Prediksi Pemulihan Stroke")
print("=" * 54, "\n")

# ── 1. Load data ───────────────────────────────────────────────
print("[1/4] Memuat data CSV...")
for f in ["training_data.csv", "post_samp.csv"]:
    if not (DATA_DIR / f).exists():
        sys.exit(
            f"ERROR: {f} tidak ditemukan.\n"
            "Jalankan dulu: Rscript evaluation/export_for_python.R"
        )

data = pd.read_csv(DATA_DIR / "training_data.csv")
post = pd.read_csv(DATA_DIR / "post_samp.csv")
n_patients = len(data)
n_draws    = len(post)

print(f"      {n_patients} pasien × {len(data.columns)} kolom")
print(f"      {n_draws} draws  × {len(post.columns)} parameter")
print(f"      Kolom: {', '.join(data.columns)}\n")

# Deteksi kolom outcome
time_col   = next(c for c in ["waktu_event","waktu_pulih","time"]    if c in data.columns)
status_col = next(c for c in ["event_pulih","status","event"]        if c in data.columns)
waktu  = data[time_col].to_numpy(dtype=float)
status = data[status_col].to_numpy(dtype=float)   # 1=event, 0=tersensor

# ── 2. Hitung prediksi in-sample ──────────────────────────────
print("[2/4] Menghitung prediksi dari posterior draws...")
print(f"      LP matrix: {n_draws} × {n_patients}  (~{n_draws*n_patients*8/1e6:.0f} MB RAM)")

# LP[d, i] = b_Intercept + Σ b_X * X_i + b_jenis_sendi_i
LP = (
    post["b_Intercept"].to_numpy()[:, None]
    + np.outer(post["b_usia_std"],    data["usia_std"])
    + np.outer(post["b_d_hemoragik"], data["d_hemoragik"])
    + np.outer(post["b_kons_std"],    data["kons_std"])
    + np.outer(post["b_onset_std"],   data["onset_std"])
    + np.outer(post["b_FPC1_std"],    data["FPC1_std"])
    + np.outer(post["b_FPC2_std"],    data["FPC2_std"])
)  # (n_draws, n_patients)

# Efek jenis sendi (categorical — reference level tidak punya kolom di post)
found_sendi = []
for jenis in data["jenis_sendi"].unique():
    col = f"b_jenis_sendi{jenis}"
    if col in post.columns:
        mask = (data["jenis_sendi"] == jenis).to_numpy()
        LP[:, mask] += post[col].to_numpy()[:, None]
        found_sendi.append(jenis)
print(f"      Jenis sendi dengan efek: {found_sendi}\n")

lambda_draws = np.exp(LP)                         # (n_draws, n_patients)
shape_vec    = post["shape"].to_numpy()           # (n_draws,)

# Median waktu pulih: t_med = lambda * log(2)^(1/shape)
t_med_draws = lambda_draws * (np.log(2) ** (1 / shape_vec))[:, None]
t_med_mean  = t_med_draws.mean(axis=0)
t_med_lower = np.percentile(t_med_draws, 2.5,  axis=0)
t_med_upper = np.percentile(t_med_draws, 97.5, axis=0)

# S(t) posterior mean per pasien
def S_at(t_val: float) -> np.ndarray:
    return np.exp(-(t_val / lambda_draws) ** shape_vec[:, None]).mean(axis=0)

S30  = S_at(30);  S60  = S_at(60)
S90  = S_at(90);  S120 = S_at(120)
prob90 = 1 - S90   # P(T ≤ 90 | xi)

# ── Helper: Kaplan-Meier ───────────────────────────────────────
def km_build(times: np.ndarray, events: np.ndarray) -> dict:
    """Build KM step function dict {t: S(t)}."""
    df = sorted(zip(times, events), key=lambda x: x[0])
    S, S_dict = 1.0, {0.0: 1.0}
    for t in sorted({t for t, _ in df}):
        n_risk  = sum(1 for ti, _ in df if ti >= t)
        n_event = sum(1 for ti, ei in df if ti == t and ei == 1)
        if n_risk > 0:
            S *= (1 - n_event / n_risk)
        S_dict[t] = S
    return S_dict

def km_at(S_dict: dict, t_query: float) -> float:
    valid = [t for t in S_dict if t <= t_query]
    return S_dict[max(valid)] if valid else 1.0

# ── IPCW Brier Score ──────────────────────────────────────────
def ipcw_brier(S_pred, t_obs, d_obs, t_eval):
    G_dict = km_build(t_obs, 1 - d_obs)   # censoring KM
    G_ti   = np.array([km_at(G_dict, t) for t in t_obs])
    G_tp   = km_at(G_dict, t_eval)
    w1 = ((t_obs <= t_eval) & (d_obs == 1)).astype(float) / np.maximum(G_ti, 1e-8)
    w2 = (t_obs >  t_eval).astype(float) / max(G_tp, 1e-8)
    return float(np.mean(w1 * S_pred**2 + w2 * (1 - S_pred)**2))

# ── C-index (Harrell) ─────────────────────────────────────────
def concordance_index(t_obs, d_obs, risk_score):
    """Higher risk_score = higher risk = shorter predicted survival."""
    t_obs = np.asarray(t_obs, float)
    d_obs = np.asarray(d_obs, float)
    risk_score = np.asarray(risk_score, float)
    concordant = total = 0.0
    for i in np.where(d_obs == 1)[0]:
        mask = t_obs > t_obs[i]
        if not mask.any():
            continue
        r = risk_score[mask]
        concordant += (risk_score[i] > r).sum() + 0.5 * (risk_score[i] == r).sum()
        total += mask.sum()
    return concordant / total if total > 0 else float("nan")

# ══════════════════════════════════════════════════════════════
print("[3/4] Menghitung metrik evaluasi...\n")

# ────────────────────────────────────────────────────────────
# METRIK 1: Concordance Index
# ────────────────────────────────────────────────────────────
print("─" * 52)
print(" Metrik 1: Concordance Index (C-index / Harrell's C)")
print("─" * 52)

c_val  = concordance_index(waktu, status, 1 / t_med_mean)
interp = ("Sangat baik" if c_val >= 0.8 else "Baik" if c_val >= 0.7
          else "Cukup" if c_val >= 0.6 else "Lemah")
print(f"C-index      : {c_val:.4f}")
print(f"Interpretasi : {interp}  (0.5=acak, 1.0=sempurna)\n")

# ────────────────────────────────────────────────────────────
# METRIK 2: Brier Score (IPCW) & Coverage CrI
# ────────────────────────────────────────────────────────────
print("─" * 52)
print(" Metrik 2: Brier Score (IPCW) & Calibration")
print("─" * 52)

t_points = [30, 60, 90, 120]
S_map    = {30: S30, 60: S60, 90: S90, 120: S120}
km_marg  = km_build(waktu, status)

bs_model, bs_null = {}, {}
for tp in t_points:
    bs_model[tp] = ipcw_brier(S_map[tp], waktu, status, tp)
    S_null_val   = km_at(km_marg, tp)
    bs_null[tp]  = ipcw_brier(np.full(n_patients, S_null_val), waktu, status, tp)

ipa = {tp: 1 - bs_model[tp] / max(bs_null[tp], 1e-9) for tp in t_points}

print(f"{'Waktu':>8}  {'BS Model':>10}  {'BS Null':>10}  {'IPA (%)':>8}")
print("-" * 44)
for tp in t_points:
    print(f"t={tp:>4} hr  {bs_model[tp]:>10.4f}  {bs_null[tp]:>10.4f}  {ipa[tp]*100:>7.1f}%")
print("IPA > 0: model lebih baik dari null (KM marginal); > 10% = bermakna.\n")

coverage = float(np.mean((waktu >= t_med_lower) & (waktu <= t_med_upper)))
print(f"Coverage 95% Credible Interval: {coverage*100:.1f}%  (target: ~95%)\n")

# ────────────────────────────────────────────────────────────
# METRIK 3: Precision, Recall, F1, ROC, AUC
# ────────────────────────────────────────────────────────────
print("─" * 52)
print(" Metrik 3: Precision, Recall, F1, ROC, AUC")
print("─" * 52)

# Binary: pulih ≤ t_threshold. Auto-pilih threshold yang punya kedua kelas.
# Coba beberapa waktu; gunakan yang pertama dengan 10–90% positif.
S_map_clf = {30: S30, 60: S60, 90: S90, 120: S120}

t_threshold = None
for t_try in [90, 60, 30, 120,
              int(np.percentile(waktu[status == 1], 40)),
              int(np.percentile(waktu[status == 1], 60))]:
    keep_try  = ~((status == 0) & (waktu < t_try))
    y_try     = ((waktu[keep_try] <= t_try) & (status[keep_try] == 1)).astype(int)
    pct_pos   = y_try.mean()
    if len(np.unique(y_try)) == 2 and 0.05 < pct_pos < 0.95:
        t_threshold = t_try
        keep    = keep_try
        y_true  = y_try
        # Pilih S_at yang sesuai atau hitung ulang jika perlu
        if t_try in S_map_clf:
            y_score = (1 - S_map_clf[t_try])[keep]
        else:
            y_score = (1 - S_at(t_try))[keep]
        break

if t_threshold is None:
    print("PERINGATAN: Tidak bisa menemukan binary split yang balance.")
    print("Menggunakan median waktu pulih sebagai threshold.")
    t_threshold = int(np.median(waktu[status == 1]))
    keep    = np.ones(n_patients, dtype=bool)
    y_true  = ((waktu <= t_threshold) & (status == 1)).astype(int)
    y_score = (1 - S_at(t_threshold))
    if len(np.unique(y_true)) < 2:
        print("SKIP: tidak ada variasi dalam y_true — data mungkin semua event/semua tersensor.")
        t_threshold = None

n_used = int(keep.sum()) if t_threshold else 0
print(f"Time horizon        : t = {t_threshold} hari")
print(f"Pasien digunakan    : {n_used} / {n_patients}")
print(f"Positif (pulih ≤t)  : {int(y_true.sum()) if t_threshold else 'N/A'}")
print(f"Negatif             : {int((1-y_true).sum()) if t_threshold else 'N/A'}\n")

if t_threshold is None:
    print("Metrik klasifikasi dilewati (tidak ada variasi kelas).\n")
    auc_roc = auc_pr = accuracy = precision = recall = f1 = specificity = npv = float("nan")
    best_thr = best_tpr = best_fpr = float("nan")
    TP = TN = FP = FN = 0
    fpr = tpr = roc_thr = np.array([0.0, 1.0])
    prec_c = rec_c = np.array([1.0, 0.0])
else:
    auc_roc = roc_auc_score(y_true, y_score)
    fpr, tpr, roc_thr = roc_curve(y_true, y_score)

    # Optimal threshold: Youden's J = sensitivity + specificity - 1
    j_idx    = int(np.argmax(tpr - fpr))
    best_thr = float(roc_thr[j_idx])
    best_tpr = float(tpr[j_idx])
    best_fpr = float(fpr[j_idx])

    y_pred = (y_score >= best_thr).astype(int)
    TP = int(((y_pred == 1) & (y_true == 1)).sum())
    TN = int(((y_pred == 0) & (y_true == 0)).sum())
    FP = int(((y_pred == 1) & (y_true == 0)).sum())
    FN = int(((y_pred == 0) & (y_true == 1)).sum())

    precision   = TP / max(TP + FP, 1)
    recall      = TP / max(TP + FN, 1)
    f1          = 2 * precision * recall / max(precision + recall, 1e-9)
    accuracy    = (TP + TN) / len(y_true)
    specificity = TN / max(TN + FP, 1)
    npv         = TN / max(TN + FN, 1)

    auc_pr        = average_precision_score(y_true, y_score)
    prec_c, rec_c, _ = precision_recall_curve(y_true, y_score)

    print(f"AUC-ROC   : {auc_roc:.4f}")
    print(f"AUC-PR    : {auc_pr:.4f}")
    print(f"Threshold (Youden): {best_thr:.4f}\n")
    print("Confusion Matrix:")
    print(f"             Pred+   Pred-")
    print(f"  Aktual +    {TP:5d}   {FN:5d}   (TP, FN)")
    print(f"  Aktual -    {FP:5d}   {TN:5d}   (FP, TN)")
    print()
    print(f"{'Accuracy'  :12s}: {accuracy:.4f}")
    print(f"{'Precision' :12s}: {precision:.4f}  (PPV)")
    print(f"{'Recall'    :12s}: {recall:.4f}  (Sensitivity)")
    print(f"{'Specificity':12s}: {specificity:.4f}")
    print(f"{'NPV'       :12s}: {npv:.4f}")
    print(f"{'F1 Score'  :12s}: {f1:.4f}\n")

# Threshold sweep untuk tabel F1 (hanya jika ada dua kelas)
f1_df = pd.DataFrame(columns=["threshold","precision","recall","f1"])
best_f1 = pd.Series({"threshold": float("nan"), "f1": float("nan"),
                      "precision": float("nan"), "recall": float("nan")})
if t_threshold is not None:
    thresholds = np.linspace(0.01, 0.99, 99)
    rows = []
    for thr in thresholds:
        yp  = (y_score >= thr).astype(int)
        tp_ = int(((yp==1) & (y_true==1)).sum())
        fp_ = int(((yp==1) & (y_true==0)).sum())
        fn_ = int(((yp==0) & (y_true==1)).sum())
        p_  = tp_ / max(tp_+fp_, 1)
        r_  = tp_ / max(tp_+fn_, 1)
        f1_ = 2*p_*r_ / max(p_+r_, 1e-9)
        rows.append({"threshold": round(float(thr),2), "precision": p_, "recall": r_, "f1": f1_})
    f1_df = pd.DataFrame(rows)
    best_f1 = f1_df.loc[f1_df["f1"].idxmax()]
if t_threshold is not None:
    print(f"Threshold max F1: {best_f1.threshold:.2f}  "
          f"(F1={best_f1.f1:.4f}, P={best_f1.precision:.4f}, R={best_f1.recall:.4f})\n")

# ────────────────────────────────────────────────────────────
# METRIK 4: Posterior Predictive Check (PPC)
# ────────────────────────────────────────────────────────────
print("─" * 52)
print(" Metrik 4: Posterior Predictive Check (PPC)")
print("─" * 52)

print("Simulasi T_rep dari posterior Weibull (100 draw)...")
n_sim = 100
rng   = np.random.default_rng(42)
di    = rng.choice(n_draws, n_sim, replace=False)
T_rep = np.zeros((n_sim, n_patients))
for k, d in enumerate(di):
    U         = rng.uniform(size=n_patients)
    T_rep[k]  = lambda_draws[d] * (-np.log(np.maximum(U, 1e-10))) ** (1 / shape_vec[d])

T_rep_med = np.median(T_rep, axis=1)
T_rep_sd  = T_rep.std(axis=1)
obs_med   = float(np.median(waktu))
obs_sd    = float(waktu.std())
pval_med  = float((T_rep_med > obs_med).mean())
pval_sd   = float((T_rep_sd  > obs_sd ).mean())

print(f"Median aktual : {obs_med:.1f} hari")
print(f"Median y_rep  : {np.median(T_rep_med):.1f}  "
      f"[{np.percentile(T_rep_med,2.5):.1f}, {np.percentile(T_rep_med,97.5):.1f}]")
print(f"SD aktual     : {obs_sd:.1f} hari")
print(f"SD y_rep      : {np.median(T_rep_sd):.1f}  "
      f"[{np.percentile(T_rep_sd,2.5):.1f}, {np.percentile(T_rep_sd,97.5):.1f}]")
print(f"Bayesian p-value (median) : {pval_med:.3f}  (ideal ~0.50)")
print(f"Bayesian p-value (SD)     : {pval_sd:.3f}  (ideal ~0.50)\n")

# ══════════════════════════════════════════════════════════════
print("[4/4] Membuat plot...")
fig = plt.figure(figsize=(17, 11))
fig.suptitle("Evaluasi Model Bayesian Weibull AFT — Move Again",
             fontsize=13, fontweight="bold", y=0.99)

# ── Plot 1: Predicted vs Actual ────────────────────────────
ax1 = fig.add_subplot(2, 3, 1)
colors = np.where(status == 1, BLUE, GRAY)
ax1.scatter(t_med_mean, waktu, c=colors, alpha=0.25, s=6, linewidths=0)
lim = max(t_med_mean.max(), waktu.max()) * 1.05
ax1.plot([0, lim], [0, lim], "--", color="gray", lw=1)
ax1.set_xlabel("Prediksi Median (hari)")
ax1.set_ylabel("Waktu Aktual (hari)")
ax1.set_title(f"Predicted vs Actual\nC-index = {c_val:.3f}", fontsize=10)
from matplotlib.lines import Line2D
ax1.legend(handles=[
    Line2D([0],[0], marker="o", color="w", markerfacecolor=BLUE, ms=7, label="Event"),
    Line2D([0],[0], marker="o", color="w", markerfacecolor=GRAY, ms=7, label="Tersensor"),
], fontsize=8, loc="upper left")

# ── Plot 2: Brier Score bar ─────────────────────────────────
ax2 = fig.add_subplot(2, 3, 2)
x = np.arange(len(t_points))
w = 0.36
ax2.bar(x - w/2, [bs_null[t]  for t in t_points], w, color=GRAY,  alpha=0.85, label="Null (KM)")
ax2.bar(x + w/2, [bs_model[t] for t in t_points], w, color=BLUE, alpha=0.85, label="Model")
ax2.set_xticks(x); ax2.set_xticklabels([f"t={t}" for t in t_points])
ax2.set_ylabel("Brier Score"); ax2.set_title("Brier Score (IPCW)", fontsize=10)
ax2.legend(fontsize=8)
for i, tp in enumerate(t_points):
    ax2.text(i + w/2, bs_model[tp] + 0.002, f"{ipa[tp]*100:.0f}%",
             ha="center", fontsize=7, color=BLUE)

# ── Plot 3: Calibration ─────────────────────────────────────
ax3 = fig.add_subplot(2, 3, 3)
cal_t  = t_threshold if t_threshold else 90
S_cal  = S_map_clf.get(cal_t) if cal_t in S_map_clf else S_at(cal_t)
prob_cal = 1 - S_cal
n_bins = 10
bins_k = pd.qcut(prob_cal, n_bins, labels=False, duplicates="drop")
cal_x, cal_y = [], []
for b in sorted(set(bins_k)):
    mb = (bins_k == b)
    if mb.sum() < 3:
        continue
    cal_x.append(float(prob_cal[mb].mean()))
    km_b = km_build(waktu[mb], status[mb])
    cal_y.append(1 - km_at(km_b, cal_t))
cal_x, cal_y = np.array(cal_x), np.array(cal_y)
if len(cal_x) > 0:
    order = np.argsort(cal_x)
    ax3.plot([0, 1], [0, 1], "--", color="gray", lw=1)
    ax3.plot(cal_x[order], cal_y[order], "-o", color=BLUE, lw=1.2, ms=6)
ax3.set_xlabel(f"Prediksi P(T≤{cal_t})"); ax3.set_ylabel("Observasi KM")
ax3.set_title(f"Calibration (t={cal_t} hari)", fontsize=10)
ax3.set_xlim(0, 1); ax3.set_ylim(0, 1)

# ── Plot 4: ROC ─────────────────────────────────────────────
ax4 = fig.add_subplot(2, 3, 4)
if t_threshold is not None:
    ax4.plot(fpr, tpr, color=BLUE, lw=1.5)
    ax4.plot([0, 1], [0, 1], "--", color="gray", lw=1)
    ax4.scatter([best_fpr], [best_tpr], color=RED, s=55, zorder=4)
    ax4.annotate(f"thr={best_thr:.2f}", xy=(best_fpr, best_tpr),
                 xytext=(best_fpr+0.09, best_tpr-0.09), fontsize=8, color=RED)
    ax4.set_title(f"ROC — AUC = {auc_roc:.3f}", fontsize=10)
else:
    ax4.text(0.5, 0.5, "Tidak cukup variasi kelas\nuntuk ROC",
             ha="center", va="center", transform=ax4.transAxes, color=GRAY)
    ax4.set_title("ROC (tidak tersedia)", fontsize=10)
ax4.set_xlabel("1 – Specificity"); ax4.set_ylabel("Sensitivity")

# ── Plot 5: Precision-Recall ────────────────────────────────
ax5 = fig.add_subplot(2, 3, 5)
if t_threshold is not None:
    ax5.plot(rec_c, prec_c, color=BLUE, lw=1.5)
    ax5.set_title(f"Precision-Recall — AUC = {auc_pr:.3f}", fontsize=10)
else:
    ax5.text(0.5, 0.5, "Tidak cukup variasi kelas\nuntuk PR curve",
             ha="center", va="center", transform=ax5.transAxes, color=GRAY)
    ax5.set_title("Precision-Recall (tidak tersedia)", fontsize=10)
ax5.set_xlabel("Recall"); ax5.set_ylabel("Precision")
ax5.set_xlim(0, 1); ax5.set_ylim(0, 1)
ax5.axhline(y_true.mean(), color=GRAY, lw=1, linestyle="--",
            label=f"Baseline ({y_true.mean():.2f})")
ax5.legend(fontsize=8)

# ── Plot 6: PPC ─────────────────────────────────────────────
ax6 = fig.add_subplot(2, 3, 6)
x_max = float(np.percentile(waktu, 98)) * 1.5
bins_ppc = np.linspace(0, x_max, 60)
for k in range(min(40, n_sim)):
    vals = T_rep[k][T_rep[k] <= x_max]
    ax6.hist(vals, bins=bins_ppc, density=True, alpha=0.05,
             color=GRAY, histtype="stepfilled", linewidth=0)
ax6.hist(waktu[waktu <= x_max], bins=bins_ppc, density=True,
         alpha=0.7, color=BLUE, histtype="step", lw=1.5, label="Data aktual")
ax6.set_xlabel("Waktu Pulih (hari)"); ax6.set_ylabel("Densitas")
ax6.set_title(f"PPC  (p-val med={pval_med:.2f}, sd={pval_sd:.2f})", fontsize=10)
ax6.legend(fontsize=8)

plt.tight_layout(rect=[0, 0, 1, 0.97])
out_plot = OUTPUT_DIR / "evaluation_summary.png"
plt.savefig(out_plot, bbox_inches="tight")
plt.close()
print(f"      Plot: {out_plot}")

# ── Simpan ringkasan CSV ───────────────────────────────────
summary = pd.DataFrame([{
    "c_index":          round(c_val, 4),
    "brier_t30":        round(bs_model[30],  4),
    "brier_t60":        round(bs_model[60],  4),
    "brier_t90":        round(bs_model[90],  4),
    "brier_t120":       round(bs_model[120], 4),
    "ipa_t90_pct":      round(ipa[90] * 100, 2),
    "coverage_cri_pct": round(coverage * 100, 2),
    "auc_roc":          round(auc_roc,  4),
    "auc_pr":           round(auc_pr,   4),
    "accuracy":         round(accuracy, 4),
    "precision":        round(precision, 4),
    "recall":           round(recall,   4),
    "f1":               round(f1,       4),
    "specificity":      round(specificity, 4),
    "threshold_youden": round(best_thr,  4),
    "pval_ppc_median":  round(pval_med,  3),
    "pval_ppc_sd":      round(pval_sd,   3),
}])
out_csv = OUTPUT_DIR / "metrics_summary.csv"
summary.to_csv(out_csv, index=False)
f1_df.to_csv(OUTPUT_DIR / "f1_threshold_sweep.csv", index=False)
pd.DataFrame({"waktu": waktu, "status": status,
              "t_med_mean": t_med_mean, "prob90": prob90}).to_csv(
    OUTPUT_DIR / "pred_summary.csv", index=False)

print(f"      CSV  : {out_csv}")

print("\n" + "=" * 54)
print("  Selesai!")
print(f"  Output: evaluation/output/")
print("=" * 54)

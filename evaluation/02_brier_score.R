# ================================================================
# 02_brier_score.R — Brier Score & Calibration Plot
# ================================================================
# Brier Score (IPCW) mengukur akurasi probabilistik model survival:
# seberapa dekat prediksi P(T > t) dengan kejadian nyata.
#
# BS = 0   → sempurna
# BS = 0.25 → model acak (null model)
# BS < 0.10 → sangat baik
#
# IPCW (Inverse Probability of Censoring Weighting) mengoreksi
# bias yang disebabkan oleh data tersensor.
# ================================================================

library(survival)
library(ggplot2)
library(dplyr)

cat("─────────────────────────────────────────────────\n")
cat(" Metrik 2: Brier Score (IPCW) & Calibration\n")
cat("─────────────────────────────────────────────────\n")

# ── Fungsi IPCW Brier Score ────────────────────────────────────
# S_pred : vektor prediksi S(t|xi) untuk semua pasien
# t_obs  : vektor waktu observasi
# d_obs  : vektor event (1=pulih, 0=sensor)
# t_eval : titik waktu yang dievaluasi
ipcw_brier <- function(S_pred, t_obs, d_obs, t_eval) {
  n <- length(t_obs)

  # KM estimator distribusi censoring (event indicator dibalik)
  km_cens <- survfit(Surv(t_obs, 1 - d_obs) ~ 1)
  km_t    <- km_cens$time
  km_surv <- km_cens$surv

  # G(t): probabilitas belum tersensor hingga waktu t
  G_at <- function(t) {
    idx <- max(which(km_t <= t), 0L)
    if (idx == 0L) return(1.0)
    km_surv[idx]
  }

  G_ti  <- sapply(t_obs,   G_at)   # G(Ti) — nilai KM di waktu tiap pasien
  G_tp  <- G_at(t_eval)            # G(t)  — nilai KM di titik evaluasi

  # IPCW Brier Score formula
  # Kontribusi tiap pasien:
  # (1) Ti ≤ t dan event: (0 - S_pred)^2 / G(Ti)
  # (2) Ti > t           : (1 - S_pred)^2 / G(t)
  w1 <- as.numeric(t_obs <= t_eval & d_obs == 1) / pmax(G_ti, 1e-6)
  w2 <- as.numeric(t_obs >  t_eval)              / pmax(G_tp, 1e-6)

  bs <- mean(w1 * (0 - S_pred)^2 + w2 * (1 - S_pred)^2)
  bs
}

# ── Hitung BS di 4 titik waktu ─────────────────────────────────
t_points <- c(30, 60, 90, 120)
S_preds  <- list(
  `30`  = S30_mean,
  `60`  = S60_mean,
  `90`  = S90_mean,
  `120` = S120_mean
)

bs_results <- sapply(t_points, function(tp) {
  ipcw_brier(S_preds[[as.character(tp)]], waktu, status, tp)
})
names(bs_results) <- paste0("t=", t_points)

# Null model: S(t) = KM marginal (tidak menggunakan covariat)
km_marginal <- survfit(Surv(waktu, status) ~ 1)
km_S_at <- function(t_val) {
  idx <- max(which(km_marginal$time <= t_val), 0L)
  if (idx == 0L) return(1.0)
  km_marginal$surv[idx]
}
bs_null <- sapply(t_points, function(tp) {
  S_null <- rep(km_S_at(tp), n_pasien)
  ipcw_brier(S_null, waktu, status, tp)
})
names(bs_null) <- paste0("t=", t_points)

# IPA: Integrated Predictive Accuracy = 1 - BS_model/BS_null
ipa <- 1 - bs_results / bs_null

cat(sprintf("%-10s %10s %12s %8s\n", "Waktu", "BS Model", "BS Null", "IPA (%)"))
cat(strrep("-", 44), "\n")
for (i in seq_along(t_points)) {
  cat(sprintf("t = %3d hr %10.4f %12.4f %7.1f%%\n",
              t_points[i], bs_results[i], bs_null[i], ipa[i] * 100))
}

cat("\nIPA: seberapa besar model mengalahkan null (KM marginal).\n")
cat("IPA > 0 = model lebih baik dari null; > 10% = bermakna.\n\n")

# ── Calibration Plot (decile) ──────────────────────────────────
# Bagi pasien ke 10 desil berdasarkan prediksi P(T ≤ 90)
cat("Membuat calibration plot (decile, t = 90 hari)...\n")

df_cal <- data.frame(
  prob90_pred  = prob90_mean,
  waktu        = waktu,
  status       = status
)

df_cal$decile <- ntile(df_cal$prob90_pred, 10)

# Untuk tiap desil: mean prediksi vs KM-observed P(T ≤ 90)
cal_decile <- df_cal %>%
  group_by(decile) %>%
  summarise(
    mean_pred  = mean(prob90_pred),
    n          = n(),
    .groups = "drop"
  )

# KM observed probability P(T ≤ 90) per desil
km_obs_90 <- sapply(1:10, function(d) {
  sub <- df_cal[df_cal$decile == d, ]
  km  <- survfit(Surv(sub$waktu, sub$status) ~ 1)
  # P(T ≤ 90) = 1 - S(90)
  idx <- which(km$time <= 90)
  if (length(idx) == 0) return(0)
  1 - km$surv[max(idx)]
})
cal_decile$obs_prob90 <- km_obs_90

p_cal <- ggplot(cal_decile, aes(x = mean_pred, y = obs_prob90)) +
  geom_abline(intercept = 0, slope = 1, linetype = "dashed", color = "gray50") +
  geom_point(aes(size = n), color = "#2563eb", alpha = 0.8) +
  geom_smooth(method = "loess", se = FALSE, color = "#ef4444", linewidth = 0.8) +
  scale_size_continuous(range = c(3, 8), guide = "none") +
  scale_x_continuous(labels = scales::percent_format(accuracy = 1), limits = c(0, 1)) +
  scale_y_continuous(labels = scales::percent_format(accuracy = 1), limits = c(0, 1)) +
  labs(
    title    = "Calibration Plot — P(Pulih ≤ 90 hari)",
    subtitle = "Desil prediksi vs probabilitas KM observasi. Titik ideal di garis putus-putus.",
    x        = "Prediksi Model (rata-rata per desil)",
    y        = "Observasi KM (per desil)"
  ) +
  theme_minimal(base_size = 12)

ggsave("evaluation/output/plot_calibration.png", p_cal,
       width = 6, height = 5, dpi = 150)
cat("Plot: evaluation/output/plot_calibration.png\n")

# ── Coverage 95% Credible Interval ────────────────────────────
cat("\nCoverage 95% Credible Interval waktu median:\n")
coverage <- mean(waktu >= t_med_lower & waktu <= t_med_upper, na.rm = TRUE)
cat(sprintf("  Coverage: %.1f%% (target: ~95%%)\n\n", coverage * 100))

# ── Simpan ─────────────────────────────────────────────────────
brier_result <- list(
  brier_score = bs_results,
  brier_null  = bs_null,
  ipa         = ipa,
  ci_coverage = coverage,
  cal_table   = cal_decile
)
saveRDS(brier_result, "evaluation/output/brier_score.rds")

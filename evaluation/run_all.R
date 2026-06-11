# ================================================================
# run_all.R — Evaluasi Lengkap Model Bayesian Weibull AFT
# Move Again: Prediksi Pemulihan Pasca Stroke
# ================================================================
# Jalankan dari root proyek:
#   setwd("d:/SEC-Stroke")
#   source("evaluation/run_all.R")
# ================================================================

setwd("d:/SEC-Stroke")

# --- Packages ---------------------------------------------------
required_pkgs <- c("brms", "survival", "fda", "ggplot2", "dplyr", "pROC")
for (pkg in required_pkgs) {
  if (!requireNamespace(pkg, quietly = TRUE)) install.packages(pkg)
  suppressPackageStartupMessages(library(pkg, character.only = TRUE))
}

dir.create("evaluation/output", showWarnings = FALSE, recursive = TRUE)

cat("==================================================\n")
cat("  Move Again — Evaluasi Model\n")
cat("  Bayesian Weibull AFT, Prediksi Pemulihan Stroke\n")
cat("==================================================\n\n")

# ── 1. Load model ──────────────────────────────────────────────
cat("[1/4] Memuat model brms...\n")
surv_fit  <- readRDS("output/survival_weibull_fit.rds")
post_samp <- as.data.frame(as_draws_df(surv_fit))
cat(sprintf("      %d posterior draws × %d parameter\n\n",
            nrow(post_samp), ncol(post_samp)))

# ── 2. Load data latih ─────────────────────────────────────────
cat("[2/4] Memuat data latih...\n")
load("output/simulasi_data.RData")           # matriks_rom, param_sendi, dll.
ref <- readRDS("output/fpca_ref.rds")

# brms menyimpan data training di $data
data_model <- surv_fit$data
cat(sprintf("      %d pasien, %d kolom: %s\n\n",
            nrow(data_model), ncol(data_model),
            paste(names(data_model), collapse = ", ")))

# ── Deteksi nama kolom outcome ─────────────────────────────────
time_col   <- intersect(c("waktu_event","waktu_pulih","t_pulih","time","survival_time"), names(data_model))[1]
status_col <- intersect(c("event_pulih","status","sensor","status_sensor","event"),    names(data_model))[1]

if (is.na(time_col) || is.na(status_col)) {
  cat("Kolom yang tersedia:", paste(names(data_model), collapse=", "), "\n")
  stop("Tidak menemukan kolom waktu/status. Sesuaikan nama di atas.")
}
cat(sprintf("      Outcome: '%s' (waktu), '%s' (event 1=pulih, 0=sensor)\n\n",
            time_col, status_col))

waktu  <- data_model[[time_col]]
status <- data_model[[status_col]]   # 1 = event (pulih), 0 = tersensor
n_pasien <- nrow(data_model)

# ── 3. Hitung prediksi in-sample dari posterior ────────────────
cat("[3/4] Menghitung prediksi in-sample (posterior_linpred)...\n")
cat("      Ini bisa memakan 1-3 menit...\n")

# lp_draws: n_draws × n_pasien, berisi log(lambda_i) per draw
lp_draws  <- posterior_linpred(surv_fit)   # menggunakan covariat training
shape_vec <- post_samp[["shape"]]
n_draws   <- nrow(lp_draws)

cat(sprintf("      LP matrix: %d draw × %d pasien\n\n", n_draws, n_pasien))

# ── Median waktu pulih per pasien ──────────────────────────────
# t_med = lambda * log(2)^(1/shape), lambda = exp(LP)
# [n_draws × n_pasien]
lambda_draws   <- exp(lp_draws)
t_med_scale    <- log(2)^(1 / shape_vec)       # n_draws vector
t_med_draws    <- sweep(lambda_draws, 1, t_med_scale, `*`)  # baris × skalar

t_med_mean  <- colMeans(t_med_draws)
t_med_lower <- apply(t_med_draws, 2, quantile, 0.025)
t_med_upper <- apply(t_med_draws, 2, quantile, 0.975)

# ── S(t=90) dan P(T ≤ 90) per pasien ──────────────────────────
S_at <- function(t_val) {
  # S(t_val | covariat_i, draw_d) = exp(-(t_val / lambda[d,i])^shape[d])
  # Kembalikan matrix n_draws × n_pasien
  S_mat <- matrix(NA_real_, n_draws, n_pasien)
  for (j in seq_len(n_pasien)) {
    S_mat[, j] <- exp(-(t_val / lambda_draws[, j])^shape_vec)
  }
  S_mat
}

# Hitung S(90) — gunakan loop eksplisit agar jelas
cat("[4/4] Menghitung S(t=30,60,90,120)...\n")
S30_draws  <- S_at(30);  S30_mean  <- colMeans(S30_draws)
S60_draws  <- S_at(60);  S60_mean  <- colMeans(S60_draws)
S90_draws  <- S_at(90);  S90_mean  <- colMeans(S90_draws)
S120_draws <- S_at(120); S120_mean <- colMeans(S120_draws)

prob90_mean <- 1 - S90_mean    # P(T ≤ 90 | covariat_i), posterior mean

# Simpan prediksi ringkasan untuk dipakai semua skrip
pred_summary <- data.frame(
  waktu_aktual = waktu,
  status       = status,
  t_med_mean   = t_med_mean,
  t_med_lower  = t_med_lower,
  t_med_upper  = t_med_upper,
  prob90_mean  = prob90_mean,
  S30_mean     = S30_mean,
  S60_mean     = S60_mean,
  S90_mean     = S90_mean,
  S120_mean    = S120_mean
)
saveRDS(pred_summary, "evaluation/output/pred_summary.rds")
cat("      pred_summary.rds tersimpan.\n\n")

# ── Jalankan skrip evaluasi ────────────────────────────────────
source("evaluation/01_c_index.R")
source("evaluation/02_brier_score.R")
source("evaluation/03_precision_recall.R")
source("evaluation/04_loo_ppc.R")

cat("\n==================================================\n")
cat("  Semua evaluasi selesai!\n")
cat("  Hasil: evaluation/output/\n")
cat("==================================================\n")

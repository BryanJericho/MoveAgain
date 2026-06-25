# =============================================================
# API_plumber.R — Backend API Prediksi Rehabilitasi Pasca Stroke
# Model: Bayesian Weibull AFT (brms, 10.000 iter × 4 chains)
# Kovariat: Usia, Jenis Stroke, Hari Onset, FPC1, FPC2, Jenis Sendi
# =============================================================
# Mode PRODUKSI : load output/post_samp.rds + output/fpca_ref.rds (cepat)
# Mode LOKAL    : load output/survival_weibull_fit.rds (butuh brms)
# =============================================================

library(plumber)
library(fda)

# --- Load model data ---------------------------------------------------
PROD_FILES <- file.exists("output/post_samp.rds") && file.exists("output/fpca_ref.rds")

if (PROD_FILES) {
  cat("Mode PRODUKSI: memuat file ringan...\n")
  post_samp <- readRDS("output/post_samp.rds")
  ref       <- readRDS("output/fpca_ref.rds")

  N_SESI        <- ref$N_SESI
  t_eval        <- ref$t_eval
  bspline_basis <- ref$bspline_basis
  fdPar_obj     <- ref$fdPar_obj
  mean_fd       <- ref$mean_fd
  harmonics     <- ref$harmonics
  fpc1_mean     <- ref$fpc1_mean;   fpc1_sd    <- ref$fpc1_sd
  fpc2_mean     <- ref$fpc2_mean;   fpc2_sd    <- ref$fpc2_sd
  levels_sendi  <- ref$levels_sendi
  usia_mean     <- ref$usia_mean;   usia_sd    <- ref$usia_sd
  onset_mean    <- ref$onset_mean;  onset_sd   <- ref$onset_sd

} else {
  cat("Mode LOKAL: memuat model brms penuh...\n")
  library(brms)
  library(tidyverse)

  load("output/simulasi_data.RData")
  surv_fit  <- readRDS("output/survival_weibull_fit.rds")
  post_samp <- as_draws_df(surv_fit)

  N_SESI        <- 90
  t_eval        <- 1:N_SESI
  bspline_basis <- create.bspline.basis(rangeval = c(1, N_SESI), nbasis = 12, norder = 4)
  fdPar_obj     <- fdPar(bspline_basis, Lfdobj = 2, lambda = 10^1.5)
  fd_smooth     <- smooth.basis(argvals = t_eval, y = t(matriks_rom), fdParobj = fdPar_obj)$fd
  fpca_res      <- pca.fd(fd_smooth, nharm = 2)

  mean_fd      <- fpca_res$meanfd
  harmonics    <- fpca_res$harmonics
  fpc1_mean    <- mean(fpca_res$scores[, 1]);  fpc1_sd  <- sd(fpca_res$scores[, 1])
  fpc2_mean    <- mean(fpca_res$scores[, 2]);  fpc2_sd  <- sd(fpca_res$scores[, 2])
  levels_sendi <- sort(unique(as.character(param_sendi$jenis_sendi)))
  usia_mean    <- mean(data_survival$usia);    usia_sd  <- sd(data_survival$usia)
  onset_mean   <- mean(data_survival$hari_onset); onset_sd <- sd(data_survival$hari_onset)
}

cat("API siap menerima request!\n")

#* @apiTitle Prediksi Pemulihan Pasca Stroke
#* @apiDescription Bayesian Weibull AFT — prediksi jumlah sesi untuk pulih.

#* @get /health
function() list(
  status  = "ok",
  model   = "Bayesian Weibull AFT",
  N_SESI  = N_SESI,
  sendi   = levels_sendi
)

#* @post /predict
function(req, res) {
  body <- req$body

  req_fields <- c("usia", "jenis_stroke", "hari_onset", "jenis_sendi", "rom_history")
  missing <- req_fields[!req_fields %in% names(body)]
  if (length(missing) > 0) {
    res$status <- 400
    return(list(status = "error", pesan = paste("Field yang kurang:", paste(missing, collapse = ", "))))
  }

  snd <- as.character(body$jenis_sendi)
  if (!snd %in% levels_sendi) {
    res$status <- 400
    return(list(status = "error",
      pesan = paste("Jenis sendi tidak valid. Pilihan:", paste(levels_sendi, collapse = ", "))))
  }

  rom_hist      <- as.numeric(body$rom_history)
  sesi_saat_ini <- length(rom_hist)
  if (sesi_saat_ini == 0 || sesi_saat_ini > N_SESI) {
    res$status <- 400
    return(list(status = "error",
      pesan = sprintf("Panjang rom_history harus 1-%d.", N_SESI)))
  }

  # LOCF — isi sisa sesi dengan nilai terakhir
  y_new <- rep(NA_real_, N_SESI)
  y_new[1:sesi_saat_ini] <- rom_hist
  if (sesi_saat_ini < N_SESI) y_new[(sesi_saat_ini + 1):N_SESI] <- rom_hist[sesi_saat_ini]

  # Fungsionalisasi + proyeksi FPCA
  fd_new          <- smooth.basis(argvals = t_eval, y = matrix(y_new, ncol = 1), fdParobj = fdPar_obj)$fd
  fd_new_cen      <- fd_new
  fd_new_cen$coefs <- fd_new$coefs - mean_fd$coefs

  f1_std <- as.numeric((inprod(fd_new_cen, harmonics[1]) - fpc1_mean) / fpc1_sd)
  f2_std <- as.numeric((inprod(fd_new_cen, harmonics[2]) - fpc2_mean) / fpc2_sd)

  # Standarisasi kovariat klinis
  usia_std    <- (as.numeric(body$usia)        - usia_mean)  / usia_sd
  onset_std   <- (as.numeric(body$hari_onset)  - onset_mean) / onset_sd
  d_hemoragik <- ifelse(body$jenis_stroke == "Hemoragik", 1, 0)

  # Linear predictor dari posterior draws
  LP <- post_samp[["b_Intercept"]]   +
        post_samp[["b_usia_std"]]    * usia_std    +
        post_samp[["b_d_hemoragik"]] * d_hemoragik +
        post_samp[["b_onset_std"]]   * onset_std   +
        post_samp[["b_FPC1_std"]]    * f1_std      +
        post_samp[["b_FPC2_std"]]    * f2_std

  col_sendi <- paste0("b_jenis_sendi", snd)
  if (col_sendi %in% colnames(post_samp)) LP <- LP + post_samp[[col_sendi]]

  lambda    <- exp(LP)
  shape_vec <- post_samp[["shape"]]

  t0          <- sesi_saat_ini
  S_t0        <- exp(-(t0 / lambda)^shape_vec)
  term        <- (t0 / lambda)^shape_vec - log(0.5)
  t_med_samps <- lambda * term^(1 / shape_vec)

  S_target   <- exp(-(N_SESI / lambda)^shape_vec)
  prob_samps <- pmax(0, 1 - S_target / S_t0)

  med_sesi  <- round(median(t_med_samps))
  ci_low    <- round(quantile(t_med_samps, 0.025))
  ci_high   <- round(quantile(t_med_samps, 0.975))
  sisa_sesi <- max(0L, med_sesi - sesi_saat_ini)

  return(list(
    status     = "success",
    input_sesi = sesi_saat_ini,
    prediksi   = list(
      median_sesi_pulih        = med_sesi,
      ci_95_lower              = ci_low,
      ci_95_upper              = ci_high,
      sisa_sesi_dibutuhkan     = sisa_sesi,
      probabilitas_pulih_persen = round(mean(prob_samps) * 100)
    ),
    pesan = sprintf(
      "Diprediksi pulih pada sesi ke-%d (CI 95%%: %d–%d). Sisa sesi: %d.",
      med_sesi, ci_low, ci_high, sisa_sesi
    )
  ))
}

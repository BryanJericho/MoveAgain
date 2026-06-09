# =============================================================
# API_plumber.R — Backend API Prediksi Pemulihan Pasca Stroke
# =============================================================
# Mode PRODUKSI : load output/post_samp.rds + output/fpca_ref.rds
#                 (tidak butuh brms/Stan)
# Mode LOKAL    : load output/survival_weibull_fit.rds secara penuh
#                 (fallback jika file ringan belum dibuat)
# =============================================================

library(plumber)
library(fda)

#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 200
    return(list())
  }
  plumber::forward()
}

# --- Load model data -----------------------------------------------
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
  fpc1_mean     <- ref$fpc1_mean;  fpc1_sd <- ref$fpc1_sd
  fpc2_mean     <- ref$fpc2_mean;  fpc2_sd <- ref$fpc2_sd
  levels_sendi  <- ref$levels_sendi

} else {
  cat("Mode LOKAL: memuat model brms penuh...\n")
  library(brms)
  library(tidyverse)

  load("output/simulasi_data.RData")
  surv_fit  <- readRDS("output/survival_weibull_fit.rds")
  post_samp <- as.data.frame(as_draws_df(surv_fit))

  N_SESI        <- 30
  t_eval        <- 1:N_SESI
  bspline_basis <- create.bspline.basis(rangeval = c(1, N_SESI), nbasis = 12, norder = 4)
  fdPar_obj     <- fdPar(bspline_basis, Lfdobj = 2, lambda = 10^1.5)
  fd_smooth     <- smooth.basis(argvals = t_eval, y = t(matriks_rom), fdParobj = fdPar_obj)$fd
  fpca_res      <- pca.fd(fd_smooth, nharm = 2)

  mean_fd      <- fpca_res$meanfd
  harmonics    <- fpca_res$harmonics
  fpc1_mean    <- mean(fpca_res$scores[, 1]);  fpc1_sd <- sd(fpca_res$scores[, 1])
  fpc2_mean    <- mean(fpca_res$scores[, 2]);  fpc2_sd <- sd(fpca_res$scores[, 2])
  levels_sendi <- sort(unique(param_sendi$jenis_sendi))
}

cat("API siap menerima request!\n")

#* @apiTitle Prediksi Pemulihan Pasca Stroke
#* @apiDescription Bayesian Weibull AFT — prediksi waktu pulih berdasarkan histori ROM.

#* @post /predict
function(req, res) {
  body <- req$body

  req_fields <- c("usia", "jenis_stroke", "hari_onset", "skor_konsentrasi", "jenis_sendi", "rom_history")
  if (!all(req_fields %in% names(body))) {
    res$status <- 400
    return(list(status = "error", pesan = "Missing required fields."))
  }

  rom_hist      <- as.numeric(body$rom_history)
  sesi_saat_ini <- length(rom_hist)
  if (sesi_saat_ini == 0 || sesi_saat_ini > N_SESI) {
    res$status <- 400
    return(list(status = "error", pesan = "Panjang rom_history harus di antara 1 dan 30."))
  }

  # LOCF untuk mengisi sisa sesi
  y_new <- rep(NA, N_SESI)
  y_new[1:sesi_saat_ini] <- rom_hist
  if (sesi_saat_ini < N_SESI) y_new[(sesi_saat_ini + 1):N_SESI] <- rom_hist[sesi_saat_ini]

  # Fungsionalisasi + proyeksi FPCA
  fd_new       <- smooth.basis(argvals = t_eval, y = matrix(y_new, ncol = 1), fdParobj = fdPar_obj)$fd
  fd_new_cen   <- fd_new
  fd_new_cen$coefs <- fd_new$coefs - mean_fd$coefs

  f1_std <- as.numeric((inprod(fd_new_cen, harmonics[1]) - fpc1_mean) / fpc1_sd)
  f2_std <- as.numeric((inprod(fd_new_cen, harmonics[2]) - fpc2_mean) / fpc2_sd)

  # Kovariat klinis (standarisasi sama dengan saat pelatihan)
  usia_std <- (as.numeric(body$usia)              - 58)  / 11
  kons_std <- (as.numeric(body$skor_konsentrasi)  - 0.78) / 0.1
  onset_std <- (as.numeric(body$hari_onset)       - 28)  / 14
  d_hemoragik <- ifelse(body$jenis_stroke == "Hemoragik", 1, 0)

  # Linear predictor dari posterior draws
  LP <- post_samp[["b_Intercept"]]    +
        post_samp[["b_usia_std"]]     * usia_std    +
        post_samp[["b_d_hemoragik"]]  * d_hemoragik +
        post_samp[["b_kons_std"]]     * kons_std    +
        post_samp[["b_onset_std"]]    * onset_std   +
        post_samp[["b_FPC1_std"]]     * f1_std      +
        post_samp[["b_FPC2_std"]]     * f2_std

  col_sendi <- paste0("b_jenis_sendi", body$jenis_sendi)
  if (col_sendi %in% colnames(post_samp)) LP <- LP + post_samp[[col_sendi]]

  lambda    <- exp(LP)
  shape_vec <- post_samp[["shape"]]

  t0     <- sesi_saat_ini * 1.4
  S_t0   <- exp(-(t0 / lambda)^shape_vec)
  term   <- (t0 / lambda)^shape_vec - log(0.5)
  t_med  <- lambda * term^(1 / shape_vec)

  S_90   <- exp(-(90 / lambda)^shape_vec)
  prob90 <- pmax(0, 1 - S_90 / S_t0)

  return(list(
    status    = "success",
    input_sesi = sesi_saat_ini,
    prediksi  = list(
      median_hari              = round(median(t_med)),
      ci_95_lower              = round(quantile(t_med, 0.025)),
      ci_95_upper              = round(quantile(t_med, 0.975)),
      probabilitas_90_hari_persen = round(mean(prob90) * 100)
    ),
    pesan = sprintf("Prediksi pulih pada median hari ke-%d", round(median(t_med)))
  ))
}

#* @get /health
function() list(status = "ok")

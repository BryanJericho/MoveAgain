# =============================================================
# 05_API_plumber.R — Backend API untuk Prediksi Dinamis (Plumber)
# =============================================================

library(plumber)
library(fda)
library(brms)
library(tidyverse)

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

# --- GLOBAL SETUP: Dijalankan sekali saat server API dinyalakan ---
cat("Memuat dependensi dan model Bayesian dari output/ ...\n")
load("output/simulasi_data.RData")
surv_fit <- readRDS("output/survival_weibull_fit.rds")
post_samp <- as_draws_df(surv_fit)

N_SESI <- 30
t_eval <- 1:N_SESI
bspline_basis <- create.bspline.basis(rangeval = c(1, N_SESI), nbasis = 12, norder = 4)
fdPar_obj     <- fdPar(bspline_basis, Lfdobj = 2, lambda = 10^1.5)

# Bikin ulang objek FDA baseline untuk mendapatkan referensi PCA
cat("Menyiapkan ruang proyektor Functional Data Analysis (FDA)...\n")
fd_smooth <- smooth.basis(argvals = t_eval, y = t(matriks_rom), fdParobj = fdPar_obj)$fd
fpca_res  <- pca.fd(fd_smooth, nharm = 2)

mean_fd <- fpca_res$meanfd
harmonics <- fpca_res$harmonics
fpc1_mean <- mean(fpca_res$scores[,1]); fpc1_sd <- sd(fpca_res$scores[,1])
fpc2_mean <- mean(fpca_res$scores[,2]); fpc2_sd <- sd(fpca_res$scores[,2])

levels_sendi <- sort(unique(param_sendi$jenis_sendi))
cat("API Siap Menerima Request!\n")

#* @apiTitle Sistem Prediksi Dinamis Rehabilitasi Pasca Stroke
#* @apiDescription API untuk mengintegrasikan model Bayesian Survival Multi-sendi dengan frontend pendeteksi gerakan sendi.

#* Endpoint untuk melakukan prediksi
#* Menerima data histori ROM seorang pasien dan mengembalikan prediksi waktu pulih.
#* @param req JSON Body
#* @post /predict
function(req, res) {
  # Parse JSON
  body <- req$body
  
  # Validasi kelengkapan input
  req_fields <- c("usia", "jenis_stroke", "hari_onset", "skor_konsentrasi", "jenis_sendi", "rom_history")
  if (!all(req_fields %in% names(body))) {
    res$status <- 400
    return(list(status = "error", pesan = "Missing required fields."))
  }
  
  rom_hist <- as.numeric(body$rom_history)
  sesi_saat_ini <- length(rom_hist)
  if (sesi_saat_ini == 0 || sesi_saat_ini > N_SESI) {
    res$status <- 400
    return(list(status = "error", pesan = "Panjang rom_history harus di antara 1 dan 30."))
  }
  
  # LOCF (Last Observation Carried Forward) untuk mengisi sisa sesi
  y_new <- rep(NA, N_SESI)
  y_new[1:sesi_saat_ini] <- rom_hist
  if (sesi_saat_ini < N_SESI) {
    y_new[(sesi_saat_ini+1):N_SESI] <- rom_hist[sesi_saat_ini]
  }
  
  # Fungsionalisasi curve ROM baru
  fd_new <- smooth.basis(argvals = t_eval, y = matrix(y_new, ncol=1), fdParobj = fdPar_obj)$fd
  
  # Centering dan proyeksi PCA
  fd_new_cen <- fd_new
  fd_new_cen$coefs <- fd_new$coefs - mean_fd$coefs
  
  f1 <- inprod(fd_new_cen, harmonics[1])
  f2 <- inprod(fd_new_cen, harmonics[2])
  
  f1_std <- as.numeric((f1 - fpc1_mean) / fpc1_sd)
  f2_std <- as.numeric((f2 - fpc2_mean) / fpc2_sd)
  
  # Siapkan kovariat klinis
  usia_std <- (as.numeric(body$usia) - 58) / 11
  kons_std <- (as.numeric(body$skor_konsentrasi) - 0.78) / 0.1
  onset_std <- (as.numeric(body$hari_onset) - 28) / 14
  d_hemoragik <- ifelse(body$jenis_stroke == "Hemoragik", 1, 0)
  snd <- body$jenis_sendi
  
  # Ekstraksi linear predictor dari posterior model Bayesian
  S <- nrow(post_samp)
  
  LP <- post_samp[["b_Intercept"]] +
        post_samp[["b_usia_std"]] * usia_std +
        post_samp[["b_d_hemoragik"]] * d_hemoragik +
        post_samp[["b_kons_std"]] * kons_std +
        post_samp[["b_onset_std"]] * onset_std +
        post_samp[["b_FPC1_std"]] * f1_std +
        post_samp[["b_FPC2_std"]] * f2_std
        
  # Tambahkan efek spesifik sendi jika ada
  col_name <- paste0("b_jenis_sendi", snd)
  if (col_name %in% colnames(post_samp)) {
    LP <- LP + post_samp[[col_name]]
  }
  
  lambda <- exp(LP)
  shape_vec <- post_samp[["shape"]]
  
  # Prediksi waktu pulih
  t0 <- sesi_saat_ini * 1.4 # waktu saat ini dalam hari (asumsi 1 sesi = 1.4 hari)
  S_t0 <- exp(-(t0/lambda)^shape_vec)
  
  term <- (t0/lambda)^shape_vec - log(0.5)
  t_med_samps <- lambda * (term)^(1/shape_vec)
  
  t_target <- 90 # Target hari untuk probabilitas
  S_target <- exp(-(t_target/lambda)^shape_vec)
  
  prob_90d_samps <- 1 - (S_target / S_t0)
  prob_90d_samps[prob_90d_samps < 0] <- 0
  
  med_hari <- round(median(t_med_samps))
  ci_low <- round(quantile(t_med_samps, 0.025))
  ci_high <- round(quantile(t_med_samps, 0.975))
  mean_prob <- round(mean(prob_90d_samps) * 100)
  
  # Return response format JSON
  return(list(
    status = "success",
    input_sesi = sesi_saat_ini,
    prediksi = list(
      median_hari = med_hari,
      ci_95_lower = ci_low,
      ci_95_upper = ci_high,
      probabilitas_90_hari_persen = mean_prob
    ),
    pesan = sprintf("Pasien diprediksi akan mencapai target fungsional pada median hari ke-%d (Peluang pulih dalam 90 hari: %d%%)", med_hari, mean_prob)
  ))
}

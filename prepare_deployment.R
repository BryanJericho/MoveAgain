# =============================================================
# prepare_deployment.R
# Jalankan sekali secara lokal sebelum deploy.
# Mengekstrak posterior draws dan referensi FPCA dari model brms
# menjadi file ringan — sehingga Docker tidak perlu brms/Stan.
# =============================================================
# Jalankan: Rscript prepare_deployment.R
# =============================================================

library(brms)
library(fda)

setwd("d:/SEC-Stroke")

cat("=== Menyiapkan file deployment ===\n\n")

# --- 1. Ekstrak posterior draws ---
cat("[1/2] Memuat model brms dan mengekstrak posterior draws...\n")
surv_fit  <- readRDS("output/survival_weibull_fit.rds")
post_samp <- as.data.frame(as_draws_df(surv_fit))
saveRDS(post_samp, "output/post_samp.rds")
cat(sprintf("      Tersimpan: output/post_samp.rds (%.1f MB, %d baris x %d kolom)\n\n",
    file.size("output/post_samp.rds") / 1e6,
    nrow(post_samp), ncol(post_samp)))

# --- 2. Pre-compute referensi FPCA ---
cat("[2/2] Menghitung referensi FPCA dari data latih...\n")
load("output/simulasi_data.RData")

N_SESI        <- 30
t_eval        <- 1:N_SESI
bspline_basis <- create.bspline.basis(rangeval = c(1, N_SESI), nbasis = 12, norder = 4)
fdPar_obj     <- fdPar(bspline_basis, Lfdobj = 2, lambda = 10^1.5)
fd_smooth     <- smooth.basis(argvals = t_eval, y = t(matriks_rom), fdParobj = fdPar_obj)$fd
fpca_res      <- pca.fd(fd_smooth, nharm = 2)

fpca_ref <- list(
  N_SESI        = N_SESI,
  t_eval        = t_eval,
  bspline_basis = bspline_basis,
  fdPar_obj     = fdPar_obj,
  mean_fd       = fpca_res$meanfd,
  harmonics     = fpca_res$harmonics,
  fpc1_mean     = mean(fpca_res$scores[, 1]),
  fpc1_sd       = sd(fpca_res$scores[, 1]),
  fpc2_mean     = mean(fpca_res$scores[, 2]),
  fpc2_sd       = sd(fpca_res$scores[, 2]),
  levels_sendi  = sort(unique(param_sendi$jenis_sendi))
)
saveRDS(fpca_ref, "output/fpca_ref.rds")
cat(sprintf("      Tersimpan: output/fpca_ref.rds (%.1f MB)\n\n",
    file.size("output/fpca_ref.rds") / 1e6))

cat("=== Selesai! ===\n")
cat("Langkah selanjutnya:\n")
cat("  git add output/post_samp.rds output/fpca_ref.rds\n")
cat("  git commit -m 'add: lightweight model files for deployment'\n")
cat("  git push\n")
cat("Lalu deploy ke Railway.\n")

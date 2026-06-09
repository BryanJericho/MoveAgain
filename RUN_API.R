# =============================================================
# RUN_API.R - Menjalankan Server Plumber
# =============================================================
# Lokal  : npm run rapi   (atau Rscript RUN_API.R)
# Docker : dijalankan otomatis oleh CMD di Dockerfile
# =============================================================

library(plumber)

# Di lokal: set working directory ke folder project
# Di Docker/Railway: PORT sudah diset, skip setwd
if (nchar(Sys.getenv("PORT")) == 0) {
  setwd("d:/SEC-Stroke")
  cat("Working directory:", getwd(), "\n")
}

# Validasi file yang dibutuhkan
has_prod <- file.exists("output/post_samp.rds") && file.exists("output/fpca_ref.rds")
has_dev  <- file.exists("output/survival_weibull_fit.rds") && file.exists("output/simulasi_data.RData")

if (!has_prod && !has_dev) {
  stop(paste(
    "\nERROR: Tidak ada file model yang ditemukan di output/",
    "Untuk produksi  : jalankan prepare_deployment.R terlebih dahulu",
    "Untuk lokal     : pastikan output/survival_weibull_fit.rds ada",
    sep = "\n"
  ))
}

cat("========================================================\n")
cat(if (has_prod) " Mode: PRODUKSI (file ringan)\n" else " Mode: LOKAL (model brms penuh)\n")
cat("========================================================\n")

pr <- pr("API_plumber.R")

port <- as.integer(Sys.getenv("PORT", "8000"))
host <- "0.0.0.0"
cat(sprintf("\n Server berjalan di http://%s:%d\n", host, port))
cat(sprintf(" Dokumentasi  : http://%s:%d/__docs__/\n\n", host, port))

pr_run(pr, host = host, port = port)

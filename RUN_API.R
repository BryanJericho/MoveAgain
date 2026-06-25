# =============================================================
# RUN_API.R — Menjalankan Server Plumber API
# Diperbarui: Sinkron dengan API_plumber.R terbaru
# =============================================================

pkgs <- c("plumber", "fda", "brms", "tidyverse", "svglite")
for (p in pkgs) {
  if (!requireNamespace(p, quietly = TRUE)) {
    cat(sprintf("Package '%s' belum terinstal. Sedang menginstal...\n", p))
    install.packages(p, repos = "https://cran.r-project.org")
  }
}

library(plumber)

# Validasi file model tersedia
if (!file.exists("output/simulasi_data.RData")) {
  stop("File output/simulasi_data.RData tidak ditemukan! Jalankan 00_RUN_ALL.R terlebih dahulu.")
}
if (!file.exists("output/survival_weibull_fit.rds")) {
  stop("File output/survival_weibull_fit.rds tidak ditemukan! Jalankan 00_RUN_ALL.R terlebih dahulu.")
}

cat("========================================================\n")
cat(" Menyiapkan Server R Plumber API...\n")
cat(" (Memuat model Bayesian dari output/. Proses ini mungkin\n")
cat("  memakan waktu 10-30 detik untuk loading pertama kali.)\n")
cat("========================================================\n")

pr <- pr("API_plumber.R")

# Aktifkan CORS agar frontend bisa mengakses API
pr <- pr_set_api_spec(pr, function(spec) {
  spec$info$title <- "API Prediksi Rehabilitasi Pasca Stroke"
  spec$info$version <- "2.0.0"
  spec
})

# CORS filter untuk integrasi frontend
pr$filter("cors", function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type, Accept")
  
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 200
    return(list())
  }
  
  plumber::forward()
})

cat("\n========================================================\n")
cat(" Server Berjalan! Endpoint tersedia:\n")
cat("   GET  http://127.0.0.1:8000/health     (Health Check)\n")
cat("   GET  http://127.0.0.1:8000/sendi      (Daftar Sendi)\n")
cat("   POST http://127.0.0.1:8000/predict     (Prediksi 1 Sendi)\n")
cat("   POST http://127.0.0.1:8000/predict_batch (Prediksi Multi-Sendi)\n")
cat("\n Swagger UI: http://127.0.0.1:8000/__docs__/\n")
cat("========================================================\n")

# Jalankan API di port 8000
pr_run(pr, host = "0.0.0.0", port = 8000)

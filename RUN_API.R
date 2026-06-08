# =============================================================
# RUN_API.R - Menjalankan Server Plumber API Prediksi Pemulihan
# =============================================================
# Jalankan via npm: npm run rapi
# atau langsung:   Rscript d:/SEC-Stroke/RUN_API.R

if (!requireNamespace("plumber", quietly = TRUE)) {
  cat("Menginstal package 'plumber'...\n")
  install.packages("plumber", repos = "https://cran.r-project.org")
}

library(plumber)

# Set working directory ke folder project agar path output/ ditemukan
setwd("d:/SEC-Stroke")
cat("Working directory:", getwd(), "\n")

# Cek file yang dibutuhkan
required_files <- c("API_plumber.R", "output/simulasi_data.RData", "output/survival_weibull_fit.rds")
missing <- required_files[!file.exists(required_files)]
if (length(missing) > 0) {
  cat("\nERROR: File berikut tidak ditemukan:\n")
  for (f in missing) cat("  -", normalizePath(f, mustWork = FALSE), "\n")
  cat("\nPastikan API_plumber.R dan folder output/ ada di d:/SEC-Stroke/\n")
  stop("File tidak lengkap")
}

cat("========================================================\n")
cat(" Menyiapkan Server R Plumber API...\n")
cat(" (Memuat model dari output/ ...)\n")
cat("========================================================\n")

pr <- pr("API_plumber.R")

cat("\n========================================================\n")
cat(" Server Berjalan di http://127.0.0.1:8000\n")
cat(" Dokumentasi: http://127.0.0.1:8000/__docs__/\n")
cat("========================================================\n")

pr_run(pr, host = "0.0.0.0", port = 8000)

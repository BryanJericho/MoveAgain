# =============================================================
# RUN_API.R — Menjalankan Server Plumber API (PROD mode)
# Hanya butuh: plumber, fda, output/post_samp.rds, output/fpca_ref.rds
# =============================================================

library(plumber)

cat("========================================================\n")
cat(" Menyiapkan Server R Plumber API...\n")
cat("========================================================\n")

pr <- pr("API_plumber.R")

pr <- pr_set_api_spec(pr, function(spec) {
  spec$info$title <- "API Prediksi Rehabilitasi Pasca Stroke"
  spec$info$version <- "2.0.0"
  spec
})

cat("\n========================================================\n")
cat(" Server Berjalan!\n")
cat("   GET  http://0.0.0.0:8000/health\n")
cat("   POST http://0.0.0.0:8000/predict\n")
cat("========================================================\n")

pr_run(pr, host = "0.0.0.0", port = 8000)

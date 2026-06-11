# ================================================================
# export_for_python.R
# Jalankan SEKALI untuk mengekspor data ke CSV.
# Setelah ini, semua evaluasi bisa pakai Python (evaluate.py).
# ================================================================
# Rscript evaluation/export_for_python.R
# ================================================================

setwd("d:/SEC-Stroke")
library(brms)

cat("Mengekspor data training + posterior draws ke CSV...\n")

surv_fit   <- readRDS("output/survival_weibull_fit.rds")
post_samp  <- as.data.frame(as_draws_df(surv_fit))
data_model <- surv_fit$data

dir.create("evaluation/data", showWarnings = FALSE, recursive = TRUE)
write.csv(data_model, "evaluation/data/training_data.csv", row.names = FALSE)
write.csv(post_samp,  "evaluation/data/post_samp.csv",     row.names = FALSE)

cat(sprintf("training_data.csv  : %d baris × %d kolom\n", nrow(data_model), ncol(data_model)))
cat(sprintf("post_samp.csv      : %d baris × %d kolom\n", nrow(post_samp),  ncol(post_samp)))
cat("Selesai! Jalankan: python evaluation/evaluate.py\n")

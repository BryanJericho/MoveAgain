# ================================================================
# 01_c_index.R — Harrell's Concordance Index (C-index)
# ================================================================
# Mengukur kemampuan model mengurutkan pasien berdasarkan risiko:
# apakah pasien yang diprediksi pulih lebih cepat memang benar
# lebih cepat pulih dari pasien lain?
#
# C = 0.5 → acak (tidak lebih baik dari tebakan)
# C = 1.0 → sempurna
# C ≥ 0.7 → baik untuk model medis
# ================================================================

library(survival)

cat("─────────────────────────────────────────────────\n")
cat(" Metrik 1: Concordance Index (C-index / Harrell's C)\n")
cat("─────────────────────────────────────────────────\n")

# Risk score: 1/t_med (lebih tinggi = prediksi pulih lebih cepat = risiko lebih tinggi)
# survival::concordance() mengharapkan: predictor tinggi = risiko tinggi
risk_score <- 1 / t_med_mean

surv_obj <- Surv(waktu, status)
c_result <- concordance(surv_obj ~ risk_score, timewt = "n")

c_val <- c_result$concordance
c_se  <- sqrt(c_result$var)
c_lo  <- c_val - 1.96 * c_se
c_hi  <- c_val + 1.96 * c_se

interp <- dplyr::case_when(
  c_val >= 0.8 ~ "Sangat baik",
  c_val >= 0.7 ~ "Baik",
  c_val >= 0.6 ~ "Cukup",
  TRUE         ~ "Lemah"
)

cat(sprintf("C-index        : %.4f\n", c_val))
cat(sprintf("Standard Error : %.4f\n", c_se))
cat(sprintf("95%% CI         : [%.4f,  %.4f]\n", c_lo, c_hi))
cat(sprintf("Interpretasi   : %s\n\n", interp))

# ── Plot: distribusi t_med vs waktu aktual ─────────────────────
df_plot <- data.frame(
  t_med      = t_med_mean,
  waktu_aktual = waktu,
  status     = factor(status, labels = c("Tersensor", "Event (Pulih)"))
)

p_scatter <- ggplot(df_plot, aes(x = t_med, y = waktu_aktual, color = status)) +
  geom_point(alpha = 0.55, size = 1.8) +
  geom_abline(intercept = 0, slope = 1, linetype = "dashed", color = "gray40") +
  scale_color_manual(values = c("Tersensor" = "#94a3b8", "Event (Pulih)" = "#2563eb")) +
  labs(
    title    = "Prediksi Median vs Waktu Aktual",
    subtitle = sprintf("C-index = %.3f  (95%% CI: %.3f–%.3f)", c_val, c_lo, c_hi),
    x        = "Prediksi Median Waktu Pulih (hari)",
    y        = "Waktu Aktual (hari)",
    color    = NULL
  ) +
  theme_minimal(base_size = 12) +
  theme(legend.position = "bottom")

ggsave("evaluation/output/plot_c_index_scatter.png", p_scatter,
       width = 6, height = 5, dpi = 150)
cat("Plot: evaluation/output/plot_c_index_scatter.png\n\n")

# ── Simpan hasil ───────────────────────────────────────────────
c_index_result <- list(
  c_index = c_val, se = c_se,
  ci_lower = c_lo, ci_upper = c_hi,
  interpretasi = interp
)
saveRDS(c_index_result, "evaluation/output/c_index.rds")

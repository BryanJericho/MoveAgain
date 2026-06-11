# ================================================================
# 04_loo_ppc.R — LOO Cross-Validation & Posterior Predictive Check
# ================================================================
# LOO-CV (Leave-One-Out Cross-Validation):
#   Memperkirakan expected log predictive density (ELPD) sebagai
#   ukuran generalisasi model pada data baru. Dihitung dengan
#   Pareto-Smoothed Importance Sampling (PSIS-LOO) dari paket loo.
#
# PPC (Posterior Predictive Check):
#   Membandingkan distribusi waktu pulih yang disimulasikan dari
#   model (y_rep) dengan data aktual. Jika model baik, distribusinya
#   seharusnya mirip.
# ================================================================

library(brms)
library(ggplot2)
library(dplyr)

cat("─────────────────────────────────────────────────\n")
cat(" Metrik 4: LOO Cross-Validation & PPC\n")
cat("─────────────────────────────────────────────────\n")

# ── LOO-CV ─────────────────────────────────────────────────────
cat("Menghitung PSIS-LOO (ini memakan waktu ~2-5 menit)...\n")

loo_result <- tryCatch({
  loo(surv_fit, moment_match = FALSE)
}, error = function(e) {
  cat("  PERINGATAN: LOO gagal, mencoba refitting...\n")
  add_criterion(surv_fit, "loo")
  surv_fit$criteria$loo
})

cat("\nHasil LOO-CV:\n")
print(loo_result)

# Pareto-k diagnostik — ukur reliabilitas tiap observasi
k_vals <- loo_result$diagnostics$pareto_k
k_ok   <- sum(k_vals < 0.5)
k_warn <- sum(k_vals >= 0.5 & k_vals < 0.7)
k_bad  <- sum(k_vals >= 0.7)

cat(sprintf("\nPareto-k diagnostik (n=%d pasien):\n", n_pasien))
cat(sprintf("  k < 0.5  (baik)     : %d (%.1f%%)\n", k_ok,   k_ok/n_pasien*100))
cat(sprintf("  k = 0.5–0.7 (peringatan): %d (%.1f%%)\n", k_warn, k_warn/n_pasien*100))
cat(sprintf("  k > 0.7  (bermasalah): %d (%.1f%%)\n\n",  k_bad,  k_bad/n_pasien*100))

elpd_loo <- loo_result$estimates["elpd_loo", "Estimate"]
elpd_se  <- loo_result$estimates["elpd_loo", "SE"]
cat(sprintf("ELPD_LOO: %.2f ± %.2f (SE)\n", elpd_loo, elpd_se))
cat("Interpretasi: semakin tinggi ELPD = prediksi lebih akurat pada data baru.\n\n")

# Plot Pareto-k
df_k <- data.frame(
  pasien = seq_along(k_vals),
  k      = k_vals,
  status = cut(k_vals, c(-Inf, 0.5, 0.7, Inf),
               labels = c("Baik (k<0.5)", "Peringatan (0.5-0.7)", "Bermasalah (>0.7)"))
)

p_k <- ggplot(df_k, aes(x = pasien, y = k, color = status)) +
  geom_point(size = 1.5, alpha = 0.7) +
  geom_hline(yintercept = 0.5, linetype = "dashed", color = "#f59e0b") +
  geom_hline(yintercept = 0.7, linetype = "dashed", color = "#ef4444") +
  scale_color_manual(values = c("Baik (k<0.5)"         = "#22c55e",
                                 "Peringatan (0.5-0.7)" = "#f59e0b",
                                 "Bermasalah (>0.7)"    = "#ef4444")) +
  labs(
    title    = "Pareto-k Diagnostik (LOO-CV)",
    subtitle = sprintf("ELPD_LOO = %.1f ± %.1f", elpd_loo, elpd_se),
    x        = "Pasien",
    y        = "Pareto-k",
    color    = NULL
  ) +
  theme_minimal(base_size = 12) +
  theme(legend.position = "bottom")

ggsave("evaluation/output/plot_pareto_k.png", p_k, width = 7, height = 4.5, dpi = 150)
cat("Plot: evaluation/output/plot_pareto_k.png\n")

# ── Posterior Predictive Check ─────────────────────────────────
cat("\nMembuat Posterior Predictive Check (PPC)...\n")
y_rep <- posterior_predict(surv_fit, ndraws = 200)  # 200 draw sudah cukup untuk visual

# Distribusi waktu aktual vs simulasi dari model
ppc_df_rep <- data.frame(
  waktu  = as.vector(t(y_rep)),
  source = "Simulasi (y_rep)",
  draw   = rep(1:200, each = n_pasien)
)
ppc_df_obs <- data.frame(
  waktu  = waktu,
  source = "Data Aktual (y)",
  draw   = 0L
)

# Batasi waktu ke rentang yang masuk akal untuk plot
xlim_max <- quantile(waktu, 0.99) * 1.5

p_ppc <- ggplot() +
  # Distribusi simulasi (abu-abu tipis)
  geom_density(
    data = ppc_df_rep %>% filter(waktu > 0, waktu <= xlim_max),
    aes(x = waktu, group = draw),
    color = "#94a3b8", alpha = 0.08, linewidth = 0.3
  ) +
  # Distribusi aktual (biru tebal)
  geom_density(
    data = ppc_df_obs %>% filter(waktu > 0),
    aes(x = waktu),
    color = "#1d4ed8", linewidth = 1.2
  ) +
  annotate("text", x = Inf, y = Inf, hjust = 1.1, vjust = 1.5,
           label = "Biru = data aktual\nAbu-abu = simulasi model",
           size = 3.2, color = "gray30") +
  coord_cartesian(xlim = c(0, xlim_max)) +
  labs(
    title    = "Posterior Predictive Check",
    subtitle = "Model baik jika distribusi biru berada di tengah distribusi abu-abu",
    x        = "Waktu Pulih (hari)",
    y        = "Densitas"
  ) +
  theme_minimal(base_size = 12)

ggsave("evaluation/output/plot_ppc.png", p_ppc, width = 7, height = 4.5, dpi = 150)
cat("Plot: evaluation/output/plot_ppc.png\n")

# ── PPC: median dan SD prediksi vs aktual ──────────────────────
med_rep <- apply(y_rep, 1, median)
sd_rep  <- apply(y_rep, 1, sd)
med_obs <- median(waktu)
sd_obs  <- sd(waktu)

cat(sprintf("\nPPC statistik ringkasan:\n"))
cat(sprintf("  Median aktual : %.1f hari\n", med_obs))
cat(sprintf("  Median y_rep  : %.1f [%.1f, %.1f]\n",
            median(med_rep), quantile(med_rep, 0.025), quantile(med_rep, 0.975)))
cat(sprintf("  SD aktual     : %.1f hari\n", sd_obs))
cat(sprintf("  SD y_rep      : %.1f [%.1f, %.1f]\n\n",
            median(sd_rep), quantile(sd_rep, 0.025), quantile(sd_rep, 0.975)))

# Bayesian p-value: proporsi draw di mana statistic(y_rep) > statistic(y_obs)
p_val_median <- mean(med_rep > med_obs)
p_val_sd     <- mean(sd_rep  > sd_obs)
cat(sprintf("Bayesian p-value (median): %.3f (ideal ~0.5)\n", p_val_median))
cat(sprintf("Bayesian p-value (SD)    : %.3f (ideal ~0.5)\n\n", p_val_sd))

# ── Simpan ─────────────────────────────────────────────────────
saveRDS(list(
  loo_result     = loo_result,
  pareto_k       = k_vals,
  elpd_loo       = elpd_loo,
  elpd_se        = elpd_se,
  pval_median    = p_val_median,
  pval_sd        = p_val_sd
), "evaluation/output/loo_ppc.rds")

cat("Output: evaluation/output/loo_ppc.rds\n\n")

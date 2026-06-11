# ================================================================
# 03_precision_recall.R — Classification Metrics
# ================================================================
# Evaluasi model sebagai binary classifier:
#   Outcome: apakah pasien pulih dalam 90 hari?
#   Positif (1): pulih ≤ 90 hari
#   Negatif (0): tersensor / belum pulih saat 90 hari
#
# Threshold optimal dipilih menggunakan Youden's J = Sensitivity + Specificity - 1
# ================================================================

library(pROC)
library(ggplot2)
library(dplyr)

cat("─────────────────────────────────────────────────\n")
cat(" Metrik 3: Precision, Recall, F1, ROC, AUC\n")
cat("─────────────────────────────────────────────────\n")

# ── Binary outcome ──────────────────────────────────────────────
# Label positif: pasien YANG BENAR-BENAR pulih ≤ 90 hari
# Pasien tersensor sebelum 90 hari = tidak tahu (dikecualikan)
y_true  <- ifelse(waktu <= 90 & status == 1, 1L, 0L)
y_score <- prob90_mean    # prediksi P(T ≤ 90)

# Pasien tersensor sebelum 90 hari: tidak pasti, keluarkan dari klasifikasi
keep <- !(status == 0 & waktu < 90)
cat(sprintf("Total pasien    : %d\n", n_pasien))
cat(sprintf("Tersensor < 90  : %d (dikeluarkan dari klasifikasi)\n", sum(!keep)))
cat(sprintf("Digunakan       : %d\n", sum(keep)))
cat(sprintf("Positif (pulih) : %d\n", sum(y_true[keep] == 1)))
cat(sprintf("Negatif (tidak) : %d\n\n", sum(y_true[keep] == 0)))

y_t <- y_true[keep]
y_s <- y_score[keep]

# ── ROC Curve & AUC ────────────────────────────────────────────
roc_obj <- roc(y_t, y_s, levels = c(0, 1), direction = "<", quiet = TRUE)
auc_val <- as.numeric(auc(roc_obj))
ci_auc  <- ci.auc(roc_obj, conf.level = 0.95)

cat(sprintf("AUC-ROC  : %.4f\n", auc_val))
cat(sprintf("95%% CI   : [%.4f, %.4f]\n\n", ci_auc[1], ci_auc[3]))

# ── Threshold optimal: Youden's J ──────────────────────────────
thr_df <- data.frame(
  threshold   = roc_obj$thresholds,
  sensitivity = roc_obj$sensitivities,
  specificity = roc_obj$specificities,
  youden      = roc_obj$sensitivities + roc_obj$specificities - 1
)

best_idx  <- which.max(thr_df$youden)
best_thr  <- thr_df$threshold[best_idx]
best_sens <- thr_df$sensitivity[best_idx]
best_spec <- thr_df$specificity[best_idx]

cat(sprintf("Threshold optimal (Youden): %.4f\n", best_thr))
cat(sprintf("Sensitivity (Recall)       : %.4f\n", best_sens))
cat(sprintf("Specificity                : %.4f\n\n", best_spec))

# ── Confusion Matrix ───────────────────────────────────────────
y_pred <- as.integer(y_s >= best_thr)
TP <- sum(y_pred == 1 & y_t == 1)
TN <- sum(y_pred == 0 & y_t == 0)
FP <- sum(y_pred == 1 & y_t == 0)
FN <- sum(y_pred == 0 & y_t == 1)

precision <- TP / pmax(TP + FP, 1)
recall    <- TP / pmax(TP + FN, 1)   # = sensitivity
f1        <- 2 * precision * recall  / pmax(precision + recall, 1e-9)
accuracy  <- (TP + TN) / length(y_t)
npv       <- TN / pmax(TN + FN, 1)  # negative predictive value

cat("Confusion Matrix (threshold optimal):\n")
cat(sprintf("              Prediksi+  Prediksi-\n"))
cat(sprintf("  Aktual +  :    %4d       %4d   (TP, FN)\n", TP, FN))
cat(sprintf("  Aktual -  :    %4d       %4d   (FP, TN)\n", FP, TN))
cat("\nMetrik klasifikasi:\n")
cat(sprintf("  Accuracy   : %.4f\n", accuracy))
cat(sprintf("  Precision  : %.4f  (PPV: dari yg diprediksi +, berapa yg benar?)\n", precision))
cat(sprintf("  Recall     : %.4f  (Sensitivity: dari yg benar +, berapa terdeteksi?)\n", recall))
cat(sprintf("  Specificity: %.4f\n", best_spec))
cat(sprintf("  NPV        : %.4f\n", npv))
cat(sprintf("  F1 Score   : %.4f\n\n", f1))

# ── Threshold sweep: Precision-Recall curve ────────────────────
thresholds <- seq(0.01, 0.99, by = 0.01)
pr_df <- lapply(thresholds, function(thr) {
  yp  <- as.integer(y_s >= thr)
  tp_ <- sum(yp == 1 & y_t == 1)
  fp_ <- sum(yp == 1 & y_t == 0)
  fn_ <- sum(yp == 0 & y_t == 1)
  data.frame(
    threshold = thr,
    precision = tp_ / pmax(tp_ + fp_, 1),
    recall    = tp_ / pmax(tp_ + fn_, 1)
  )
}) |> dplyr::bind_rows()

# Area under PR curve (trapezoid)
pr_sorted <- pr_df[order(pr_df$recall), ]
auprc <- sum(diff(pr_sorted$recall) * (head(pr_sorted$precision, -1) + tail(pr_sorted$precision, -1)) / 2)

cat(sprintf("AUC-PR (Precision-Recall) : %.4f\n\n", auprc))

# ── Plot ROC ───────────────────────────────────────────────────
roc_df <- data.frame(
  fpr  = 1 - roc_obj$specificities,
  tpr  = roc_obj$sensitivities
)

p_roc <- ggplot(roc_df, aes(x = fpr, y = tpr)) +
  geom_line(color = "#2563eb", linewidth = 1.1) +
  geom_abline(intercept = 0, slope = 1, linetype = "dashed", color = "gray50") +
  geom_point(aes(x = 1 - best_spec, y = best_sens),
             color = "#ef4444", size = 3.5, shape = 21, fill = "white", stroke = 2) +
  annotate("text", x = 1 - best_spec + 0.05, y = best_sens - 0.04,
           label = sprintf("Optimal\nthr=%.2f", best_thr),
           size = 3.2, color = "#ef4444", hjust = 0) +
  scale_x_continuous(labels = scales::percent_format(accuracy = 1)) +
  scale_y_continuous(labels = scales::percent_format(accuracy = 1)) +
  labs(
    title    = "ROC Curve — Prediksi Pulih ≤ 90 Hari",
    subtitle = sprintf("AUC = %.3f  (95%% CI: %.3f–%.3f)", auc_val, ci_auc[1], ci_auc[3]),
    x        = "1 – Specificity (False Positive Rate)",
    y        = "Sensitivity (True Positive Rate)"
  ) +
  theme_minimal(base_size = 12)

ggsave("evaluation/output/plot_roc.png", p_roc, width = 5.5, height = 5, dpi = 150)

# ── Plot Precision-Recall ──────────────────────────────────────
p_pr <- ggplot(pr_df, aes(x = recall, y = precision)) +
  geom_path(color = "#2563eb", linewidth = 1.0) +
  geom_vline(xintercept = recall, linetype = "dashed", color = "#94a3b8", linewidth = 0.5) +
  geom_point(
    data = pr_df[which.min(abs(pr_df$threshold - best_thr)), ],
    color = "#ef4444", size = 3.5, shape = 21, fill = "white", stroke = 2
  ) +
  scale_x_continuous(labels = scales::percent_format(accuracy = 1), limits = c(0, 1)) +
  scale_y_continuous(labels = scales::percent_format(accuracy = 1), limits = c(0, 1)) +
  labs(
    title    = "Precision-Recall Curve — Pulih ≤ 90 Hari",
    subtitle = sprintf("AUC-PR = %.3f", auprc),
    x        = "Recall (Sensitivity)",
    y        = "Precision (PPV)"
  ) +
  theme_minimal(base_size = 12)

ggsave("evaluation/output/plot_precision_recall.png", p_pr, width = 5.5, height = 5, dpi = 150)

cat("Plot: evaluation/output/plot_roc.png\n")
cat("Plot: evaluation/output/plot_precision_recall.png\n\n")

# ── Tabel F1 per threshold ─────────────────────────────────────
f1_df <- lapply(thresholds, function(thr) {
  yp  <- as.integer(y_s >= thr)
  tp_ <- sum(yp == 1 & y_t == 1)
  fp_ <- sum(yp == 1 & y_t == 0)
  fn_ <- sum(yp == 0 & y_t == 1)
  p_  <- tp_ / pmax(tp_ + fp_, 1)
  r_  <- tp_ / pmax(tp_ + fn_, 1)
  f1_ <- 2 * p_ * r_ / pmax(p_ + r_, 1e-9)
  data.frame(threshold = thr, precision = p_, recall = r_, f1 = f1_)
}) |> dplyr::bind_rows()

best_f1_row <- f1_df[which.max(f1_df$f1), ]
cat(sprintf("Threshold max F1  : %.2f  (F1 = %.4f, P = %.4f, R = %.4f)\n\n",
            best_f1_row$threshold, best_f1_row$f1,
            best_f1_row$precision, best_f1_row$recall))

# ── Simpan ─────────────────────────────────────────────────────
clf_result <- list(
  auc_roc    = auc_val,
  auc_pr     = auprc,
  threshold  = best_thr,
  accuracy   = accuracy,
  precision  = precision,
  recall     = recall,
  specificity = best_spec,
  f1         = f1,
  npv        = npv,
  confusion  = matrix(c(TP, FP, FN, TN), 2, 2,
                      dimnames = list(c("Pred+","Pred-"), c("Aktual+","Aktual-")))
)
saveRDS(clf_result, "evaluation/output/classification_metrics.rds")
write.csv(f1_df, "evaluation/output/f1_threshold_sweep.csv", row.names = FALSE)

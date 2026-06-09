# =============================================================
# Dockerfile — R Plumber API (tanpa brms/Stan)
# =============================================================
# Image ringan ~600MB karena hanya butuh plumber + fda.
# Jalankan prepare_deployment.R lokal dulu sebelum build.
# =============================================================

FROM rocker/r-ver:4.4

# System dependencies untuk plumber (curl, openssl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install R packages — fda adalah pure R, plumber ringan
RUN R -e "install.packages(c('plumber', 'fda', 'jsonlite'), \
          repos='https://cran.r-project.org', quiet=TRUE)"

WORKDIR /app

# Hanya salin file yang diperlukan (bukan node_modules, src, dll)
COPY API_plumber.R  .
COPY RUN_API.R      .
COPY output/post_samp.rds  output/
COPY output/fpca_ref.rds   output/

EXPOSE 8000

CMD ["Rscript", "RUN_API.R"]

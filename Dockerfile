# =============================================================
# Dockerfile — R Plumber API (tanpa brms/Stan)
# =============================================================

FROM rocker/r-ver:4.4

# System libraries yang dibutuhkan plumber dan fda
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libsodium-dev \
    && rm -rf /var/lib/apt/lists/*

# install2.r dari littler: keluar dengan error code jika package gagal install
# --error  = fail hard on error (berbeda dengan install.packages yang diam-diam gagal)
# --ncpus -1 = pakai semua CPU yang tersedia (lebih cepat)
RUN install2.r --error --ncpus -1 plumber fda jsonlite

WORKDIR /app

COPY API_plumber.R  .
COPY RUN_API.R      .
COPY output/post_samp.rds  output/
COPY output/fpca_ref.rds   output/

EXPOSE 8000

CMD ["Rscript", "RUN_API.R"]

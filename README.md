# Move Again — Post-Stroke Rehabilitation PWA

## Deskripsi Singkat

**Move Again** adalah aplikasi web progresif (PWA) berbasis *computer vision* untuk pemantauan rehabilitasi pasca-stroke secara mandiri. Tanpa alat tambahan, pasien dapat mengukur *Range of Motion* (ROM) sendi secara real-time menggunakan kamera smartphone, melacak progres harian, dan mendapatkan prediksi waktu pemulihan berbasis model statistik Bayesian yang dilatih dari data klinis.

---

## Arsitektur Sistem

Sistem terdiri dari tiga lapisan utama yang saling terintegrasi:

**Lapisan Akuisisi Data:** Kamera perangkat → MediaPipe Computer Vision Engine → Kalkulasi ROM → Firebase Firestore

**Lapisan Visualisasi:** Data sesi tersimpan → Recharts (grafik tren ROM dan repetisi) → Antarmuka React PWA

**Lapisan Prediksi & AI:** Histori ROM → Ekstraksi fitur FDA/FPCA → R Plumber API → Model Bayesian Survival → Estimasi hari pulih; serta Konteks klinis pasien → Google Gemini AI Chatbot

**Stack Teknologi:**
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Computer Vision: MediaPipe Tasks Vision 0.10.x
- Database: Firebase Firestore (offline-capable)
- Auth: Firebase Authentication
- AI Chatbot: Google Gemini 2.5 Flash
- Prediksi Statistik: R 4.6 + Plumber + brms + fda
- Deployment: Vercel (frontend) + localhost (R API, development)

---

## Metode 1 — Deteksi Pose Real-Time (MediaPipe)

### 1.1 MediaPipe Pose Landmarker

Aplikasi menggunakan **MediaPipe Pose Landmarker** dari Google untuk mendeteksi 33 titik landmark tubuh secara real-time dari frame kamera. Model yang digunakan adalah `pose_landmarker_full.task` dengan akurasi tinggi. Setiap frame video diproses pada ~10 Hz (interval 100ms) untuk menghasilkan koordinat 3D (x, y, z) yang dinormalisasi terhadap dimensi frame.

**Landmark yang digunakan per latihan:**

| Latihan | Titik A | Titik B (Sendi) | Titik C | Range Normal |
|---------|---------|-----------------|---------|--------------|
| Fleksi Siku Kanan | Bahu Kanan (12) | Siku Kanan (14) | Pergelangan (16) | 0°–145° |
| Fleksi Siku Kiri | Bahu Kiri (11) | Siku Kiri (13) | Pergelangan (15) | 0°–145° |
| Abduksi Bahu Kanan | Pinggul Kanan (24) | Bahu Kanan (12) | Siku Kanan (14) | 0°–180° |
| Abduksi Bahu Kiri | Pinggul Kiri (23) | Bahu Kiri (11) | Siku Kiri (13) | 0°–180° |
| Fleksi Lutut Kanan | Pinggul Kanan (24) | Lutut Kanan (26) | Pergelangan Kaki (28) | 0°–135° |
| Fleksi Lutut Kiri | Pinggul Kiri (23) | Lutut Kiri (25) | Pergelangan Kaki (27) | 0°–135° |
| Dorsifleksi Ankle | Lutut (26) | Ankle (28) | Ujung Kaki (32) | 0°–20° |

**Referensi:**
- Bazarevsky, V., Grishchenko, I., Raveendran, K., Zhu, T., Zhang, F., & Grundmann, M. (2020). *BlazePose: On-device Real-time Body Pose Tracking*. arXiv:2006.10204.
- Lugaresi, C., Tang, J., Nash, H., et al. (2019). *MediaPipe: A Framework for Building Perception Pipelines*. arXiv:1906.08172.

### 1.2 MediaPipe Hand Landmarker

Untuk rehabilitasi jari tangan, digunakan **MediaPipe Hand Landmarker** yang mendeteksi 21 landmark tangan per frame. Pendekatan ini memungkinkan pengukuran ROM sendi-sendi kecil jari yang tidak terdeteksi oleh Pose Landmarker.

**Landmark yang digunakan:**

| Latihan | Titik A | Titik B (Sendi) | Titik C | Range Normal |
|---------|---------|-----------------|---------|--------------|
| Fleksi Telunjuk PIP | MCP (5) | PIP (6) | DIP (7) | 0°–100° |
| Fleksi Jari Tengah PIP | MCP (9) | PIP (10) | DIP (11) | 0°–100° |
| Fleksi Jari Manis PIP | MCP (13) | PIP (14) | DIP (15) | 0°–100° |
| Fleksi Kelingking PIP | MCP (17) | PIP (18) | DIP (19) | 0°–100° |
| Fleksi Ibu Jari IP | CMC (2) | MCP (3) | IP (4) | 0°–80° |
| Fleksi Telunjuk MCP | Wrist (0) | MCP (5) | PIP (6) | 0°–90° |

**Referensi:**
- Zhang, F., Bazarevsky, V., Vakunov, A., et al. (2020). *MediaPipe Hands: On-device Real-time Hand Tracking*. arXiv:2006.10214.

---

## Metode 2 — Perhitungan Range of Motion (ROM)

### 2.1 Kalkulasi Sudut Tiga Titik

ROM dihitung sebagai sudut yang dibentuk oleh tiga landmark (A–B–C) di mana B adalah sendi yang diukur. Metode ini menggunakan **dot product vektor 2D**:

Dua vektor dibentuk dari titik sendi ke titik proksimal (v1 = A − B) dan ke titik distal (v2 = C − B). Sudut θ antara kedua vektor dihitung menggunakan:

θ = arccos( (v1 · v2) / (|v1| × |v2|) ) × (180 / π)

Sudut θ dalam derajat merepresentasikan ROM sendi pada frame tersebut. Nilai diclamp pada rentang [−1, 1] sebelum arccos untuk mencegah domain error akibat floating-point.

### 2.2 Penghitungan Repetisi (Rep Counting)

Rep dihitung menggunakan **state machine dua-kondisi** dengan threshold hysteresis untuk mencegah *false counting* akibat noise sensor:

- **State UP** aktif saat ROM melewati batas atas (60% dari ROM normal maksimum)
- **State DOWN** aktif saat ROM turun di bawah batas bawah (20% dari ROM normal maksimum)
- Satu repetisi dicatat setiap siklus UP → DOWN selesai

Pendekatan hysteresis ini lebih robust dibanding threshold tunggal karena tidak sensitif terhadap osilasi kecil di sekitar nilai ambang.

**Referensi:**
- Norkin, C.C. & White, D.J. (2016). *Measurement of Joint Motion: A Guide to Goniometry* (5th ed.). F.A. Davis Company.
- Kolber, M.J. & Hanney, W.J. (2012). The reliability and concurrent validity of shoulder mobility measurements using a digital inclinometer and goniometer. *Physiotherapy Theory and Practice*, 28(7), 543–552.

---

## Metode 3 — Analisis Data Fungsional (FDA) untuk Ekstraksi Fitur ROM

### 3.1 Pemulusan Kurva B-Spline

Histori ROM seorang pasien selama N sesi diperlakukan sebagai **kurva fungsi kontinu** dalam waktu, bukan sebagai titik-titik diskrit. Kurva ROM direpresentasikan sebagai kombinasi linier basis B-spline:

x(t) = Σ cₖ φₖ(t), untuk k = 1, ..., K

dengan konfigurasi: K = 12 basis functions, orde = 4 (kubik), parameter regularisasi λ = 10^1.5, dan domain t ∈ [1, 30] sesi.

Estimasi koefisien menggunakan **penalized least squares**:

min_c ‖y − Φc‖² + λ ∫ [D²x(t)]² dt

di mana D²x(t) adalah turunan kedua kurva sebagai ukuran kekasaran (*roughness*). Penalti ini memastikan kurva yang dihasilkan halus dan tidak overfit terhadap noise pengukuran.

**Referensi:**
- Ramsay, J.O. & Silverman, B.W. (2005). *Functional Data Analysis* (2nd ed.). Springer-Verlag, New York.
- Eilers, P.H.C. & Marx, B.D. (1996). Flexible smoothing with B-splines and penalties. *Statistical Science*, 11(2), 89–121.

### 3.2 Functional Principal Component Analysis (FPCA)

Setelah semua kurva pasien di-*smooth*, dilakukan **FPCA** untuk mengekstrak 2 komponen utama yang menangkap variasi terbesar dalam pola pemulihan ROM. Skor individu diperoleh melalui inner product fungsional antara kurva yang sudah dicentering dengan fungsi komponen utama ψ₁(t) dan ψ₂(t):

fᵢ₁ = ⟨xᵢ(t) − μ(t), ψ₁(t)⟩ = ∫ [xᵢ(t) − μ(t)] ψ₁(t) dt

fᵢ₂ = ⟨xᵢ(t) − μ(t), ψ₂(t)⟩ = ∫ [xᵢ(t) − μ(t)] ψ₂(t) dt

Skor FPC menangkap informasi:
- **FPC₁**: Kecepatan rata-rata peningkatan ROM (level umum perbaikan)
- **FPC₂**: Pola non-linear (awal cepat vs lambat, adanya *plateau*, dll.)

Kedua skor ini kemudian distandarisasi (z-score) sebelum dimasukkan ke model survival.

**Referensi:**
- Müller, H.-G. (2008). Functional modeling of longitudinal data. *Longitudinal Data Analysis*, 223–252. CRC Press.
- Yao, F., Müller, H.-G., & Wang, J.-L. (2005). Functional data analysis for sparse longitudinal data. *Journal of the American Statistical Association*, 100(470), 577–590.
- Ramsay, J.O. & Dalzell, C.J. (1991). Some tools for functional data analysis. *Journal of the Royal Statistical Society: Series B*, 53(3), 539–561.

---

## Metode 4 — Prediksi Pemulihan: Bayesian Weibull Survival Analysis

### 4.1 Model Survival Weibull

Waktu pemulihan fungsional T dimodelkan menggunakan **distribusi Weibull** dalam kerangka *Accelerated Failure Time* (AFT). Parameter skala λᵢ diasumsikan bervariasi antar pasien sebagai fungsi kovariat klinis dan fungsional:

T ~ Weibull(shape = α, scale = λᵢ)

log(λᵢ) = β₀ + β₁·Usia + β₂·Hemoragik + β₃·Konsentrasi + β₄·OnsetHari + β₅·FPC₁ + β₆·FPC₂ + γⱼ·JenisSendi

Fungsi hazard: h(t) = (α/λ) × (t/λ)^(α−1)

Fungsi survival: S(t) = exp(−(t/λ)^α)

**Kovariat model:**

| Variabel | Deskripsi | Standarisasi |
|----------|-----------|--------------|
| Usia | Usia pasien (tahun) | (x − 58) / 11 |
| Hemoragik | Jenis stroke (dummy) | 0 / 1 |
| Konsentrasi | Kualitas sesi (validFrames/totalFrames) | (x − 0.78) / 0.1 |
| Hari Onset | Hari sejak stroke hingga mulai terapi | (x − 28) / 14 |
| FPC₁ | Skor komponen fungsional 1 | z-score |
| FPC₂ | Skor komponen fungsional 2 | z-score |
| Jenis Sendi | Efek spesifik per sendi | Bahu, Siku, Lutut, dll. |

### 4.2 Estimasi Bayesian via MCMC (Stan/brms)

Parameter diestimasi secara Bayesian menggunakan **Hamiltonian Monte Carlo** (HMC) melalui paket `brms` yang berjalan di atas Stan. Konfigurasi: 4 rantai Markov, 4000 iterasi total, 2000 warmup. Prior yang digunakan: Normal(0, 2.5) untuk koefisien regresi dan Exponential(1) untuk parameter shape Weibull.

### 4.3 Prediksi Dinamis

Prediksi dilakukan secara **dinamis** menggunakan data sesi terkini. Untuk pasien dengan sesi kurang dari 30, sesi yang belum terjadi diisi menggunakan pendekatan LOCF (*Last Observation Carried Forward*).

Median waktu pulih dihitung dari distribusi posterior:

t_med = λ × [ (t₀/λ)^α − log(0.5) ]^(1/α)

Probabilitas pulih dalam 90 hari dihitung sebagai probabilitas bersyarat:

P(T ≤ 90 | T > t₀) = 1 − S(90) / S(t₀)

Interval kepercayaan 95% diperoleh dari kuantil distribusi posterior penuh (4000 sampel MCMC), sehingga ketidakpastian estimasi terpropagasikan secara penuh ke dalam prediksi.

**Referensi:**
- Bürkner, P.-C. (2017). brms: An R Package for Bayesian Multilevel Models Using Stan. *Journal of Statistical Software*, 80(1), 1–28.
- Stan Development Team (2024). *Stan Modeling Language Users Guide and Reference Manual*. https://mc-stan.org
- Ibrahim, J.G., Chen, M.-H., & Sinha, D. (2001). *Bayesian Survival Analysis*. Springer-Verlag, New York.
- Gelman, A., Carlin, J.B., Stern, H.S., et al. (2013). *Bayesian Data Analysis* (3rd ed.). CRC Press.
- Rizopoulos, D. (2012). *Joint Models for Longitudinal and Time-to-Event Data*. CRC Press.

---

## Metode 5 — AI Chatbot Kontekstual (Gemini)

Chatbot menggunakan **Google Gemini 2.5 Flash** dengan konteks klinis pasien yang diinjeksikan secara otomatis ke setiap prompt. Pendekatan ini disebut *context-augmented generation* — model bahasa besar diberi data spesifik pasien sehingga responnya relevan secara klinis dan personal.

**Konteks yang dikirim ke model setiap percakapan:**
- Profil pasien: usia, jenis stroke, sisi tubuh yang terdampak
- Statistik agregat: total sesi, ROM terbaik per jenis latihan, streak hari berturut-turut
- 5 sesi terbaru: tanggal, ROM maksimum, durasi, jumlah repetisi

Sistem prompt menegaskan peran sebagai asisten rehabilitasi yang memberikan saran berbasis data tanpa menggantikan tenaga medis profesional.

**Referensi:**
- Team, G., Anil, R., Borgeaud, S., et al. (2024). *Gemini: A Family of Highly Capable Multimodal Models*. arXiv:2312.11805.

---

## Pipeline Data Lengkap

**Tahap Pengumpulan Data:**
Kamera perangkat → MediaPipe (33 landmark tubuh / 21 landmark tangan) → Kalkulasi sudut dot product → Array sampel ROM setiap 100ms → Penghitungan repetisi via state machine → Sesi tersimpan dengan atribut: ROM maksimum, ROM rata-rata, jumlah frame valid, durasi sesi → Firebase Firestore

**Tahap Prediksi Pemulihan:**
Sesi diambil berdasarkan jenis sendi → Diurutkan kronologis → Array ROM maksimum per sesi (romHistory) → Pemulusan B-spline (K=12, λ=10^1.5) → Proyeksi FPCA → Skor FPC₁ dan FPC₂ terstandarisasi → Digabung dengan data klinis pasien (usia, jenis stroke, hari onset, skor konsentrasi) → Model Bayesian Weibull AFT (4000 sampel MCMC) → Output: median hari pulih, CI 95%, probabilitas pulih dalam 90 hari

---

## Referensi Lengkap

1. Bazarevsky, V., Grishchenko, I., Raveendran, K., Zhu, T., Zhang, F., & Grundmann, M. (2020). BlazePose: On-device Real-time Body Pose Tracking. *arXiv:2006.10204*.
2. Bürkner, P.-C. (2017). brms: An R Package for Bayesian Multilevel Models Using Stan. *Journal of Statistical Software*, 80(1), 1–28.
3. Eilers, P.H.C. & Marx, B.D. (1996). Flexible smoothing with B-splines and penalties. *Statistical Science*, 11(2), 89–121.
4. Gelman, A., Carlin, J.B., Stern, H.S., Dunson, D.B., Vehtari, A., & Rubin, D.B. (2013). *Bayesian Data Analysis* (3rd ed.). CRC Press.
5. Ibrahim, J.G., Chen, M.-H., & Sinha, D. (2001). *Bayesian Survival Analysis*. Springer-Verlag, New York.
6. Kolber, M.J. & Hanney, W.J. (2012). The reliability and concurrent validity of shoulder mobility measurements using a digital inclinometer and goniometer. *Physiotherapy Theory and Practice*, 28(7), 543–552.
7. Lugaresi, C., Tang, J., Nash, H., et al. (2019). MediaPipe: A Framework for Building Perception Pipelines. *arXiv:1906.08172*.
8. Müller, H.-G. (2008). Functional modeling of longitudinal data. In *Longitudinal Data Analysis* (pp. 223–252). CRC Press.
9. Norkin, C.C. & White, D.J. (2016). *Measurement of Joint Motion: A Guide to Goniometry* (5th ed.). F.A. Davis Company.
10. Ramsay, J.O. & Dalzell, C.J. (1991). Some tools for functional data analysis. *Journal of the Royal Statistical Society: Series B*, 53(3), 539–561.
11. Ramsay, J.O. & Silverman, B.W. (2005). *Functional Data Analysis* (2nd ed.). Springer-Verlag, New York.
12. Rizopoulos, D. (2012). *Joint Models for Longitudinal and Time-to-Event Data*. CRC Press.
13. Stan Development Team (2024). *Stan Modeling Language Users Guide and Reference Manual*. https://mc-stan.org
14. Team, G., Anil, R., Borgeaud, S., et al. (2024). Gemini: A Family of Highly Capable Multimodal Models. *arXiv:2312.11805*.
15. Yao, F., Müller, H.-G., & Wang, J.-L. (2005). Functional data analysis for sparse longitudinal data. *Journal of the American Statistical Association*, 100(470), 577–590.
16. Zhang, F., Bazarevsky, V., Vakunov, A., et al. (2020). MediaPipe Hands: On-device Real-time Hand Tracking. *arXiv:2006.10214*.

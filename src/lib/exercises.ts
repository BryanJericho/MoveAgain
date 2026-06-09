export type ExerciseMode = 'body' | 'hand'

export interface ExerciseConfig {
  id: string
  name: string
  nameShort: string
  mode: ExerciseMode
  landmarks: [number, number, number]
  normalRange: [number, number]
  jointTarget: string
  description: string
  instruction: string
  affectedSide?: 'left' | 'right'
  positionHint: string      // satu kalimat posisi tubuh
  steps: string[]           // langkah-langkah bernomor
  cameraTips: string[]      // tips kamera spesifik
  commonMistakes: string[]  // kesalahan umum yang perlu dihindari
}

export const BODY_EXERCISES: ExerciseConfig[] = [
  {
    id: 'elbow_flex_right',
    name: 'Fleksi/Ekstensi Siku Kanan',
    nameShort: 'Siku Kanan',
    mode: 'body',
    landmarks: [12, 14, 16],
    normalRange: [0, 145],
    jointTarget: 'elbow_right',
    description: 'Mengukur kemampuan menekuk dan meluruskan siku kanan',
    instruction: 'Tekuk siku secara perlahan hingga maksimal, lalu luruskan kembali',
    affectedSide: 'right',
    positionHint: 'Berdiri atau duduk, sisi kanan menghadap kamera',
    steps: [
      'Berdiri atau duduk tegak dengan lengan lurus ke bawah',
      'Tekuk siku ke atas secara perlahan — telapak tangan boleh menghadap ke atas',
      'Tahan 1–2 detik di tekukan maksimal',
      'Turunkan lengan kembali ke posisi lurus',
      'Ulangi dengan ritme yang nyaman',
    ],
    cameraTips: [
      'Posisikan kamera setinggi pinggang di sisi kanan Anda',
      'Pastikan seluruh lengan (bahu sampai pergelangan) terlihat penuh',
      'Jarak ideal 1–1,5 meter dari tubuh',
    ],
    commonMistakes: [
      'Jangan ikut memutar bahu saat menekuk siku',
      'Jangan gerakkan pergelangan tangan secara terpisah',
      'Hindari gerakan terlalu cepat — kontrol lebih penting dari kecepatan',
    ],
  },
  {
    id: 'elbow_flex_left',
    name: 'Fleksi/Ekstensi Siku Kiri',
    nameShort: 'Siku Kiri',
    mode: 'body',
    landmarks: [11, 13, 15],
    normalRange: [0, 145],
    jointTarget: 'elbow_left',
    description: 'Mengukur kemampuan menekuk dan meluruskan siku kiri',
    instruction: 'Tekuk siku secara perlahan hingga maksimal, lalu luruskan kembali',
    affectedSide: 'left',
    positionHint: 'Berdiri atau duduk, sisi kiri menghadap kamera',
    steps: [
      'Berdiri atau duduk tegak dengan lengan lurus ke bawah',
      'Tekuk siku ke atas secara perlahan — telapak tangan boleh menghadap ke atas',
      'Tahan 1–2 detik di tekukan maksimal',
      'Turunkan lengan kembali ke posisi lurus',
      'Ulangi dengan ritme yang nyaman',
    ],
    cameraTips: [
      'Posisikan kamera setinggi pinggang di sisi kiri Anda',
      'Pastikan seluruh lengan (bahu sampai pergelangan) terlihat penuh',
      'Jarak ideal 1–1,5 meter dari tubuh',
    ],
    commonMistakes: [
      'Jangan ikut memutar bahu saat menekuk siku',
      'Jangan gerakkan pergelangan tangan secara terpisah',
      'Hindari gerakan terlalu cepat — kontrol lebih penting dari kecepatan',
    ],
  },
  {
    id: 'shoulder_abd_right',
    name: 'Abduksi Bahu Kanan',
    nameShort: 'Bahu Kanan',
    mode: 'body',
    landmarks: [24, 12, 14],
    normalRange: [0, 180],
    jointTarget: 'shoulder_right',
    description: 'Mengukur kemampuan mengangkat lengan ke samping',
    instruction: 'Angkat lengan ke samping secara perlahan setinggi mungkin',
    affectedSide: 'right',
    positionHint: 'Berdiri tegak menghadap kamera, kedua kaki selebar bahu',
    steps: [
      'Berdiri tegak, kedua lengan lurus di samping tubuh',
      'Angkat lengan kanan ke samping dengan siku tetap lurus',
      'Angkat setinggi mungkin tanpa rasa sakit',
      'Tahan 1–2 detik di posisi tertinggi',
      'Turunkan lengan kembali perlahan',
    ],
    cameraTips: [
      'Kamera dari depan tubuh, jarak 1,5–2 meter',
      'Seluruh tubuh dari kepala hingga pinggang harus terlihat',
      'Pastikan area samping kanan tidak terpotong frame',
    ],
    commonMistakes: [
      'Jangan condongkan badan ke sisi kiri saat mengangkat lengan',
      'Jangan angkat bahu atau leher ikut naik',
      'Jangan tekuk siku saat mengangkat — lengan harus lurus',
    ],
  },
  {
    id: 'shoulder_abd_left',
    name: 'Abduksi Bahu Kiri',
    nameShort: 'Bahu Kiri',
    mode: 'body',
    landmarks: [23, 11, 13],
    normalRange: [0, 180],
    jointTarget: 'shoulder_left',
    description: 'Mengukur kemampuan mengangkat lengan kiri ke samping',
    instruction: 'Angkat lengan ke samping secara perlahan setinggi mungkin',
    affectedSide: 'left',
    positionHint: 'Berdiri tegak menghadap kamera, kedua kaki selebar bahu',
    steps: [
      'Berdiri tegak, kedua lengan lurus di samping tubuh',
      'Angkat lengan kiri ke samping dengan siku tetap lurus',
      'Angkat setinggi mungkin tanpa rasa sakit',
      'Tahan 1–2 detik di posisi tertinggi',
      'Turunkan lengan kembali perlahan',
    ],
    cameraTips: [
      'Kamera dari depan tubuh, jarak 1,5–2 meter',
      'Seluruh tubuh dari kepala hingga pinggang harus terlihat',
      'Pastikan area samping kiri tidak terpotong frame',
    ],
    commonMistakes: [
      'Jangan condongkan badan ke sisi kanan saat mengangkat lengan',
      'Jangan angkat bahu atau leher ikut naik',
      'Jangan tekuk siku saat mengangkat — lengan harus lurus',
    ],
  },
  {
    id: 'knee_flex_right',
    name: 'Fleksi Lutut Kanan',
    nameShort: 'Lutut Kanan',
    mode: 'body',
    landmarks: [24, 26, 28],
    normalRange: [0, 135],
    jointTarget: 'knee_right',
    description: 'Mengukur kemampuan menekuk lutut kanan',
    instruction: 'Tekuk lutut secara perlahan dari posisi berdiri atau berbaring',
    affectedSide: 'right',
    positionHint: 'Duduk di ujung kursi, sisi kanan menghadap kamera',
    steps: [
      'Duduk di ujung kursi dengan punggung tegak',
      'Luruskan kaki kanan ke depan (posisi awal)',
      'Tekuk lutut ke bawah secara perlahan',
      'Tahan 1–2 detik di tekukan terdalam',
      'Luruskan kembali ke posisi awal',
    ],
    cameraTips: [
      'Kamera dari sisi kanan tubuh, jarak 1–1,5 meter',
      'Seluruh kaki dari paha hingga telapak harus terlihat',
      'Ketinggian kamera setinggi lutut',
    ],
    commonMistakes: [
      'Jangan angkat paha dari permukaan kursi saat menekuk',
      'Jangan putar pinggul ke samping',
      'Pastikan kaki tidak tersembunyi di bawah kursi',
    ],
  },
  {
    id: 'knee_flex_left',
    name: 'Fleksi Lutut Kiri',
    nameShort: 'Lutut Kiri',
    mode: 'body',
    landmarks: [23, 25, 27],
    normalRange: [0, 135],
    jointTarget: 'knee_left',
    description: 'Mengukur kemampuan menekuk lutut kiri',
    instruction: 'Tekuk lutut secara perlahan dari posisi berdiri atau berbaring',
    affectedSide: 'left',
    positionHint: 'Duduk di ujung kursi, sisi kiri menghadap kamera',
    steps: [
      'Duduk di ujung kursi dengan punggung tegak',
      'Luruskan kaki kiri ke depan (posisi awal)',
      'Tekuk lutut ke bawah secara perlahan',
      'Tahan 1–2 detik di tekukan terdalam',
      'Luruskan kembali ke posisi awal',
    ],
    cameraTips: [
      'Kamera dari sisi kiri tubuh, jarak 1–1,5 meter',
      'Seluruh kaki dari paha hingga telapak harus terlihat',
      'Ketinggian kamera setinggi lutut',
    ],
    commonMistakes: [
      'Jangan angkat paha dari permukaan kursi saat menekuk',
      'Jangan putar pinggul ke samping',
      'Pastikan kaki tidak tersembunyi di bawah kursi',
    ],
  },
  {
    id: 'ankle_dorsi_right',
    name: 'Dorsifleksi Ankle Kanan',
    nameShort: 'Ankle Kanan',
    mode: 'body',
    landmarks: [26, 28, 32],
    normalRange: [0, 20],
    jointTarget: 'ankle_right',
    description: 'Mengukur kemampuan menekuk kaki ke atas (dorsifleksi)',
    instruction: 'Tarik ujung kaki ke atas secara perlahan',
    affectedSide: 'right',
    positionHint: 'Duduk di kursi dengan kaki menggantung bebas',
    steps: [
      'Duduk di kursi dengan kaki kanan menggantung, tidak menyentuh lantai',
      'Rilekskan kaki dalam posisi netral (menggantung lurus)',
      'Tarik ujung kaki ke atas sejauh mungkin (seperti menginjak gas)',
      'Tahan 1–2 detik di atas',
      'Turunkan kembali ke posisi rileks',
    ],
    cameraTips: [
      'Kamera dari sisi kanan, setinggi pergelangan kaki',
      'Pastikan tungkai bawah (lutut hingga ujung kaki) terlihat penuh',
      'Jarak 50–80 cm dari kaki',
    ],
    commonMistakes: [
      'Jangan ikut gerakkan lutut ke atas',
      'Jangan putar kaki ke luar atau ke dalam — gerak hanya atas-bawah',
      'Jangan angkat seluruh kaki dari posisi duduk',
    ],
  },
]

// MediaPipe Hand landmark indices
// 0: WRIST, 1-4: THUMB, 5-8: INDEX, 9-12: MIDDLE, 13-16: RING, 17-20: PINKY
export const HAND_EXERCISES: ExerciseConfig[] = [
  {
    id: 'index_pip',
    name: 'Fleksi Jari Telunjuk (PIP)',
    nameShort: 'Telunjuk',
    mode: 'hand',
    landmarks: [5, 6, 7],
    normalRange: [0, 100],
    jointTarget: 'index_pip',
    description: 'Mengukur fleksi sendi PIP jari telunjuk',
    instruction: 'Tekuk jari telunjuk pada sendi tengah (PIP) secara perlahan',
    positionHint: 'Letakkan tangan di depan kamera belakang HP',
    steps: [
      'Rentangkan tangan dengan semua jari lurus dan terbuka',
      'Gerakkan hanya jari telunjuk — tekuk pada sendi tengah',
      'Tahan 1–2 detik di tekukan terdalam',
      'Luruskan kembali jari telunjuk',
      'Jari lain tetap diam selama latihan',
    ],
    cameraTips: [
      'Gunakan kamera belakang HP (bukan selfie)',
      'Letakkan tangan ~30 cm di depan kamera',
      'Punggung tangan menghadap ke atas, jari mengarah ke kamera',
      'Pastikan seluruh jari terlihat dalam frame',
    ],
    commonMistakes: [
      'Jangan tekuk semua jari sekaligus',
      'Jangan gerakkan pergelangan tangan',
      'Pastikan pencahayaan cukup — hindari latar belakang terlalu terang',
    ],
  },
  {
    id: 'middle_pip',
    name: 'Fleksi Jari Tengah (PIP)',
    nameShort: 'Jari Tengah',
    mode: 'hand',
    landmarks: [9, 10, 11],
    normalRange: [0, 100],
    jointTarget: 'middle_pip',
    description: 'Mengukur fleksi sendi PIP jari tengah',
    instruction: 'Tekuk jari tengah pada sendi tengah (PIP) secara perlahan',
    positionHint: 'Letakkan tangan di depan kamera belakang HP',
    steps: [
      'Rentangkan tangan dengan semua jari lurus dan terbuka',
      'Gerakkan hanya jari tengah — tekuk pada sendi tengah',
      'Tahan 1–2 detik di tekukan terdalam',
      'Luruskan kembali jari tengah',
      'Jari lain tetap diam selama latihan',
    ],
    cameraTips: [
      'Gunakan kamera belakang HP (bukan selfie)',
      'Letakkan tangan ~30 cm di depan kamera',
      'Punggung tangan menghadap ke atas, jari mengarah ke kamera',
    ],
    commonMistakes: [
      'Jangan tekuk semua jari sekaligus',
      'Jangan gerakkan pergelangan tangan',
      'Hindari bayangan yang menutupi jari',
    ],
  },
  {
    id: 'ring_pip',
    name: 'Fleksi Jari Manis (PIP)',
    nameShort: 'Jari Manis',
    mode: 'hand',
    landmarks: [13, 14, 15],
    normalRange: [0, 100],
    jointTarget: 'ring_pip',
    description: 'Mengukur fleksi sendi PIP jari manis',
    instruction: 'Tekuk jari manis pada sendi tengah secara perlahan',
    positionHint: 'Letakkan tangan di depan kamera belakang HP',
    steps: [
      'Rentangkan tangan dengan semua jari lurus',
      'Tekuk hanya jari manis pada sendi tengah',
      'Tahan 1–2 detik di tekukan terdalam',
      'Luruskan kembali',
    ],
    cameraTips: [
      'Gunakan kamera belakang HP (bukan selfie)',
      'Letakkan tangan ~30 cm di depan kamera',
      'Punggung tangan menghadap ke atas',
    ],
    commonMistakes: [
      'Jangan tekuk kelingking sekaligus',
      'Jangan gerakkan pergelangan tangan',
    ],
  },
  {
    id: 'pinky_pip',
    name: 'Fleksi Kelingking (PIP)',
    nameShort: 'Kelingking',
    mode: 'hand',
    landmarks: [17, 18, 19],
    normalRange: [0, 100],
    jointTarget: 'pinky_pip',
    description: 'Mengukur fleksi sendi PIP jari kelingking',
    instruction: 'Tekuk kelingking pada sendi tengah secara perlahan',
    positionHint: 'Letakkan tangan di depan kamera belakang HP',
    steps: [
      'Rentangkan tangan dengan semua jari lurus',
      'Tekuk hanya kelingking pada sendi tengah',
      'Tahan 1–2 detik di tekukan terdalam',
      'Luruskan kembali',
    ],
    cameraTips: [
      'Gunakan kamera belakang HP (bukan selfie)',
      'Letakkan tangan ~30 cm di depan kamera',
      'Arahkan sisi kelingking sedikit ke kamera agar lebih terlihat',
    ],
    commonMistakes: [
      'Jangan tekuk jari manis sekaligus',
      'Kelingking lebih pendek — pastikan cukup dekat dengan kamera',
    ],
  },
  {
    id: 'thumb_ip',
    name: 'Fleksi Ibu Jari (IP)',
    nameShort: 'Ibu Jari',
    mode: 'hand',
    landmarks: [2, 3, 4],
    normalRange: [0, 80],
    jointTarget: 'thumb_ip',
    description: 'Mengukur fleksi sendi IP ibu jari',
    instruction: 'Tekuk ibu jari pada sendi tengah secara perlahan',
    positionHint: 'Letakkan tangan di depan kamera belakang HP',
    steps: [
      'Rentangkan tangan, arahkan ibu jari ke atas',
      'Tekuk ujung ibu jari ke bawah pada sendi tengah (sendi IP)',
      'Tahan 1–2 detik',
      'Luruskan kembali',
    ],
    cameraTips: [
      'Gunakan kamera belakang HP',
      'Arahkan ibu jari langsung ke kamera agar sendi IP terlihat jelas',
      'Jarak ~20–25 cm dari kamera',
    ],
    commonMistakes: [
      'Jangan tekuk pada sendi pangkal (MCP) — hanya ujung ibu jari yang bergerak',
      'Jangan putar ibu jari ke samping',
    ],
  },
  {
    id: 'index_mcp',
    name: 'Fleksi Jari Telunjuk (MCP)',
    nameShort: 'MCP Telunjuk',
    mode: 'hand',
    landmarks: [0, 5, 6],
    normalRange: [0, 90],
    jointTarget: 'index_mcp',
    description: 'Mengukur fleksi sendi MCP jari telunjuk (buku jari)',
    instruction: 'Tekuk buku jari pertama jari telunjuk secara perlahan',
    positionHint: 'Letakkan tangan di depan kamera belakang HP',
    steps: [
      'Rentangkan tangan rata dengan jari lurus',
      'Tekuk jari telunjuk ke bawah mulai dari buku jari pertama (pangkal)',
      'Tahan 1–2 detik di tekukan terdalam',
      'Luruskan kembali',
    ],
    cameraTips: [
      'Gunakan kamera belakang HP',
      'Sisi samping tangan menghadap kamera agar sendi MCP terlihat',
      'Jarak ~25–30 cm dari kamera',
    ],
    commonMistakes: [
      'Jangan hanya tekuk ujung jari — buku jari pangkal yang harus menekuk',
      'Jangan gerakkan pergelangan tangan',
    ],
  },
]

export const ALL_EXERCISES = [...BODY_EXERCISES, ...HAND_EXERCISES]

export function getExerciseById(id: string): ExerciseConfig | undefined {
  return ALL_EXERCISES.find(e => e.id === id)
}

export function getExercisesByMode(mode: ExerciseMode): ExerciseConfig[] {
  return ALL_EXERCISES.filter(e => e.mode === mode)
}

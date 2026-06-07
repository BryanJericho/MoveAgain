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
    affectedSide: 'right'
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
    affectedSide: 'left'
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
    affectedSide: 'right'
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
    affectedSide: 'left'
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
    affectedSide: 'right'
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
    affectedSide: 'left'
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
    affectedSide: 'right'
  }
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
    instruction: 'Tekuk jari telunjuk pada sendi tengah (PIP) secara perlahan'
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
    instruction: 'Tekuk jari tengah pada sendi tengah (PIP) secara perlahan'
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
    instruction: 'Tekuk jari manis pada sendi tengah secara perlahan'
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
    instruction: 'Tekuk kelingking pada sendi tengah secara perlahan'
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
    instruction: 'Tekuk ibu jari pada sendi tengah secara perlahan'
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
    instruction: 'Tekuk buku jari pertama jari telunjuk secara perlahan'
  }
]

export const ALL_EXERCISES = [...BODY_EXERCISES, ...HAND_EXERCISES]

export function getExerciseById(id: string): ExerciseConfig | undefined {
  return ALL_EXERCISES.find(e => e.id === id)
}

export function getExercisesByMode(mode: ExerciseMode): ExerciseConfig[] {
  return ALL_EXERCISES.filter(e => e.mode === mode)
}

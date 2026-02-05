// Centralized animation timing/easing — calibrated to "Aman Dawnflow" ambient tempo
// Slow-blooming, meditative, warm. Like fog lifting off a still lake at dawn.

export const ease = {
  /** Page enter / exit — slow bloom, organic deceleration */
  page: [0.16, 1, 0.3, 1] as const,
  /** Card expand/collapse — standard smooth */
  card: [0.25, 0.1, 0.25, 1] as const,
  /** Score bar fill — slow start, confident finish */
  score: [0.33, 0, 0.2, 1] as const,
}

export const duration = {
  /** Page fade-in + drift */
  page: 0.7,
  /** Card expand/collapse */
  card: 0.35,
  /** Score bar fill */
  score: 0.9,
  /** Hover effects */
  hover: 0.25,
  /** Micro-interactions (tap scale) */
  micro: 0.2,
  /** Feedback step transitions */
  feedback: 0.3,
  /** Login card entrance */
  login: 0.8,
}

export const stagger = {
  /** Default item stagger */
  items: 0.1,
  /** Score bar cascade */
  scoreBars: 0.08,
  /** Initial delay before stagger begins */
  initialDelay: 0.15,
  /** Onboard step stagger */
  steps: 0.12,
  /** Score bar delay after card expand */
  scoreDelay: 0.2,
}

export const drift = {
  /** Page enter upward drift */
  page: 12,
  /** Stagger item drift */
  item: 8,
  /** Login card drift */
  login: 16,
  /** Feedback step drift */
  feedback: 4,
}

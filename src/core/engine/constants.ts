/** Every tunable in one place, so the model can be adjusted from your own
 *  training data without hunting through the engine. See docs/data-model.md §7 */

import type { MuscleId } from '../taxonomy/muscles'

export const FATIGUE = {
  /** Sets closer to failure cost more recovery per rep: exp(-k · RIR). */
  effortDecayPerRir: 0.25,
  /** Assumed RIR when the user did not log one. Deliberately conservative — it
   *  under-counts fatigue rather than inventing it. */
  assumedRir: 2,
  /** How many half-lives back to bother summing. 2^-6 is under 2%. */
  halfLivesConsidered: 6,
  /** Days of history used to calibrate personal capacity. */
  capacityWindowDays: 28,
  /** Capacity is the mean of the N largest daily peaks in that window, so one
   *  freak session does not permanently rescale the muscle. */
  capacityPeakCount: 3,
  /** Below this, capacity is treated as unknown and freshness reads 1. */
  capacityFloor: 1e-6,
} as const

export const PROGRESSION = {
  /** Epley. Above this many reps-to-failure the estimate is too noisy to use. */
  maxRepsToFailureForE1rm: 15,
  /** EMA weight on a new session's estimate. */
  smoothing: 0.35,
  /** Consecutive non-improving sessions before a deload. */
  stallsBeforeDeload: 3,
  /** Fraction of working weight dropped on a deload. */
  deloadFraction: 0.1,
  /** A new variant starts here relative to a sibling's working weight, rather
   *  than from an empty bar. */
  siblingSeedFraction: 0.85,
  /** A session counts as progress if e1RM rises by at least this fraction. */
  progressThreshold: 0.005,
  /** Beating the top of the rep range by this much means the weight is wrong,
   *  not that you earned one increment. */
  calibrationOvershoot: 3,
  /** Ceiling on a single calibration jump, as a multiple of current load. */
  maxCalibrationJump: 2.0,
} as const

export const GENERATION = {
  /** Muscles below this freshness are avoided rather than trained. */
  freshnessFloor: 0.35,
  /** Penalty for repeating a movement trained within this many days. */
  recentMovementDays: 4,
  recentMovementPenalty: 0.55,
  /** Session budgets. Systemic is whole-body cost, axial is spinal loading. */
  systemicBudget: 2.6,
  axialBudget: 2.0,
  /** Rough minutes per working set including rest, for the time budget. */
  minutesPerSet: 3.2,
  /** Score penalty per non-default axis value, so the plain version of a
   *  movement wins unless a variant is genuinely better for today. */
  configurationPenalty: 0.12,
  /** Bonus for a variant already in the lifter's history. Progression is
   *  per-variant, so without continuity nothing accumulates sessions. */
  familiarityBonus: 1.35,
  /** Stop once the best remaining pick scores below this fraction of the
   *  session's first pick. Scale-free, and it stops the generator padding a
   *  workout with exercises that satisfy almost nothing. */
  minRelativeScore: 0.15,
} as const

/** Default weekly working sets per unit.
 *
 *  Most units are zero on purpose. A 46-unit vocabulary is a vocabulary, not a
 *  prescription: the rehab and accessory tail (deep hip rotators, the ankle
 *  units, neck, subscapularis) only gets programmed when the user opts in or an
 *  injury flag turns it on. Otherwise every session would be a scavenger hunt. */
export const DEFAULT_WEEKLY_TARGETS: Partial<Record<MuscleId, number>> = {
  pec_upper: 6, pec_mid: 8, pec_lower: 4,
  lats: 10, traps_upper: 4, traps_mid: 8, traps_lower: 4, rhomboids: 6, erectors: 6,
  delt_front: 4, delt_lateral: 10, delt_rear: 8,
  supraspinatus: 0, cuff_ext_rotators: 4, subscapularis: 0,
  biceps_long: 6, biceps_short: 6, brachialis: 4, brachioradialis: 2,
  triceps_long: 6, triceps_lateral: 6, triceps_medial: 4,
  forearm_flexors: 2, forearm_extensors: 0,
  quads_vasti: 10, quads_rf: 6,
  hams_lateral: 8, hams_medial: 8,
  glute_max: 10, glute_med_min: 4, hip_ext_rotators: 0,
  adductors: 2, adductor_magnus: 4, hip_flexors: 2,
  calves_gastroc: 8, calves_soleus: 6,
  tibialis_ant: 0, ankle_evertors: 0, ankle_invertors: 0, toe_flexors: 0,
  rectus_abdominis: 6, obliques: 4, quadratus_lumborum: 2, deep_core: 4,
  neck_flexors: 0, neck_extensors: 0,
}

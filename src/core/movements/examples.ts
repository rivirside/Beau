/** Worked examples proving the model expresses the cases that motivated it.
 *  These are hand-authored `curated` movements; the shape here is what the
 *  remaining ~120 core movements should follow. */

import type { Movement } from '../types'

export const EXAMPLE_MOVEMENTS: Movement[] = [
  {
    // The motivating case: one movement, three pulley heights, three different
    // chest emphases — expressed as data instead of three unrelated name strings.
    id: 'cable_fly',
    name: 'Cable Fly',
    pattern: 'horizontal_press',
    equipmentTypeIds: ['cable_tower'],
    baseContributions: {
      pec_mid: 1.0, pec_lower: 0.6, pec_upper: 0.45,
      delt_front: 0.3, biceps_short: 0.1,
    },
    axes: [
      {
        axis: 'pulley_height',
        values: ['low', 'mid', 'high'],
        default: 'mid',
        modifiers: {
          high: { pec_lower: 1.5, pec_upper: 0.5 },  // high-to-low → lower pec
          low:  { pec_upper: 1.6, pec_lower: 0.5 },  // low-to-high → upper pec
        },
      },
      { axis: 'attachment', values: ['d_handle', 'single_d'], default: 'd_handle' },
      { axis: 'laterality', values: ['bilateral', 'unilateral'], default: 'bilateral' },
    ],
    systemicLoad: 0.15,
    axialLoad: 0.05,
    source: 'curated',
  },
  {
    // Bench angle does to the dumbbell press what pulley height does to the fly.
    id: 'db_bench_press',
    name: 'Dumbbell Bench Press',
    pattern: 'horizontal_press',
    equipmentTypeIds: ['dumbbell', 'adjustable_bench'],
    baseContributions: {
      pec_mid: 1.0, pec_lower: 0.55, pec_upper: 0.5,
      delt_front: 0.55, triceps_lateral: 0.5, triceps_medial: 0.45, triceps_long: 0.3,
    },
    axes: [
      {
        axis: 'bench_angle',
        values: ['decline', 'flat', 'incline_low', 'incline_high'],
        default: 'flat',
        modifiers: {
          decline:      { pec_lower: 1.5, pec_upper: 0.4, delt_front: 0.6 },
          incline_low:  { pec_upper: 1.6, pec_lower: 0.6, delt_front: 1.2 },
          incline_high: { pec_upper: 1.8, pec_lower: 0.35, delt_front: 1.5, pec_mid: 0.8 },
        },
      },
      { axis: 'grip_orientation', values: ['pronated', 'neutral'], default: 'pronated',
        modifiers: { neutral: { triceps_long: 1.3, pec_upper: 1.1, delt_front: 0.9 } } },
    ],
    systemicLoad: 0.45,
    axialLoad: 0.15,
    source: 'curated',
  },
  {
    // Shoulder position decides which biceps head is stretched — the same
    // mechanism, on a different axis.
    id: 'db_curl',
    name: 'Dumbbell Curl',
    pattern: 'elbow_flexion',
    equipmentTypeIds: ['dumbbell'],
    baseContributions: {
      biceps_long: 0.9, biceps_short: 0.9, brachialis: 0.5, brachioradialis: 0.3,
      forearm_flexors: 0.2,
    },
    axes: [
      {
        axis: 'body_position',
        values: ['standing', 'seated', 'lying'],
        default: 'standing',
        modifiers: {
          // Incline/lying puts the shoulder in extension → long head stretched.
          lying: { biceps_long: 1.4, biceps_short: 0.75 },
        },
      },
      { axis: 'grip_orientation', values: ['supinated', 'neutral', 'pronated'], default: 'supinated',
        modifiers: {
          neutral:  { brachialis: 1.6, brachioradialis: 1.5, biceps_long: 0.85, biceps_short: 0.8 },
          pronated: { brachioradialis: 1.8, brachialis: 1.4, biceps_long: 0.5, biceps_short: 0.45,
                      forearm_extensors: 1.5 },
        } },
      { axis: 'laterality', values: ['bilateral', 'alternating', 'unilateral'], default: 'bilateral' },
    ],
    systemicLoad: 0.12,
    axialLoad: 0.05,
    source: 'curated',
  },
  {
    // Bodyweight loading: needs a leverage factor for volume math to mean
    // anything, and can be both assisted and weighted.
    id: 'pull_up',
    name: 'Pull-Up',
    pattern: 'vertical_pull',
    equipmentTypeIds: ['pull_up_bar'],
    baseContributions: {
      lats: 1.0, teres_major: 0.6, biceps_long: 0.5, biceps_short: 0.45,
      brachialis: 0.4, rhomboids: 0.4, traps_lower: 0.4, traps_mid: 0.3,
      delt_rear: 0.25, forearm_flexors: 0.3, rectus_abdominis: 0.2,
    },
    axes: [
      { axis: 'grip_orientation', values: ['pronated', 'supinated', 'neutral'], default: 'pronated',
        modifiers: {
          supinated: { biceps_long: 1.5, biceps_short: 1.4, lats: 0.9, teres_major: 0.85 },
          neutral:   { brachialis: 1.4, biceps_long: 1.2 },
        } },
      { axis: 'grip_width', values: ['narrow', 'shoulder', 'wide'], default: 'shoulder',
        modifiers: {
          wide:   { lats: 1.1, teres_major: 1.15, biceps_long: 0.7, biceps_short: 0.65 },
          narrow: { biceps_long: 1.2, lats: 0.9 },
        } },
    ],
    bodyweightFactor: 0.95,
    systemicLoad: 0.4,
    axialLoad: 0.05,
    source: 'curated',
  },
]

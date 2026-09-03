import type { Movement } from '../types'
import { mv, ax } from './helpers'

/** Bench angle is the axis that matters here: it redistributes work across the
 *  three heads of pectoralis major in a systematic, predictable way. */
const BENCH_ANGLE = ax('bench_angle',
  ['decline', 'flat', 'incline_low', 'incline_high'], 'flat', {
    decline:      { pec_lower: 1.5, pec_upper: 0.4, delt_front: 0.6 },
    incline_low:  { pec_upper: 1.6, pec_lower: 0.6, delt_front: 1.2 },
    incline_high: { pec_upper: 1.8, pec_lower: 0.35, delt_front: 1.5, pec_mid: 0.8 },
  })

export const CHEST_MOVEMENTS: Movement[] = [
  mv({
    id: 'barbell_bench_press', name: 'Barbell Bench Press', pattern: 'horizontal_press',
    equipmentTypeIds: ['barbell', 'adjustable_bench'],
    baseContributions: {
      pec_mid: 1.0, pec_lower: 0.55, pec_upper: 0.5, delt_front: 0.6,
      triceps_lateral: 0.55, triceps_medial: 0.5, triceps_long: 0.3, subscapularis: 0.15,
    },
    axes: [BENCH_ANGLE,
      ax('grip_width', ['narrow', 'shoulder', 'wide'], 'shoulder', {
        narrow: { triceps_lateral: 1.4, triceps_medial: 1.4, triceps_long: 1.3, pec_mid: 0.85 },
        wide:   { pec_mid: 1.15, pec_lower: 1.1, triceps_lateral: 0.7, triceps_medial: 0.7 },
      })],
    systemicLoad: 0.55, axialLoad: 0.2,
  }),
  mv({
    id: 'db_bench_press', name: 'Dumbbell Bench Press', pattern: 'horizontal_press',
    equipmentTypeIds: ['dumbbell', 'adjustable_bench'],
    baseContributions: {
      pec_mid: 1.0, pec_lower: 0.55, pec_upper: 0.5, delt_front: 0.55,
      triceps_lateral: 0.5, triceps_medial: 0.45, triceps_long: 0.3, subscapularis: 0.2,
    },
    axes: [BENCH_ANGLE,
      ax('grip_orientation', ['pronated', 'neutral'], 'pronated', {
        neutral: { triceps_long: 1.3, pec_upper: 1.1, delt_front: 0.9 },
      })],
    systemicLoad: 0.45, axialLoad: 0.15,
  }),
  mv({
    id: 'machine_chest_press', name: 'Machine Chest Press', pattern: 'horizontal_press',
    equipmentTypeIds: ['chest_press_machine'],
    baseContributions: {
      pec_mid: 1.0, pec_lower: 0.5, pec_upper: 0.45, delt_front: 0.45,
      triceps_lateral: 0.45, triceps_medial: 0.4, triceps_long: 0.25,
    },
    axes: [BENCH_ANGLE, ax('laterality', ['bilateral', 'unilateral'], 'bilateral')],
    systemicLoad: 0.3, axialLoad: 0.05,
  }),
  mv({
    id: 'cable_fly', name: 'Cable Fly', pattern: 'horizontal_press',
    equipmentTypeIds: ['cable_tower'],
    baseContributions: {
      pec_mid: 1.0, pec_lower: 0.6, pec_upper: 0.45, delt_front: 0.3, biceps_short: 0.1,
    },
    axes: [
      ax('pulley_height', ['low', 'mid', 'high'], 'mid', {
        high: { pec_lower: 1.5, pec_upper: 0.5 },
        low:  { pec_upper: 1.6, pec_lower: 0.5 },
      }),
      ax('attachment', ['d_handle', 'single_d'], 'd_handle'),
      ax('laterality', ['bilateral', 'unilateral'], 'bilateral'),
    ],
    systemicLoad: 0.15, axialLoad: 0.05,
  }),
  mv({
    id: 'db_fly', name: 'Dumbbell Fly', pattern: 'horizontal_press',
    equipmentTypeIds: ['dumbbell', 'adjustable_bench'],
    baseContributions: { pec_mid: 1.0, pec_lower: 0.55, pec_upper: 0.45, delt_front: 0.3 },
    axes: [BENCH_ANGLE],
    systemicLoad: 0.2, axialLoad: 0.05,
  }),
  mv({
    id: 'pec_deck', name: 'Pec Deck', pattern: 'horizontal_press',
    equipmentTypeIds: ['pec_deck'],
    baseContributions: { pec_mid: 1.0, pec_lower: 0.5, pec_upper: 0.4, delt_front: 0.25 },
    axes: [ax('laterality', ['bilateral', 'unilateral'], 'bilateral')],
    systemicLoad: 0.15, axialLoad: 0.02,
  }),
  mv({
    id: 'push_up', name: 'Push-Up', pattern: 'horizontal_press',
    equipmentTypeIds: ['bodyweight'],
    baseContributions: {
      pec_mid: 1.0, pec_lower: 0.5, pec_upper: 0.5, delt_front: 0.5,
      triceps_lateral: 0.5, triceps_medial: 0.45, triceps_long: 0.3,
      deep_core: 0.4, rectus_abdominis: 0.25, traps_lower: 0.3,
    },
    axes: [
      // Naming follows the muscle effect, not the furniture: "incline_high"
      // means feet elevated, which biases the upper chest exactly as an incline
      // press does. Hands elevated is the "decline" case.
      ax('bench_angle', ['decline', 'flat', 'incline_low', 'incline_high'], 'flat', {
        decline:      { pec_lower: 1.3, pec_upper: 0.7 },
        incline_low:  { pec_upper: 1.35, pec_lower: 0.75, delt_front: 1.2 },
        incline_high: { pec_upper: 1.6, pec_lower: 0.5, delt_front: 1.4 },
      }),
      ax('grip_width', ['narrow', 'shoulder', 'wide'], 'shoulder', {
        narrow: { triceps_lateral: 1.4, triceps_medial: 1.4, pec_mid: 0.85 },
        wide:   { pec_mid: 1.15, triceps_lateral: 0.7, triceps_medial: 0.7 },
      }),
    ],
    bodyweightFactor: 0.64,
    systemicLoad: 0.3, axialLoad: 0.05,
  }),
  mv({
    id: 'chest_dip', name: 'Chest Dip', pattern: 'horizontal_press',
    equipmentTypeIds: ['dip_station'],
    baseContributions: {
      pec_lower: 1.0, pec_mid: 0.8, pec_upper: 0.2, delt_front: 0.5,
      triceps_lateral: 0.6, triceps_medial: 0.55, triceps_long: 0.4, traps_lower: 0.25,
    },
    axes: [
      ax('body_position', ['standing', 'bent_over'], 'bent_over', {
        // Upright torso shifts the movement onto the triceps.
        standing: { triceps_lateral: 1.5, triceps_medial: 1.5, triceps_long: 1.4,
                    pec_lower: 0.6, pec_mid: 0.6 },
      }),
      ax('grip_width', ['narrow', 'shoulder', 'wide'], 'shoulder'),
    ],
    bodyweightFactor: 0.95,
    systemicLoad: 0.4, axialLoad: 0.05,
  }),
]

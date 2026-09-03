import type { Movement } from '../types'
import { mv, ax } from './helpers'

export const SHOULDER_MOVEMENTS: Movement[] = [
  mv({
    id: 'overhead_press', name: 'Overhead Press', pattern: 'vertical_press',
    equipmentTypeIds: ['barbell', 'squat_rack'],
    baseContributions: {
      delt_front: 1.0, delt_lateral: 0.6, triceps_lateral: 0.6, triceps_medial: 0.55,
      triceps_long: 0.4, traps_upper: 0.5, supraspinatus: 0.35, pec_upper: 0.35,
      deep_core: 0.4, erectors: 0.35, subscapularis: 0.15,
    },
    axes: [
      ax('grip_width', ['narrow', 'shoulder', 'wide'], 'shoulder'),
      ax('body_position', ['standing', 'seated'], 'standing', {
        seated: { deep_core: 0.4, erectors: 0.5, delt_front: 1.05 },
      }),
    ],
    systemicLoad: 0.5, axialLoad: 0.45,
  }),
  mv({
    id: 'db_shoulder_press', name: 'Dumbbell Shoulder Press', pattern: 'vertical_press',
    equipmentTypeIds: ['dumbbell', 'adjustable_bench'],
    baseContributions: {
      delt_front: 1.0, delt_lateral: 0.65, triceps_lateral: 0.5, triceps_medial: 0.45,
      triceps_long: 0.35, traps_upper: 0.45, supraspinatus: 0.35, pec_upper: 0.3,
      deep_core: 0.3, subscapularis: 0.15,
    },
    axes: [
      ax('grip_orientation', ['pronated', 'neutral'], 'pronated', {
        neutral: { delt_front: 1.1, delt_lateral: 0.85, triceps_long: 1.2 },
      }),
      ax('body_position', ['standing', 'seated'], 'seated'),
      ax('laterality', ['bilateral', 'unilateral', 'alternating'], 'bilateral'),
    ],
    systemicLoad: 0.4, axialLoad: 0.3,
  }),
  mv({
    id: 'machine_shoulder_press', name: 'Machine Shoulder Press', pattern: 'vertical_press',
    equipmentTypeIds: ['shoulder_press_machine'],
    baseContributions: {
      delt_front: 1.0, delt_lateral: 0.6, triceps_lateral: 0.45, triceps_medial: 0.4,
      triceps_long: 0.3, traps_upper: 0.35, supraspinatus: 0.3,
    },
    axes: [ax('laterality', ['bilateral', 'unilateral'], 'bilateral')],
    systemicLoad: 0.25, axialLoad: 0.1,
  }),
  mv({
    id: 'lateral_raise', name: 'Lateral Raise', pattern: 'shoulder_raise',
    equipmentTypeIds: ['dumbbell', 'cable_tower', 'lateral_raise_machine', 'band'],
    baseContributions: {
      delt_lateral: 1.0, supraspinatus: 0.45, delt_front: 0.3, traps_upper: 0.3,
      traps_mid: 0.15,
    },
    axes: [
      ax('body_position', ['standing', 'seated', 'bent_over'], 'standing', {
        // Leaning away lengthens the side delt and keeps tension at the bottom.
        bent_over: { delt_lateral: 1.1, delt_rear: 0.4 },
      }),
      ax('pulley_height', ['floor', 'low'], 'low'),
      ax('laterality', ['bilateral', 'unilateral'], 'bilateral'),
      ax('rom_bias', ['full', 'lengthened_partial', 'shortened_partial'], 'full', {
        lengthened_partial: { delt_lateral: 1.1, traps_upper: 0.6 },
        shortened_partial:  { traps_upper: 1.4, delt_lateral: 0.85 },
      }),
    ],
    systemicLoad: 0.12, axialLoad: 0.02,
  }),
  mv({
    id: 'front_raise', name: 'Front Raise', pattern: 'shoulder_raise',
    equipmentTypeIds: ['dumbbell', 'cable_tower', 'plate', 'band'],
    baseContributions: {
      delt_front: 1.0, pec_upper: 0.35, delt_lateral: 0.3, supraspinatus: 0.25,
      traps_upper: 0.2,
    },
    axes: [
      ax('grip_orientation', ['pronated', 'neutral'], 'neutral'),
      ax('laterality', ['bilateral', 'unilateral', 'alternating'], 'alternating'),
    ],
    systemicLoad: 0.1, axialLoad: 0.02,
  }),
  mv({
    id: 'rear_delt_fly', name: 'Rear Delt Fly', pattern: 'shoulder_raise',
    equipmentTypeIds: ['dumbbell', 'cable_tower', 'pec_deck', 'adjustable_bench'],
    baseContributions: {
      delt_rear: 1.0, traps_mid: 0.6, rhomboids: 0.5, cuff_ext_rotators: 0.35,
      traps_lower: 0.25,
    },
    axes: [
      ax('body_position', ['bent_over', 'seated', 'prone'], 'bent_over'),
      ax('laterality', ['bilateral', 'unilateral'], 'bilateral'),
    ],
    systemicLoad: 0.12, axialLoad: 0.05,
  }),
  mv({
    id: 'upright_row', name: 'Upright Row', pattern: 'shoulder_raise',
    equipmentTypeIds: ['barbell', 'ez_bar', 'cable_tower', 'dumbbell'],
    baseContributions: {
      delt_lateral: 0.9, traps_upper: 1.0, supraspinatus: 0.4, delt_front: 0.35,
      biceps_short: 0.3, brachialis: 0.3, forearm_flexors: 0.2,
    },
    axes: [
      ax('grip_width', ['narrow', 'shoulder', 'wide'], 'shoulder', {
        wide:   { delt_lateral: 1.25, traps_upper: 0.85 },
        narrow: { traps_upper: 1.2, delt_lateral: 0.8 },
      }),
    ],
    systemicLoad: 0.2, axialLoad: 0.15,
    notes: 'Narrow grips push the shoulder into internal rotation at end range; '
         + 'prefer wide, and skip it entirely for anyone with impingement history.',
  }),
  mv({
    id: 'scaption_raise', name: 'Scaption Raise', pattern: 'shoulder_raise',
    equipmentTypeIds: ['dumbbell', 'cable_tower', 'band'],
    baseContributions: {
      supraspinatus: 1.0, delt_lateral: 0.7, delt_front: 0.5, traps_lower: 0.4,
      traps_upper: 0.3, cuff_ext_rotators: 0.2,
    },
    axes: [
      ax('grip_orientation', ['neutral', 'supinated'], 'neutral'),
      ax('laterality', ['bilateral', 'unilateral'], 'bilateral'),
    ],
    systemicLoad: 0.1, axialLoad: 0.02,
    notes: 'Raising in the scapular plane (about 30° forward) is the most direct '
         + 'supraspinatus loading available without impinging it.',
  }),
  mv({
    id: 'external_rotation', name: 'Cable External Rotation', pattern: 'shoulder_rotation',
    equipmentTypeIds: ['cable_tower', 'band', 'dumbbell'],
    baseContributions: {
      cuff_ext_rotators: 1.0, delt_rear: 0.35, traps_mid: 0.2, supraspinatus: 0.15,
    },
    axes: [
      ax('pulley_height', ['low', 'mid', 'chest', 'high'], 'chest', {
        // At 90° of abduction this becomes the throwing-position drill.
        high: { cuff_ext_rotators: 1.1, delt_rear: 1.3 },
      }),
      ax('laterality', ['unilateral', 'bilateral'], 'unilateral'),
    ],
    systemicLoad: 0.08, axialLoad: 0.02,
  }),
  mv({
    id: 'internal_rotation', name: 'Cable Internal Rotation', pattern: 'shoulder_rotation',
    equipmentTypeIds: ['cable_tower', 'band'],
    baseContributions: { subscapularis: 1.0, pec_mid: 0.25, lats: 0.2 },
    axes: [
      ax('pulley_height', ['low', 'mid', 'chest'], 'chest'),
      ax('laterality', ['unilateral', 'bilateral'], 'unilateral'),
    ],
    systemicLoad: 0.08, axialLoad: 0.02,
    notes: 'The only movement here that loads subscapularis directly — the cuff '
         + 'muscle almost every programme forgets.',
  }),
  mv({
    id: 'prone_external_rotation', name: 'Prone External Rotation',
    pattern: 'shoulder_rotation',
    equipmentTypeIds: ['dumbbell', 'band', 'adjustable_bench'],
    baseContributions: {
      cuff_ext_rotators: 1.0, delt_rear: 0.5, traps_mid: 0.35, traps_lower: 0.3,
    },
    axes: [ax('laterality', ['unilateral', 'bilateral'], 'unilateral'),
           ax('bench_angle', ['flat', 'incline_low'], 'flat')],
    systemicLoad: 0.08, axialLoad: 0.02,
    notes: 'The 90/90 rehab staple — external rotation at 90 degrees of abduction, '
         + 'the position the cuff actually fails in.',
  }),
]

import type { Movement } from '../types'
import { mv, ax } from './helpers'

export const BACK_MOVEMENTS: Movement[] = [
  mv({
    id: 'pull_up', name: 'Pull-Up', pattern: 'vertical_pull',
    equipmentTypeIds: ['pull_up_bar', 'assisted_pullup_machine'],
    baseContributions: {
      lats: 1.0, biceps_long: 0.5, biceps_short: 0.45, brachialis: 0.4,
      rhomboids: 0.4, traps_lower: 0.4, traps_mid: 0.3, delt_rear: 0.25,
      forearm_flexors: 0.3, rectus_abdominis: 0.2, deep_core: 0.2,
    },
    axes: [
      ax('grip_orientation', ['pronated', 'supinated', 'neutral'], 'pronated', {
        supinated: { biceps_long: 1.5, biceps_short: 1.4, lats: 0.9 },
        neutral:   { brachialis: 1.4, biceps_long: 1.2 },
      }),
      ax('grip_width', ['narrow', 'shoulder', 'wide'], 'shoulder', {
        wide:   { lats: 1.1, biceps_long: 0.7, biceps_short: 0.65 },
        narrow: { biceps_long: 1.2, lats: 0.9 },
      }),
    ],
    bodyweightFactor: 0.95, systemicLoad: 0.4, axialLoad: 0.05,
  }),
  mv({
    id: 'lat_pulldown', name: 'Lat Pulldown', pattern: 'vertical_pull',
    equipmentTypeIds: ['lat_pulldown'],
    baseContributions: {
      lats: 1.0, biceps_long: 0.45, biceps_short: 0.4, brachialis: 0.35,
      rhomboids: 0.35, traps_lower: 0.35, traps_mid: 0.3, delt_rear: 0.2, forearm_flexors: 0.25,
    },
    axes: [
      ax('grip_orientation', ['pronated', 'supinated', 'neutral'], 'pronated', {
        supinated: { biceps_long: 1.5, biceps_short: 1.4, lats: 0.9 },
        neutral:   { brachialis: 1.4, biceps_long: 1.2 },
      }),
      ax('grip_width', ['narrow', 'shoulder', 'wide'], 'wide', {
        narrow: { biceps_long: 1.2, lats: 0.9 },
      }),
      ax('attachment', ['lat_bar', 'v_bar', 'rope', 'single_d'], 'lat_bar'),
      ax('laterality', ['bilateral', 'unilateral'], 'bilateral'),
    ],
    systemicLoad: 0.25, axialLoad: 0.05,
  }),
  mv({
    id: 'barbell_row', name: 'Barbell Row', pattern: 'horizontal_pull',
    equipmentTypeIds: ['barbell'],
    baseContributions: {
      lats: 0.8, rhomboids: 0.9, traps_mid: 1.0, traps_lower: 0.5, delt_rear: 0.6,
      biceps_long: 0.4, biceps_short: 0.35, brachialis: 0.35,
      erectors: 0.6, hams_lateral: 0.25, hams_medial: 0.25, forearm_flexors: 0.3,
    },
    axes: [
      ax('grip_orientation', ['pronated', 'supinated'], 'pronated', {
        supinated: { lats: 1.25, biceps_long: 1.4, biceps_short: 1.35, traps_mid: 0.85 },
      }),
      ax('grip_width', ['narrow', 'shoulder', 'wide'], 'shoulder', {
        wide: { traps_mid: 1.2, rhomboids: 1.15, delt_rear: 1.3, lats: 0.85 },
      }),
    ],
    systemicLoad: 0.55, axialLoad: 0.5,
    notes: 'Heavy axial load from the unsupported hinge — budget it against deadlifts.',
  }),
  mv({
    id: 'chest_supported_row', name: 'Chest-Supported Row', pattern: 'horizontal_pull',
    equipmentTypeIds: ['dumbbell', 'adjustable_bench'],
    baseContributions: {
      rhomboids: 1.0, traps_mid: 1.0, lats: 0.7, delt_rear: 0.6, traps_lower: 0.5,
      biceps_long: 0.4, biceps_short: 0.35, forearm_flexors: 0.25,
    },
    axes: [
      ax('grip_orientation', ['pronated', 'neutral'], 'neutral', {
        pronated: { delt_rear: 1.3, traps_mid: 1.15, lats: 0.8 },
      }),
      ax('bench_angle', ['incline_low', 'incline_high'], 'incline_low'),
    ],
    systemicLoad: 0.3, axialLoad: 0.05,
    notes: 'No axial load — the pick when erectors are already fatigued.',
  }),
  mv({
    id: 'seated_cable_row', name: 'Seated Cable Row', pattern: 'horizontal_pull',
    equipmentTypeIds: ['seated_row'],
    baseContributions: {
      rhomboids: 0.9, traps_mid: 0.95, lats: 0.85, delt_rear: 0.5, traps_lower: 0.45,
      biceps_long: 0.4, biceps_short: 0.35, erectors: 0.3,
      forearm_flexors: 0.25,
    },
    axes: [
      ax('attachment', ['v_bar', 'straight_bar', 'lat_bar', 'rope', 'single_d'], 'v_bar', {
        rope: { delt_rear: 1.3, traps_mid: 1.2, lats: 0.8 },
      }),
      ax('grip_width', ['narrow', 'shoulder', 'wide'], 'narrow'),
      ax('laterality', ['bilateral', 'unilateral'], 'bilateral'),
    ],
    systemicLoad: 0.3, axialLoad: 0.1,
  }),
  mv({
    id: 'single_arm_db_row', name: 'Single-Arm Dumbbell Row', pattern: 'horizontal_pull',
    equipmentTypeIds: ['dumbbell', 'flat_bench'],
    baseContributions: {
      lats: 1.0, traps_mid: 0.7, rhomboids: 0.7, delt_rear: 0.4,
      biceps_long: 0.4, biceps_short: 0.35, forearm_flexors: 0.3, obliques: 0.3,
      quadratus_lumborum: 0.25, erectors: 0.3,
    },
    axes: [ax('laterality', ['unilateral'], 'unilateral')],
    systemicLoad: 0.3, axialLoad: 0.15,
  }),
  mv({
    id: 'straight_arm_pulldown', name: 'Straight-Arm Pulldown', pattern: 'vertical_pull',
    equipmentTypeIds: ['cable_tower'],
    baseContributions: {
      lats: 1.0, triceps_long: 0.4, rectus_abdominis: 0.25, deep_core: 0.2,
    },
    axes: [ax('attachment', ['straight_bar', 'rope', 'lat_bar'], 'straight_bar')],
    systemicLoad: 0.15, axialLoad: 0.05,
    notes: 'Isolates the lats without the elbow flexors — useful when biceps are the '
         + 'limiting factor on rows.',
  }),
  mv({
    id: 'db_pullover', name: 'Dumbbell Pullover', pattern: 'vertical_pull',
    equipmentTypeIds: ['dumbbell', 'flat_bench'],
    baseContributions: {
      lats: 0.9, pec_mid: 0.5, pec_lower: 0.4, triceps_long: 0.5,
      rectus_abdominis: 0.2,
    },
    axes: [], systemicLoad: 0.2, axialLoad: 0.05,
  }),
  mv({
    id: 'inverted_row', name: 'Inverted Row', pattern: 'horizontal_pull',
    equipmentTypeIds: ['barbell', 'squat_rack', 'bodyweight'],
    baseContributions: {
      rhomboids: 0.9, traps_mid: 0.9, lats: 0.7, delt_rear: 0.55, traps_lower: 0.5,
      biceps_long: 0.4, biceps_short: 0.35, deep_core: 0.4, glute_max: 0.25,
      forearm_flexors: 0.25,
    },
    axes: [
      ax('grip_orientation', ['pronated', 'supinated', 'neutral'], 'pronated'),
      ax('bench_angle', ['flat', 'incline_low'], 'flat'),
    ],
    bodyweightFactor: 0.6, systemicLoad: 0.25, axialLoad: 0.05,
  }),
  mv({
    id: 'shrug', name: 'Shrug', pattern: 'shoulder_raise',
    equipmentTypeIds: ['barbell', 'dumbbell', 'trap_bar', 'cable_tower'],
    baseContributions: {
      traps_upper: 1.0, traps_mid: 0.35, forearm_flexors: 0.4, erectors: 0.2,
    },
    axes: [ax('laterality', ['bilateral', 'unilateral'], 'bilateral')],
    systemicLoad: 0.25, axialLoad: 0.25,
  }),
  mv({
    id: 'face_pull', name: 'Face Pull', pattern: 'horizontal_pull',
    equipmentTypeIds: ['cable_tower', 'band'],
    baseContributions: {
      delt_rear: 1.0, traps_mid: 0.8, rhomboids: 0.7, cuff_ext_rotators: 0.7,
      traps_lower: 0.5, traps_upper: 0.25, biceps_long: 0.2,
    },
    axes: [
      ax('pulley_height', ['chest', 'high'], 'high'),
      ax('attachment', ['rope', 'single_d'], 'rope'),
    ],
    systemicLoad: 0.12, axialLoad: 0.02,
    notes: 'One of the few movements that loads the external rotators and the mid '
         + 'traps together, which is why it is the default shoulder-health pick.',
  }),
  mv({
    id: 'prone_y_raise', name: 'Prone Y-Raise', pattern: 'shoulder_raise',
    equipmentTypeIds: ['dumbbell', 'adjustable_bench', 'bodyweight'],
    baseContributions: {
      traps_lower: 1.0, traps_mid: 0.6, delt_rear: 0.5, rhomboids: 0.4, delt_lateral: 0.3,
      supraspinatus: 0.3,
    },
    axes: [ax('bench_angle', ['incline_low', 'incline_high'], 'incline_low')],
    systemicLoad: 0.1, axialLoad: 0.02,
    notes: 'The most direct lower-trap movement in the catalog.',
  }),
  mv({
    id: 'back_extension', name: 'Back Extension', pattern: 'trunk_extension',
    equipmentTypeIds: ['back_extension_bench', 'glute_ham_raise'],
    baseContributions: {
      erectors: 1.0, glute_max: 0.6, hams_lateral: 0.5, hams_medial: 0.5,
      adductor_magnus: 0.3, deep_core: 0.3, quadratus_lumborum: 0.3,
    },
    axes: [ax('bench_angle', ['flat', 'incline_low'], 'incline_low')],
    bodyweightFactor: 0.55, systemicLoad: 0.25, axialLoad: 0.3,
  }),
  mv({
    id: 'scapular_pull_up', name: 'Scapular Pull-Up', pattern: 'vertical_pull',
    equipmentTypeIds: ['pull_up_bar'],
    baseContributions: {
      traps_lower: 1.0, traps_mid: 0.6, lats: 0.55, rhomboids: 0.5, delt_rear: 0.25,
      forearm_flexors: 0.35,
    },
    axes: [ax('grip_width', ['narrow', 'shoulder', 'wide'], 'shoulder')],
    bodyweightFactor: 0.95, systemicLoad: 0.2, axialLoad: 0.05,
    notes: 'Scapular depression only, no elbow flexion — isolates the lower traps '
         + 'in a way a full pull-up cannot.',
  }),
  mv({
    id: 'band_pull_apart', name: 'Band Pull-Apart', pattern: 'horizontal_pull',
    equipmentTypeIds: ['band', 'cable_tower'],
    baseContributions: {
      delt_rear: 0.9, rhomboids: 0.85, traps_mid: 1.0, cuff_ext_rotators: 0.55,
      traps_lower: 0.45,
    },
    axes: [ax('grip_width', ['narrow', 'shoulder', 'wide'], 'shoulder'),
           ax('grip_orientation', ['pronated', 'supinated'], 'pronated', {
             supinated: { cuff_ext_rotators: 1.4, delt_rear: 0.9 },
           })],
    systemicLoad: 0.1, axialLoad: 0.02,
  }),
]

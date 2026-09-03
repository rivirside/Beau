import type { Movement } from '../types'
import { mv, ax } from './helpers'

export const ARM_MOVEMENTS: Movement[] = [
  mv({
    id: 'barbell_curl', name: 'Barbell Curl', pattern: 'elbow_flexion',
    equipmentTypeIds: ['barbell', 'ez_bar', 'cable_tower'],
    baseContributions: {
      biceps_long: 1.0, biceps_short: 0.95, brachialis: 0.5, brachioradialis: 0.35,
      forearm_flexors: 0.25, delt_front: 0.15,
    },
    axes: [
      ax('grip_width', ['narrow', 'shoulder', 'wide'], 'shoulder', {
        narrow: { biceps_long: 1.15, biceps_short: 0.85 },
        wide:   { biceps_short: 1.15, biceps_long: 0.85 },
      }),
      ax('attachment', ['straight_bar', 'ez_bar'], 'straight_bar', {
        ez_bar: { brachioradialis: 1.2, biceps_long: 0.95 },
      }),
    ],
    systemicLoad: 0.15, axialLoad: 0.08,
  }),
  mv({
    id: 'db_curl', name: 'Dumbbell Curl', pattern: 'elbow_flexion',
    equipmentTypeIds: ['dumbbell', 'adjustable_bench'],
    baseContributions: {
      biceps_long: 0.9, biceps_short: 0.9, brachialis: 0.5, brachioradialis: 0.3,
      forearm_flexors: 0.2,
    },
    axes: [
      ax('body_position', ['standing', 'seated', 'lying'], 'standing', {
        // Incline/lying puts the shoulder in extension → long head stretched.
        lying: { biceps_long: 1.4, biceps_short: 0.75 },
      }),
      ax('grip_orientation', ['supinated', 'neutral', 'pronated'], 'supinated', {
        neutral:  { brachialis: 1.6, brachioradialis: 1.5, biceps_long: 0.85, biceps_short: 0.8 },
        pronated: { brachioradialis: 1.8, brachialis: 1.4, biceps_long: 0.5, biceps_short: 0.45,
                    forearm_extensors: 1.5 },
      }),
      ax('laterality', ['bilateral', 'alternating', 'unilateral'], 'bilateral'),
    ],
    systemicLoad: 0.12, axialLoad: 0.05,
  }),
  mv({
    id: 'preacher_curl', name: 'Preacher Curl', pattern: 'elbow_flexion',
    equipmentTypeIds: ['ez_bar', 'dumbbell', 'preacher_bench', 'cable_tower'],
    baseContributions: {
      biceps_short: 1.0, biceps_long: 0.6, brachialis: 0.55, brachioradialis: 0.3,
      forearm_flexors: 0.2,
    },
    axes: [ax('laterality', ['bilateral', 'unilateral'], 'bilateral')],
    systemicLoad: 0.12, axialLoad: 0.02,
    notes: 'Shoulder flexed over the pad shortens the long head, biasing the short head — '
         + 'the mirror image of the incline curl.',
  }),
  mv({
    id: 'hammer_curl', name: 'Hammer Curl', pattern: 'elbow_flexion',
    equipmentTypeIds: ['dumbbell', 'cable_tower'],
    baseContributions: {
      brachialis: 1.0, brachioradialis: 0.9, biceps_long: 0.6, biceps_short: 0.5,
      forearm_flexors: 0.3,
    },
    axes: [
      ax('attachment', ['rope', 'd_handle'], 'rope'),
      ax('laterality', ['bilateral', 'alternating', 'unilateral'], 'bilateral'),
    ],
    systemicLoad: 0.12, axialLoad: 0.05,
  }),
  mv({
    id: 'reverse_curl', name: 'Reverse Curl', pattern: 'elbow_flexion',
    equipmentTypeIds: ['ez_bar', 'barbell', 'cable_tower', 'dumbbell'],
    baseContributions: {
      brachioradialis: 1.0, brachialis: 0.8, forearm_extensors: 0.6,
      biceps_long: 0.35, biceps_short: 0.3,
    },
    axes: [], systemicLoad: 0.1, axialLoad: 0.05,
  }),
  mv({
    id: 'triceps_pushdown', name: 'Triceps Pushdown', pattern: 'elbow_extension',
    equipmentTypeIds: ['cable_tower'],
    baseContributions: {
      triceps_lateral: 1.0, triceps_medial: 0.9, triceps_long: 0.5,
    },
    axes: [
      ax('attachment', ['rope', 'straight_bar', 'v_bar', 'ez_bar'], 'rope', {
        rope: { triceps_lateral: 1.1, triceps_long: 0.9 },
      }),
      ax('grip_orientation', ['pronated', 'neutral', 'supinated'], 'pronated', {
        supinated: { triceps_medial: 1.2, triceps_lateral: 0.9 },
      }),
      ax('laterality', ['bilateral', 'unilateral'], 'bilateral'),
    ],
    systemicLoad: 0.12, axialLoad: 0.02,
  }),
  mv({
    id: 'overhead_triceps_extension', name: 'Overhead Triceps Extension',
    pattern: 'elbow_extension',
    equipmentTypeIds: ['cable_tower', 'dumbbell', 'ez_bar'],
    baseContributions: {
      triceps_long: 1.0, triceps_lateral: 0.65, triceps_medial: 0.6, delt_front: 0.15,
    },
    axes: [
      ax('attachment', ['rope', 'ez_bar'], 'rope'),
      ax('pulley_height', ['floor', 'low', 'high'], 'low'),
      ax('laterality', ['bilateral', 'unilateral'], 'bilateral'),
    ],
    systemicLoad: 0.15, axialLoad: 0.05,
    notes: 'Overhead is the only position that lengthens the long head, which crosses '
         + 'the shoulder — pushdowns cannot substitute for this.',
  }),
  mv({
    id: 'skullcrusher', name: 'Skullcrusher', pattern: 'elbow_extension',
    equipmentTypeIds: ['ez_bar', 'dumbbell', 'flat_bench', 'adjustable_bench'],
    baseContributions: {
      triceps_long: 0.85, triceps_lateral: 0.9, triceps_medial: 0.85,
    },
    axes: [ax('bench_angle', ['flat', 'decline', 'incline_low'], 'flat', {
      incline_low: { triceps_long: 1.25 },
    })],
    systemicLoad: 0.15, axialLoad: 0.05,
  }),
  mv({
    id: 'triceps_dip', name: 'Triceps Dip', pattern: 'elbow_extension',
    equipmentTypeIds: ['dip_station'],
    baseContributions: {
      triceps_lateral: 1.0, triceps_medial: 0.95, triceps_long: 0.7,
      pec_lower: 0.5, delt_front: 0.4,
    },
    axes: [ax('grip_width', ['narrow', 'shoulder'], 'narrow')],
    bodyweightFactor: 0.95, systemicLoad: 0.35, axialLoad: 0.05,
  }),
  mv({
    id: 'wrist_curl', name: 'Wrist Curl', pattern: 'elbow_flexion',
    equipmentTypeIds: ['dumbbell', 'barbell', 'cable_tower'],
    baseContributions: { forearm_flexors: 1.0 },
    axes: [ax('laterality', ['bilateral', 'unilateral'], 'bilateral')],
    systemicLoad: 0.06, axialLoad: 0.02,
  }),
  mv({
    id: 'reverse_wrist_curl', name: 'Reverse Wrist Curl', pattern: 'elbow_extension',
    equipmentTypeIds: ['dumbbell', 'barbell', 'cable_tower'],
    baseContributions: { forearm_extensors: 1.0, brachioradialis: 0.2 },
    axes: [ax('laterality', ['bilateral', 'unilateral'], 'bilateral')],
    systemicLoad: 0.06, axialLoad: 0.02,
  }),
  mv({
    id: 'farmers_walk', name: "Farmer's Walk", pattern: 'carry',
    equipmentTypeIds: ['dumbbell', 'kettlebell', 'trap_bar'],
    baseContributions: {
      forearm_flexors: 1.0, traps_upper: 0.7, deep_core: 0.6, quadratus_lumborum: 0.5,
      obliques: 0.4, erectors: 0.5, glute_med_min: 0.4, quads_vasti: 0.3,
      calves_gastroc: 0.3, calves_soleus: 0.3,
    },
    axes: [ax('laterality', ['bilateral', 'unilateral'], 'bilateral', {
      unilateral: { quadratus_lumborum: 1.6, obliques: 1.5, glute_med_min: 1.3 },
    })],
    systemicLoad: 0.5, axialLoad: 0.4,
    notes: 'Carried on one side it becomes the best loaded lateral-flexion brace there is.',
  }),
]

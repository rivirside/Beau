import type { Movement } from '../types'
import { mv, ax } from './helpers'

export const CORE_MOVEMENTS: Movement[] = [
  mv({
    id: 'cable_crunch', name: 'Cable Crunch', pattern: 'trunk_flexion',
    equipmentTypeIds: ['cable_tower'],
    baseContributions: { rectus_abdominis: 1.0, obliques: 0.45, hip_flexors: 0.25 },
    axes: [ax('pulley_height', ['high', 'overhead'], 'high'),
           ax('attachment', ['rope'], 'rope'),
           ax('body_position', ['kneeling', 'seated'], 'kneeling')],
    systemicLoad: 0.15, axialLoad: 0.15,
    notes: 'The only loadable, progressable spinal-flexion movement here — crunches '
         + 'cannot be progressed past bodyweight.',
  }),
  mv({
    id: 'crunch', name: 'Crunch', pattern: 'trunk_flexion',
    equipmentTypeIds: ['bodyweight', 'plate'],
    baseContributions: { rectus_abdominis: 1.0, obliques: 0.35, hip_flexors: 0.2 },
    axes: [], bodyweightFactor: 0.3, systemicLoad: 0.1, axialLoad: 0.1,
  }),
  mv({
    id: 'hanging_leg_raise', name: 'Hanging Leg Raise', pattern: 'trunk_flexion',
    equipmentTypeIds: ['pull_up_bar'],
    baseContributions: {
      hip_flexors: 1.0, rectus_abdominis: 0.85, obliques: 0.4, quads_rf: 0.5,
      forearm_flexors: 0.4, lats: 0.3, deep_core: 0.4,
    },
    axes: [ax('rom_bias', ['full', 'shortened_partial'], 'full', {
      shortened_partial: { rectus_abdominis: 0.6, hip_flexors: 1.1 },
    })],
    bodyweightFactor: 0.4, systemicLoad: 0.3, axialLoad: 0.05,
  }),
  mv({
    id: 'ab_wheel_rollout', name: 'Ab Wheel Rollout', pattern: 'trunk_flexion',
    equipmentTypeIds: ['ab_wheel', 'barbell'],
    baseContributions: {
      rectus_abdominis: 1.0, deep_core: 0.9, obliques: 0.5, lats: 0.4,
      triceps_long: 0.25, erectors: 0.3,
    },
    axes: [ax('body_position', ['kneeling', 'standing'], 'kneeling')],
    bodyweightFactor: 0.5, systemicLoad: 0.35, axialLoad: 0.2,
  }),
  mv({
    id: 'plank', name: 'Plank', pattern: 'trunk_flexion',
    equipmentTypeIds: ['bodyweight'],
    baseContributions: {
      deep_core: 1.0, rectus_abdominis: 0.6, obliques: 0.45, glute_max: 0.3,
      traps_lower: 0.25, quads_vasti: 0.2,
    },
    axes: [], bodyweightFactor: 0.5, systemicLoad: 0.2, axialLoad: 0.05,
  }),
  mv({
    id: 'side_plank', name: 'Side Plank', pattern: 'trunk_rotation',
    equipmentTypeIds: ['bodyweight'],
    baseContributions: {
      obliques: 1.0, quadratus_lumborum: 0.9, deep_core: 0.7, glute_med_min: 0.5,
      adductors: 0.3,
    },
    axes: [ax('laterality', ['unilateral'], 'unilateral')],
    bodyweightFactor: 0.5, systemicLoad: 0.2, axialLoad: 0.05,
  }),
  mv({
    id: 'suitcase_carry', name: 'Suitcase Carry', pattern: 'carry',
    equipmentTypeIds: ['dumbbell', 'kettlebell'],
    baseContributions: {
      quadratus_lumborum: 1.0, obliques: 0.8, deep_core: 0.7, forearm_flexors: 0.8,
      traps_upper: 0.5, glute_med_min: 0.5, erectors: 0.4,
    },
    axes: [ax('laterality', ['unilateral'], 'unilateral')],
    systemicLoad: 0.4, axialLoad: 0.35,
  }),
  mv({
    id: 'pallof_press', name: 'Pallof Press', pattern: 'trunk_rotation',
    equipmentTypeIds: ['cable_tower', 'band'],
    baseContributions: {
      deep_core: 1.0, obliques: 0.85, quadratus_lumborum: 0.4, glute_med_min: 0.3,
      delt_front: 0.2,
    },
    axes: [ax('pulley_height', ['chest'], 'chest'),
           ax('body_position', ['standing', 'kneeling', 'half_kneeling'], 'standing')],
    systemicLoad: 0.15, axialLoad: 0.05,
    notes: 'Anti-rotation rather than rotation: the core resists movement instead of '
         + 'producing it, which is what it mostly does in life.',
  }),
  mv({
    id: 'dead_bug', name: 'Dead Bug', pattern: 'trunk_flexion',
    equipmentTypeIds: ['bodyweight', 'band'],
    baseContributions: { deep_core: 1.0, rectus_abdominis: 0.5, obliques: 0.4,
                         hip_flexors: 0.3 },
    axes: [], bodyweightFactor: 0.25, systemicLoad: 0.12, axialLoad: 0.02,
  }),
  mv({
    id: 'bird_dog', name: 'Bird Dog', pattern: 'trunk_extension',
    equipmentTypeIds: ['bodyweight'],
    baseContributions: {
      deep_core: 1.0, erectors: 0.7, glute_max: 0.5, obliques: 0.4,
      quadratus_lumborum: 0.35, delt_front: 0.2,
    },
    axes: [], bodyweightFactor: 0.3, systemicLoad: 0.12, axialLoad: 0.05,
  }),
  mv({
    id: 'cable_woodchop', name: 'Cable Woodchop', pattern: 'trunk_rotation',
    equipmentTypeIds: ['cable_tower', 'band'],
    baseContributions: {
      obliques: 1.0, deep_core: 0.7, rectus_abdominis: 0.4, quadratus_lumborum: 0.4,
      delt_front: 0.25, glute_max: 0.25,
    },
    axes: [ax('pulley_height', ['low', 'chest', 'high'], 'high'),
           ax('attachment', ['rope', 'd_handle'], 'rope')],
    systemicLoad: 0.2, axialLoad: 0.15,
  }),
  mv({
    id: 'russian_twist', name: 'Russian Twist', pattern: 'trunk_rotation',
    equipmentTypeIds: ['plate', 'dumbbell', 'bodyweight'],
    baseContributions: { obliques: 1.0, rectus_abdominis: 0.5, hip_flexors: 0.35,
                         deep_core: 0.4 },
    axes: [], systemicLoad: 0.15, axialLoad: 0.15,
  }),

  /* -------------------------------------------------------------------- neck */
  mv({
    id: 'neck_flexion', name: 'Neck Flexion', pattern: 'trunk_flexion',
    equipmentTypeIds: ['neck_harness', 'plate', 'bodyweight', 'band'],
    baseContributions: { neck_flexors: 1.0 },
    axes: [ax('body_position', ['lying', 'seated'], 'lying')],
    systemicLoad: 0.1, axialLoad: 0.1,
  }),
  mv({
    id: 'neck_extension', name: 'Neck Extension', pattern: 'trunk_extension',
    equipmentTypeIds: ['neck_harness', 'plate', 'bodyweight', 'band'],
    baseContributions: { neck_extensors: 1.0, traps_upper: 0.35 },
    axes: [ax('body_position', ['prone', 'seated'], 'prone')],
    systemicLoad: 0.1, axialLoad: 0.1,
  }),
  mv({
    id: 'neck_lateral_flexion', name: 'Neck Lateral Flexion', pattern: 'trunk_rotation',
    equipmentTypeIds: ['neck_harness', 'plate', 'bodyweight', 'band'],
    baseContributions: { neck_flexors: 0.8, neck_extensors: 0.8, traps_upper: 0.3 },
    axes: [ax('laterality', ['unilateral'], 'unilateral')],
    systemicLoad: 0.1, axialLoad: 0.1,
  }),
]

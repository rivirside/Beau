import type { Movement } from '../types'
import { mv, ax } from './helpers'

/** Tibial rotation on leg curls. This is the axis that makes the medial/lateral
 *  hamstring split programmable rather than merely anatomical. */
const CURL_ROTATION = ax('foot_rotation', ['neutral', 'internal', 'external'], 'neutral', {
  internal: { hams_medial: 1.3, hams_lateral: 0.75 },
  external: { hams_lateral: 1.3, hams_medial: 0.75 },
})

export const LEG_MOVEMENTS: Movement[] = [
  /* ------------------------------------------------------------ squat pattern */
  mv({
    id: 'back_squat', name: 'Back Squat', pattern: 'squat',
    equipmentTypeIds: ['barbell', 'squat_rack'],
    baseContributions: {
      quads_vasti: 1.0, quads_rf: 0.6, glute_max: 0.85, adductor_magnus: 0.7,
      adductors: 0.4, erectors: 0.6, hams_lateral: 0.35, hams_medial: 0.35,
      deep_core: 0.5, calves_soleus: 0.3, glute_med_min: 0.35, traps_mid: 0.25,
    },
    axes: [
      ax('stance', ['narrow', 'shoulder', 'wide'], 'shoulder', {
        wide:   { adductor_magnus: 1.4, adductors: 1.4, glute_max: 1.15, quads_vasti: 0.85 },
        narrow: { quads_vasti: 1.15, adductor_magnus: 0.7, adductors: 0.7 },
      }),
      ax('rom_bias', ['full', 'shortened_partial'], 'full', {
        shortened_partial: { glute_max: 0.6, adductor_magnus: 0.6, quads_vasti: 1.05 },
      }),
    ],
    systemicLoad: 0.9, axialLoad: 0.9,
  }),
  mv({
    id: 'front_squat', name: 'Front Squat', pattern: 'squat',
    equipmentTypeIds: ['barbell', 'squat_rack'],
    baseContributions: {
      quads_vasti: 1.0, quads_rf: 0.7, glute_max: 0.6, adductor_magnus: 0.5,
      adductors: 0.35, erectors: 0.7, deep_core: 0.6, traps_upper: 0.3,
      hams_lateral: 0.2, hams_medial: 0.2, calves_soleus: 0.3,
    },
    axes: [ax('stance', ['narrow', 'shoulder'], 'shoulder')],
    systemicLoad: 0.85, axialLoad: 0.8,
    notes: 'More upright torso than the back squat: more quad and upper-back demand, '
         + 'less hip.',
  }),
  mv({
    id: 'hack_squat', name: 'Hack Squat', pattern: 'squat',
    equipmentTypeIds: ['hack_squat'],
    baseContributions: {
      quads_vasti: 1.0, quads_rf: 0.55, glute_max: 0.5, adductor_magnus: 0.45,
      adductors: 0.3, calves_soleus: 0.25,
    },
    axes: [ax('stance', ['narrow', 'shoulder', 'wide'], 'shoulder', {
      wide:   { adductor_magnus: 1.4, glute_max: 1.2, quads_vasti: 0.9 },
      narrow: { quads_vasti: 1.15, adductors: 0.7 },
    })],
    systemicLoad: 0.5, axialLoad: 0.3,
    notes: 'Squat stimulus with almost no spinal or core cost — the pick when erectors '
         + 'are already spent.',
  }),
  mv({
    id: 'leg_press', name: 'Leg Press', pattern: 'squat',
    equipmentTypeIds: ['leg_press'],
    baseContributions: {
      quads_vasti: 1.0, quads_rf: 0.45, glute_max: 0.6, adductor_magnus: 0.55,
      adductors: 0.35, hams_lateral: 0.2, hams_medial: 0.2,
    },
    axes: [
      ax('stance', ['narrow', 'shoulder', 'wide'], 'shoulder', {
        wide:   { adductor_magnus: 1.5, adductors: 1.5, glute_max: 1.2, quads_vasti: 0.85 },
        narrow: { quads_vasti: 1.2, adductors: 0.6 },
      }),
      ax('laterality', ['bilateral', 'unilateral'], 'bilateral'),
    ],
    systemicLoad: 0.5, axialLoad: 0.15,
  }),
  mv({
    id: 'bulgarian_split_squat', name: 'Bulgarian Split Squat', pattern: 'lunge',
    equipmentTypeIds: ['dumbbell', 'barbell', 'box'],
    baseContributions: {
      quads_vasti: 0.9, quads_rf: 0.5, glute_max: 1.0, adductor_magnus: 0.6,
      glute_med_min: 0.6, hip_ext_rotators: 0.4, adductors: 0.35,
      hams_lateral: 0.35, hams_medial: 0.35, deep_core: 0.4, calves_soleus: 0.3,
    },
    axes: [
      ax('laterality', ['unilateral'], 'unilateral'),
      ax('body_position', ['standing', 'bent_over'], 'standing', {
        bent_over: { glute_max: 1.2, adductor_magnus: 1.2, quads_vasti: 0.8 },
      }),
    ],
    systemicLoad: 0.6, axialLoad: 0.3,
    notes: 'The unilateral stance loads the frontal-plane hip stabilisers in a way no '
         + 'bilateral squat does.',
  }),
  mv({
    id: 'lunge', name: 'Lunge', pattern: 'lunge',
    equipmentTypeIds: ['dumbbell', 'barbell', 'bodyweight'],
    baseContributions: {
      quads_vasti: 0.9, quads_rf: 0.5, glute_max: 0.9, glute_med_min: 0.5,
      adductor_magnus: 0.5, adductors: 0.4, hams_lateral: 0.3, hams_medial: 0.3,
      hip_ext_rotators: 0.3, deep_core: 0.35, calves_soleus: 0.3,
    },
    axes: [
      ax('stance', ['staggered', 'split'], 'split'),
      ax('body_position', ['standing', 'bent_over'], 'standing'),
    ],
    systemicLoad: 0.55, axialLoad: 0.3,
  }),
  mv({
    id: 'step_up', name: 'Step-Up', pattern: 'lunge',
    equipmentTypeIds: ['dumbbell', 'box'],
    baseContributions: {
      glute_max: 1.0, quads_vasti: 0.8, quads_rf: 0.4, glute_med_min: 0.6,
      adductor_magnus: 0.45, hip_ext_rotators: 0.35, hams_lateral: 0.3, hams_medial: 0.3,
      deep_core: 0.3, calves_soleus: 0.25,
    },
    axes: [ax('laterality', ['unilateral'], 'unilateral')],
    systemicLoad: 0.45, axialLoad: 0.2,
  }),

  /* ---------------------------------------------------------- knee extension */
  mv({
    id: 'leg_extension', name: 'Leg Extension', pattern: 'knee_extension',
    equipmentTypeIds: ['leg_extension'],
    baseContributions: { quads_vasti: 1.0, quads_rf: 0.6 },
    axes: [
      ax('body_position', ['seated', 'lying'], 'seated', {
        // Reclining opens the hip and lengthens rectus femoris.
        lying: { quads_rf: 1.7, quads_vasti: 0.9 },
      }),
      ax('rom_bias', ['full', 'lengthened_partial', 'shortened_partial'], 'full'),
      ax('laterality', ['bilateral', 'unilateral'], 'bilateral'),
    ],
    systemicLoad: 0.2, axialLoad: 0.02,
  }),
  mv({
    id: 'sissy_squat', name: 'Sissy Squat', pattern: 'knee_extension',
    equipmentTypeIds: ['bodyweight'],
    baseContributions: { quads_rf: 1.0, quads_vasti: 0.9, hip_flexors: 0.3, deep_core: 0.3 },
    axes: [], bodyweightFactor: 0.7, systemicLoad: 0.3, axialLoad: 0.05,
  }),
  mv({
    id: 'reverse_nordic', name: 'Reverse Nordic Curl', pattern: 'knee_extension',
    equipmentTypeIds: ['bodyweight'],
    baseContributions: { quads_rf: 1.0, quads_vasti: 0.85, hip_flexors: 0.5, deep_core: 0.4 },
    axes: [], bodyweightFactor: 0.6, systemicLoad: 0.3, axialLoad: 0.05,
    notes: 'Loads the quads at long muscle lengths, the position where they are most '
         + 'often strained in sprinting.',
  }),

  /* ------------------------------------------------------------- hip hinge */
  mv({
    id: 'deadlift', name: 'Deadlift', pattern: 'hip_hinge',
    equipmentTypeIds: ['barbell', 'trap_bar'],
    baseContributions: {
      glute_max: 1.0, erectors: 1.0, hams_lateral: 0.8, hams_medial: 0.8,
      adductor_magnus: 0.7, quads_vasti: 0.5, quads_rf: 0.25, traps_upper: 0.5,
      traps_mid: 0.45, forearm_flexors: 0.6, lats: 0.4, deep_core: 0.6,
      quadratus_lumborum: 0.4, calves_soleus: 0.2,
    },
    axes: [
      ax('stance', ['shoulder', 'wide'], 'shoulder', {
        // Sumo: more adductor and quad, less spinal.
        wide: { adductor_magnus: 1.5, adductors: 1.4, quads_vasti: 1.3,
                erectors: 0.75, hams_lateral: 0.8, hams_medial: 0.8 },
      }),
      ax('grip_orientation', ['pronated', 'mixed'], 'pronated'),
      ax('rom_bias', ['full', 'shortened_partial'], 'full', {
        shortened_partial: { hams_lateral: 0.6, hams_medial: 0.6, traps_upper: 1.3,
                             erectors: 1.15 },
      }),
    ],
    systemicLoad: 1.0, axialLoad: 1.0,
    notes: 'The highest systemic and axial cost in the catalog — the generator should '
         + 'rarely put another heavy hinge in the same session.',
  }),
  mv({
    id: 'romanian_deadlift', name: 'Romanian Deadlift', pattern: 'hip_hinge',
    equipmentTypeIds: ['barbell', 'dumbbell'],
    baseContributions: {
      hams_lateral: 1.0, hams_medial: 1.0, glute_max: 0.85, adductor_magnus: 0.6,
      erectors: 0.8, forearm_flexors: 0.4, traps_mid: 0.3, deep_core: 0.4,
      quadratus_lumborum: 0.3,
    },
    axes: [
      ax('stance', ['narrow', 'shoulder', 'wide'], 'shoulder'),
      ax('laterality', ['bilateral', 'unilateral'], 'bilateral', {
        unilateral: { glute_med_min: 1.5, hip_ext_rotators: 1.4, quadratus_lumborum: 1.4 },
      }),
    ],
    systemicLoad: 0.7, axialLoad: 0.7,
    notes: 'Trains the hamstrings at the hip. It cannot reach the short head of biceps '
         + 'femoris, which does not cross the hip — that needs a knee-flexion movement.',
  }),
  mv({
    id: 'good_morning', name: 'Good Morning', pattern: 'hip_hinge',
    equipmentTypeIds: ['barbell', 'squat_rack'],
    baseContributions: {
      erectors: 1.0, hams_lateral: 0.85, hams_medial: 0.85, glute_max: 0.7,
      adductor_magnus: 0.5, deep_core: 0.5, quadratus_lumborum: 0.4,
    },
    axes: [ax('stance', ['narrow', 'shoulder', 'wide'], 'shoulder')],
    systemicLoad: 0.6, axialLoad: 0.85,
  }),
  mv({
    id: 'hip_thrust', name: 'Hip Thrust', pattern: 'hip_hinge',
    equipmentTypeIds: ['barbell', 'hip_thrust_machine', 'flat_bench'],
    baseContributions: {
      glute_max: 1.0, hams_lateral: 0.5, hams_medial: 0.5, adductor_magnus: 0.45,
      quads_vasti: 0.3, deep_core: 0.3,
    },
    axes: [
      ax('stance', ['narrow', 'shoulder', 'wide'], 'shoulder', {
        wide: { glute_max: 1.1, adductor_magnus: 1.2, hip_ext_rotators: 1.3 },
      }),
      ax('laterality', ['bilateral', 'unilateral'], 'bilateral'),
    ],
    systemicLoad: 0.45, axialLoad: 0.2,
    notes: 'Peak glute tension at full hip extension, where squats and hinges are weakest.',
  }),
  mv({
    id: 'cable_pull_through', name: 'Cable Pull-Through', pattern: 'hip_hinge',
    equipmentTypeIds: ['cable_tower'],
    baseContributions: {
      glute_max: 1.0, hams_lateral: 0.6, hams_medial: 0.6, adductor_magnus: 0.4,
      erectors: 0.4, deep_core: 0.3,
    },
    axes: [ax('pulley_height', ['floor', 'low'], 'floor'),
           ax('attachment', ['rope'], 'rope')],
    systemicLoad: 0.3, axialLoad: 0.2,
  }),

  /* ------------------------------------------------------------ knee flexion */
  mv({
    id: 'lying_leg_curl', name: 'Lying Leg Curl', pattern: 'knee_flexion',
    equipmentTypeIds: ['leg_curl_lying'],
    baseContributions: {
      hams_lateral: 1.0, hams_medial: 1.0, calves_gastroc: 0.35,
    },
    axes: [CURL_ROTATION, ax('laterality', ['bilateral', 'unilateral'], 'bilateral')],
    systemicLoad: 0.25, axialLoad: 0.05,
    notes: 'Hip extended, so the hamstrings work shortened at the hip — the complement '
         + 'to the seated curl, not a duplicate of it.',
  }),
  mv({
    id: 'seated_leg_curl', name: 'Seated Leg Curl', pattern: 'knee_flexion',
    equipmentTypeIds: ['leg_curl_seated'],
    baseContributions: {
      hams_lateral: 1.0, hams_medial: 1.0, calves_gastroc: 0.3,
    },
    axes: [CURL_ROTATION, ax('laterality', ['bilateral', 'unilateral'], 'bilateral')],
    systemicLoad: 0.25, axialLoad: 0.05,
    notes: 'Hip flexed, so the long heads are stretched throughout — generally the '
         + 'stronger hypertrophy stimulus of the two curls.',
  }),
  mv({
    id: 'nordic_curl', name: 'Nordic Hamstring Curl', pattern: 'knee_flexion',
    equipmentTypeIds: ['glute_ham_raise', 'bodyweight'],
    baseContributions: {
      hams_lateral: 1.0, hams_medial: 1.0, calves_gastroc: 0.35, glute_max: 0.4,
      erectors: 0.35, deep_core: 0.4,
    },
    axes: [], bodyweightFactor: 0.75, systemicLoad: 0.45, axialLoad: 0.1,
    notes: 'The eccentric-overload movement with the best evidence for reducing '
         + 'hamstring strain rates.',
  }),

  /* --------------------------------------------------------- hip abduction etc */
  mv({
    id: 'hip_abduction', name: 'Hip Abduction', pattern: 'hip_abduction',
    equipmentTypeIds: ['hip_abduction_machine', 'cable_tower', 'band'],
    baseContributions: { glute_med_min: 1.0, glute_max: 0.4, hip_ext_rotators: 0.3 },
    axes: [
      ax('body_position', ['seated', 'standing'], 'seated', {
        // Torso leaning forward shifts the machine onto the upper glute max.
        standing: { glute_med_min: 1.05, glute_max: 1.3 },
      }),
      ax('laterality', ['bilateral', 'unilateral'], 'bilateral'),
    ],
    systemicLoad: 0.15, axialLoad: 0.05,
  }),
  mv({
    id: 'lateral_band_walk', name: 'Lateral Band Walk', pattern: 'hip_abduction',
    equipmentTypeIds: ['band'],
    baseContributions: { glute_med_min: 1.0, hip_ext_rotators: 0.45, glute_max: 0.35,
                         quads_vasti: 0.2 },
    axes: [ax('stance', ['narrow', 'shoulder'], 'shoulder')],
    systemicLoad: 0.15, axialLoad: 0.05,
  }),
  mv({
    id: 'hip_external_rotation', name: 'Hip External Rotation', pattern: 'hip_abduction',
    equipmentTypeIds: ['cable_tower', 'band'],
    baseContributions: { hip_ext_rotators: 1.0, glute_max: 0.45, glute_med_min: 0.35 },
    axes: [
      ax('body_position', ['seated', 'lying', 'standing'], 'seated'),
      ax('laterality', ['unilateral'], 'unilateral'),
    ],
    systemicLoad: 0.1, axialLoad: 0.02,
    notes: 'The most direct loading of the deep six. Clamshells are the unloaded version '
         + 'of the same thing.',
  }),
  mv({
    id: 'clamshell', name: 'Clamshell', pattern: 'hip_abduction',
    equipmentTypeIds: ['band', 'bodyweight'],
    baseContributions: { hip_ext_rotators: 1.0, glute_med_min: 0.6, glute_max: 0.3 },
    axes: [ax('laterality', ['unilateral'], 'unilateral')],
    systemicLoad: 0.08, axialLoad: 0.02,
  }),
  mv({
    id: 'hip_adduction', name: 'Hip Adduction', pattern: 'hip_adduction',
    equipmentTypeIds: ['hip_adduction_machine', 'cable_tower', 'band'],
    baseContributions: { adductors: 1.0, adductor_magnus: 0.5 },
    axes: [ax('laterality', ['bilateral', 'unilateral'], 'bilateral')],
    systemicLoad: 0.15, axialLoad: 0.05,
    notes: 'Reaches adductor longus, brevis and gracilis, which squats barely touch — '
         + 'squats load adductor magnus instead, as a hip extensor.',
  }),
  mv({
    id: 'copenhagen_plank', name: 'Copenhagen Plank', pattern: 'hip_adduction',
    equipmentTypeIds: ['bodyweight', 'flat_bench'],
    baseContributions: {
      adductors: 1.0, adductor_magnus: 0.5, obliques: 0.6, deep_core: 0.5,
      quadratus_lumborum: 0.4, glute_med_min: 0.3,
    },
    axes: [ax('laterality', ['unilateral'], 'unilateral')],
    bodyweightFactor: 0.5, systemicLoad: 0.25, axialLoad: 0.1,
  }),
  mv({
    id: 'hip_flexion', name: 'Standing Hip Flexion', pattern: 'hip_hinge',
    equipmentTypeIds: ['cable_tower', 'band'],
    baseContributions: { hip_flexors: 1.0, quads_rf: 0.6, rectus_abdominis: 0.3 },
    axes: [
      ax('pulley_height', ['floor', 'low'], 'floor'),
      ax('attachment', ['ankle_strap'], 'ankle_strap'),
      ax('laterality', ['unilateral'], 'unilateral'),
    ],
    systemicLoad: 0.12, axialLoad: 0.05,
  }),

  /* ------------------------------------------------------------ ankle and foot */
  mv({
    id: 'standing_calf_raise', name: 'Standing Calf Raise', pattern: 'calf_raise',
    equipmentTypeIds: ['calf_raise_standing', 'smith_machine', 'bodyweight'],
    baseContributions: { calves_gastroc: 1.0, calves_soleus: 0.6, toe_flexors: 0.25 },
    axes: [
      ax('foot_rotation', ['neutral', 'internal', 'external'], 'neutral'),
      ax('laterality', ['bilateral', 'unilateral'], 'bilateral'),
      ax('rom_bias', ['full', 'lengthened_partial'], 'full'),
    ],
    systemicLoad: 0.2, axialLoad: 0.25,
    notes: 'Knee straight, so gastrocnemius is not shortened — the complement to the '
         + 'seated raise.',
  }),
  mv({
    id: 'seated_calf_raise', name: 'Seated Calf Raise', pattern: 'calf_raise',
    equipmentTypeIds: ['calf_raise_seated'],
    baseContributions: { calves_soleus: 1.0, calves_gastroc: 0.25, toe_flexors: 0.2 },
    axes: [
      ax('foot_rotation', ['neutral', 'internal', 'external'], 'neutral'),
      ax('rom_bias', ['full', 'lengthened_partial'], 'full'),
    ],
    systemicLoad: 0.15, axialLoad: 0.05,
    notes: 'Knee bent slackens gastrocnemius, leaving soleus to do the work.',
  }),
  mv({
    id: 'tibialis_raise', name: 'Tibialis Raise', pattern: 'calf_raise',
    equipmentTypeIds: ['bodyweight', 'band', 'plate'],
    baseContributions: { tibialis_ant: 1.0 },
    axes: [ax('laterality', ['bilateral', 'unilateral'], 'bilateral')],
    systemicLoad: 0.08, axialLoad: 0.02,
  }),
  mv({
    id: 'ankle_eversion', name: 'Banded Ankle Eversion', pattern: 'calf_raise',
    equipmentTypeIds: ['band', 'cable_tower'],
    baseContributions: { ankle_evertors: 1.0, calves_soleus: 0.2 },
    axes: [ax('laterality', ['unilateral'], 'unilateral')],
    systemicLoad: 0.06, axialLoad: 0.02,
    notes: 'Standard after a lateral ankle sprain — the evertors are what failed.',
  }),
  mv({
    id: 'ankle_inversion', name: 'Banded Ankle Inversion', pattern: 'calf_raise',
    equipmentTypeIds: ['band', 'cable_tower'],
    baseContributions: { ankle_invertors: 1.0, toe_flexors: 0.25, calves_soleus: 0.2 },
    axes: [ax('laterality', ['unilateral'], 'unilateral')],
    systemicLoad: 0.06, axialLoad: 0.02,
  }),
  mv({
    id: 'toe_curl', name: 'Toe Curl', pattern: 'calf_raise',
    equipmentTypeIds: ['band', 'plate', 'bodyweight'],
    baseContributions: { toe_flexors: 1.0, ankle_invertors: 0.3 },
    axes: [ax('laterality', ['bilateral', 'unilateral'], 'bilateral')],
    systemicLoad: 0.05, axialLoad: 0.02,
    notes: 'Arch and plantar-fascia work. The most niche movement in the catalog — '
         + 'included because toe_flexors would otherwise have no route to load.',
  }),
  mv({
    id: 'leg_press_calf_raise', name: 'Leg Press Calf Raise', pattern: 'calf_raise',
    equipmentTypeIds: ['leg_press'],
    baseContributions: { calves_gastroc: 1.0, calves_soleus: 0.55, toe_flexors: 0.3 },
    axes: [
      ax('stance', ['narrow', 'shoulder', 'wide'], 'shoulder'),
      ax('laterality', ['bilateral', 'unilateral'], 'bilateral'),
    ],
    systemicLoad: 0.15, axialLoad: 0.05,
  }),
]

/** Muscle vocabulary. Resolved at the head level wherever a commonly programmed
 *  choice actually changes the ratio of work. See docs/data-model.md §2. */

export const REGIONS = [
  'chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'neck',
] as const
export type Region = (typeof REGIONS)[number]

/** `halfLifeH` is a HALF-life, not a full-recovery time: roughly three of them
 *  is practical full recovery. Getting that wrong makes the model refuse to
 *  train anything twice a week. */
export const MUSCLES = {
  pec_upper:          { region: 'chest',     name: 'Upper chest',        halfLifeH: 22 },
  pec_mid:            { region: 'chest',     name: 'Mid chest',          halfLifeH: 22 },
  pec_lower:          { region: 'chest',     name: 'Lower chest',        halfLifeH: 22 },

  // Teres major is folded in here, not given its own unit: it shares all three
  // of the lats' actions and no movement in the catalog can shift the ratio
  // between them. The coverage report caught it as an orphan.
  lats:               { region: 'back',      name: 'Lats',               halfLifeH: 26 },
  traps_upper:        { region: 'back',      name: 'Upper traps',        halfLifeH: 18 },
  traps_mid:          { region: 'back',      name: 'Mid traps',          halfLifeH: 18 },
  traps_lower:        { region: 'back',      name: 'Lower traps',        halfLifeH: 18 },
  rhomboids:          { region: 'back',      name: 'Rhomboids',          halfLifeH: 18 },
  erectors:           { region: 'back',      name: 'Spinal erectors',    halfLifeH: 26 },

  delt_front:         { region: 'shoulders', name: 'Front delt',         halfLifeH: 20 },
  delt_lateral:       { region: 'shoulders', name: 'Side delt',          halfLifeH: 16 },
  delt_rear:          { region: 'shoulders', name: 'Rear delt',          halfLifeH: 16 },
  // The cuff is three units, not one: infraspinatus/teres minor externally
  // rotate and subscapularis internally rotates. Sharing a unit meant face
  // pulls registered as fatiguing internal rotation.
  supraspinatus:      { region: 'shoulders', name: 'Supraspinatus',      halfLifeH: 13 },
  cuff_ext_rotators:  { region: 'shoulders', name: 'Cuff (ext. rotators)', halfLifeH: 13 },
  subscapularis:      { region: 'shoulders', name: 'Subscapularis',      halfLifeH: 13 },

  biceps_long:        { region: 'arms',      name: 'Biceps long head',   halfLifeH: 18 },
  biceps_short:       { region: 'arms',      name: 'Biceps short head',  halfLifeH: 18 },
  brachialis:         { region: 'arms',      name: 'Brachialis',         halfLifeH: 18 },
  brachioradialis:    { region: 'arms',      name: 'Brachioradialis',    halfLifeH: 14 },
  triceps_long:       { region: 'arms',      name: 'Triceps long head',  halfLifeH: 19 },
  triceps_lateral:    { region: 'arms',      name: 'Triceps lateral',    halfLifeH: 18 },
  triceps_medial:     { region: 'arms',      name: 'Triceps medial',     halfLifeH: 18 },
  forearm_flexors:    { region: 'arms',      name: 'Forearm flexors',    halfLifeH: 13 },
  forearm_extensors:  { region: 'arms',      name: 'Forearm extensors',  halfLifeH: 13 },

  quads_rf:           { region: 'legs',      name: 'Rectus femoris',     halfLifeH: 26 },
  quads_vasti:        { region: 'legs',      name: 'Vasti',              halfLifeH: 28 },
  // Split: only the long head of biceps femoris crosses the hip, so an RDL and
  // a leg curl do not train the same thing. Tibial rotation (toes in/out on
  // curls) biases medial against lateral, which the config axes can express.
  hams_lateral:       { region: 'legs',      name: 'Hamstrings (lateral)', halfLifeH: 27 },
  hams_medial:        { region: 'legs',      name: 'Hamstrings (medial)',  halfLifeH: 27 },
  glute_max:          { region: 'legs',      name: 'Glute max',          halfLifeH: 26 },
  glute_med_min:      { region: 'legs',      name: 'Glute med/min',      halfLifeH: 18 },
  // The deep six are external rotators, not abductors. Clamshells and hip
  // airplanes are not abduction volume.
  hip_ext_rotators:   { region: 'legs',      name: 'Deep hip rotators',  halfLifeH: 15 },
  adductors:          { region: 'legs',      name: 'Adductors',          halfLifeH: 22 },
  // Adductor magnus is one of the largest hip extensors. Squats hammer it;
  // the adduction machine barely touches it.
  adductor_magnus:    { region: 'legs',      name: 'Adductor magnus',    halfLifeH: 25 },
  hip_flexors:        { region: 'legs',      name: 'Hip flexors',        halfLifeH: 18 },
  calves_gastroc:     { region: 'legs',      name: 'Gastrocnemius',      halfLifeH: 14 },
  calves_soleus:      { region: 'legs',      name: 'Soleus',             halfLifeH: 14 },
  tibialis_ant:       { region: 'legs',      name: 'Dorsiflexors',       halfLifeH: 13 },
  // Evertors and invertors are antagonists; they had been sharing the soleus
  // unit with the plantarflexors.
  ankle_evertors:     { region: 'legs',      name: 'Ankle evertors',     halfLifeH: 13 },
  ankle_invertors:    { region: 'legs',      name: 'Ankle invertors',    halfLifeH: 13 },
  toe_flexors:        { region: 'legs',      name: 'Toe flexors',        halfLifeH: 11 },

  rectus_abdominis:   { region: 'core',      name: 'Abs',                halfLifeH: 15 },
  obliques:           { region: 'core',      name: 'Obliques',           halfLifeH: 15 },
  quadratus_lumborum: { region: 'core',      name: 'Quadratus lumborum', halfLifeH: 18 },
  // Bracing and anti-rotation work — TVA and the segmental stabilisers — is a
  // different stimulus from crunches and from spinal extension.
  deep_core:          { region: 'core',      name: 'Deep core',          halfLifeH: 15 },

  // Neck flexion and extension are antagonists and were sharing one unit.
  neck_flexors:       { region: 'neck',      name: 'Neck flexors',       halfLifeH: 13 },
  neck_extensors:     { region: 'neck',      name: 'Neck extensors',     halfLifeH: 13 },
} as const satisfies Record<string, { region: Region; name: string; halfLifeH: number }>

export type MuscleId = keyof typeof MUSCLES

/** Resolved work per muscle. 1.0 = prime mover, ~0.3 = meaningful secondary,
 *  ~0.1 = stabilizer. Absent key means no contribution. */
export type MuscleVector = Partial<Record<MuscleId, number>>

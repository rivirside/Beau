/** Muscle vocabulary. Resolved at the head level wherever a commonly programmed
 *  choice actually changes the ratio of work. See docs/data-model.md §2. */

export const REGIONS = [
  'chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'neck',
] as const
export type Region = (typeof REGIONS)[number]

export const MUSCLES = {
  pec_upper:          { region: 'chest',     name: 'Upper chest',        halfLifeH: 60 },
  pec_mid:            { region: 'chest',     name: 'Mid chest',          halfLifeH: 60 },
  pec_lower:          { region: 'chest',     name: 'Lower chest',        halfLifeH: 60 },

  lats:               { region: 'back',      name: 'Lats',               halfLifeH: 66 },
  teres_major:        { region: 'back',      name: 'Teres major',        halfLifeH: 54 },
  traps_upper:        { region: 'back',      name: 'Upper traps',        halfLifeH: 48 },
  traps_mid:          { region: 'back',      name: 'Mid traps',          halfLifeH: 48 },
  traps_lower:        { region: 'back',      name: 'Lower traps',        halfLifeH: 48 },
  rhomboids:          { region: 'back',      name: 'Rhomboids',          halfLifeH: 48 },
  erectors:           { region: 'back',      name: 'Spinal erectors',    halfLifeH: 72 },

  delt_front:         { region: 'shoulders', name: 'Front delt',         halfLifeH: 54 },
  delt_lateral:       { region: 'shoulders', name: 'Side delt',          halfLifeH: 42 },
  delt_rear:          { region: 'shoulders', name: 'Rear delt',          halfLifeH: 42 },
  // The cuff is three units, not one: infraspinatus/teres minor externally
  // rotate and subscapularis internally rotates. Sharing a unit meant face
  // pulls registered as fatiguing internal rotation.
  supraspinatus:      { region: 'shoulders', name: 'Supraspinatus',      halfLifeH: 36 },
  cuff_ext_rotators:  { region: 'shoulders', name: 'Cuff (ext. rotators)', halfLifeH: 36 },
  subscapularis:      { region: 'shoulders', name: 'Subscapularis',      halfLifeH: 36 },

  biceps_long:        { region: 'arms',      name: 'Biceps long head',   halfLifeH: 48 },
  biceps_short:       { region: 'arms',      name: 'Biceps short head',  halfLifeH: 48 },
  brachialis:         { region: 'arms',      name: 'Brachialis',         halfLifeH: 48 },
  brachioradialis:    { region: 'arms',      name: 'Brachioradialis',    halfLifeH: 40 },
  triceps_long:       { region: 'arms',      name: 'Triceps long head',  halfLifeH: 52 },
  triceps_lateral:    { region: 'arms',      name: 'Triceps lateral',    halfLifeH: 48 },
  triceps_medial:     { region: 'arms',      name: 'Triceps medial',     halfLifeH: 48 },
  forearm_flexors:    { region: 'arms',      name: 'Forearm flexors',    halfLifeH: 36 },
  forearm_extensors:  { region: 'arms',      name: 'Forearm extensors',  halfLifeH: 36 },

  quads_rf:           { region: 'legs',      name: 'Rectus femoris',     halfLifeH: 66 },
  quads_vasti:        { region: 'legs',      name: 'Vasti',              halfLifeH: 72 },
  // Split: only the long head of biceps femoris crosses the hip, so an RDL and
  // a leg curl do not train the same thing. Tibial rotation (toes in/out on
  // curls) biases medial against lateral, which the config axes can express.
  hams_lateral:       { region: 'legs',      name: 'Hamstrings (lateral)', halfLifeH: 72 },
  hams_medial:        { region: 'legs',      name: 'Hamstrings (medial)',  halfLifeH: 72 },
  glute_max:          { region: 'legs',      name: 'Glute max',          halfLifeH: 66 },
  glute_med_min:      { region: 'legs',      name: 'Glute med/min',      halfLifeH: 48 },
  // The deep six are external rotators, not abductors. Clamshells and hip
  // airplanes are not abduction volume.
  hip_ext_rotators:   { region: 'legs',      name: 'Deep hip rotators',  halfLifeH: 42 },
  adductors:          { region: 'legs',      name: 'Adductors',          halfLifeH: 60 },
  // Adductor magnus is one of the largest hip extensors. Squats hammer it;
  // the adduction machine barely touches it.
  adductor_magnus:    { region: 'legs',      name: 'Adductor magnus',    halfLifeH: 66 },
  hip_flexors:        { region: 'legs',      name: 'Hip flexors',        halfLifeH: 48 },
  calves_gastroc:     { region: 'legs',      name: 'Gastrocnemius',      halfLifeH: 36 },
  calves_soleus:      { region: 'legs',      name: 'Soleus',             halfLifeH: 36 },
  tibialis_ant:       { region: 'legs',      name: 'Dorsiflexors',       halfLifeH: 36 },
  // Evertors and invertors are antagonists; they had been sharing the soleus
  // unit with the plantarflexors.
  ankle_evertors:     { region: 'legs',      name: 'Ankle evertors',     halfLifeH: 36 },
  ankle_invertors:    { region: 'legs',      name: 'Ankle invertors',    halfLifeH: 36 },
  toe_flexors:        { region: 'legs',      name: 'Toe flexors',        halfLifeH: 30 },

  rectus_abdominis:   { region: 'core',      name: 'Abs',                halfLifeH: 42 },
  obliques:           { region: 'core',      name: 'Obliques',           halfLifeH: 42 },
  quadratus_lumborum: { region: 'core',      name: 'Quadratus lumborum', halfLifeH: 48 },
  // Bracing and anti-rotation work — TVA and the segmental stabilisers — is a
  // different stimulus from crunches and from spinal extension.
  deep_core:          { region: 'core',      name: 'Deep core',          halfLifeH: 42 },

  // Neck flexion and extension are antagonists and were sharing one unit.
  neck_flexors:       { region: 'neck',      name: 'Neck flexors',       halfLifeH: 36 },
  neck_extensors:     { region: 'neck',      name: 'Neck extensors',     halfLifeH: 36 },
} as const satisfies Record<string, { region: Region; name: string; halfLifeH: number }>

export type MuscleId = keyof typeof MUSCLES

/** Resolved work per muscle. 1.0 = prime mover, ~0.3 = meaningful secondary,
 *  ~0.1 = stabilizer. Absent key means no contribution. */
export type MuscleVector = Partial<Record<MuscleId, number>>

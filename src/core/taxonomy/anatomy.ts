/** Anatomy layer. Additive to the engine: it can grow toward ~600 muscles
 *  without touching a line of engine code, because every anatomical muscle maps
 *  into a TrainableUnit that the engine already understands.
 *  See docs/anatomy-model.md */

import type { MuscleId as TrainableUnitId } from './muscles'

export type { TrainableUnitId }

/** Anatomical regions, deliberately NOT the engine's gym regions. A medical
 *  student browsing the library wants "forearm" and "hand" as separate places;
 *  the engine wants "arms". Each layer keeps its own vocabulary, and
 *  trainableUnitId bridges them. */
export const ANATOMICAL_REGIONS = [
  'head', 'neck', 'thorax', 'abdomen', 'back', 'pelvis', 'perineum',
  'shoulder', 'arm', 'forearm', 'hand',
  'hip', 'thigh', 'leg', 'foot',
] as const
export type AnatomicalRegion = (typeof ANATOMICAL_REGIONS)[number]

/* ------------------------------------------------------------------ skeleton */

/** Gross shape, the way bones are classified in an anatomy course. */
export type BoneClass = 'long' | 'short' | 'flat' | 'irregular' | 'sesamoid'

export interface Bone {
  id: string
  name: string
  latin?: string
  region: AnatomicalRegion
  /** Axial skeleton (80 bones) or appendicular (126). */
  division: 'axial' | 'appendicular'
  class: BoneClass
  /** Paired bones are stored once with count 2, so the library lists ~90 named
   *  bones that add up to the standard 206. */
  paired: boolean
  count: number
  /** Bones this one articulates with — a card type of its own. */
  articulatesWith?: string[]
  notes?: string
}

/** The kind of feature a landmark is. Anatomy courses drill this vocabulary
 *  directly ("name three examples of a tuberosity"), so it is worth typing. */
export const LANDMARK_TYPES = [
  'process', 'tubercle', 'tuberosity', 'trochanter', 'condyle', 'epicondyle',
  'head', 'neck', 'shaft', 'border', 'angle', 'crest', 'line', 'ridge',
  'spine', 'fossa', 'foramen', 'notch', 'groove', 'facet', 'fascia',
  'ligament', 'membrane', 'aponeurosis', 'surface', 'region',
] as const
export type LandmarkType = (typeof LANDMARK_TYPES)[number]

/** Attachments reference landmarks rather than storing prose, which is what
 *  makes "what attaches to the coracoid process?" a graph walk. §2 */
export interface Landmark {
  id: string
  name: string
  /** Absent for soft-tissue attachment sites — the thoracolumbar fascia, the
   *  iliotibial band, the interosseous membranes — which are real attachment
   *  points but belong to no bone. */
  boneId?: string
  type?: LandmarkType
}

export interface Attachment {
  landmarkId: string
  /** Prose detail preserved alongside the reference, not instead of it. */
  detail?: string
}

/* -------------------------------------------------------------------- joints */

export const JOINT_ACTIONS = [
  'flexion', 'extension', 'abduction', 'adduction',
  'internal_rotation', 'external_rotation',
  'horizontal_adduction', 'horizontal_abduction',
  'elevation', 'depression', 'protraction', 'retraction',
  'upward_rotation', 'downward_rotation',
  'pronation', 'supination',
  'dorsiflexion', 'plantarflexion', 'inversion', 'eversion',
  'lateral_flexion', 'rotation', 'opposition', 'circumduction',
] as const
export type JointActionName = (typeof JOINT_ACTIONS)[number]

/** Opposing pairs. This table is the reason synergists and antagonists can be
 *  derived instead of hand-maintained. §3 */
export const OPPOSING_ACTIONS: Partial<Record<JointActionName, JointActionName>> = {
  flexion: 'extension',                     extension: 'flexion',
  abduction: 'adduction',                   adduction: 'abduction',
  internal_rotation: 'external_rotation',   external_rotation: 'internal_rotation',
  horizontal_adduction: 'horizontal_abduction',
  horizontal_abduction: 'horizontal_adduction',
  elevation: 'depression',                  depression: 'elevation',
  protraction: 'retraction',                retraction: 'protraction',
  upward_rotation: 'downward_rotation',     downward_rotation: 'upward_rotation',
  pronation: 'supination',                  supination: 'pronation',
  dorsiflexion: 'plantarflexion',           plantarflexion: 'dorsiflexion',
  inversion: 'eversion',                    eversion: 'inversion',
}

export type JointType =
  | 'ball_and_socket' | 'hinge' | 'pivot' | 'condyloid'
  | 'saddle' | 'plane' | 'cartilaginous'

export interface Joint {
  id: string
  name: string
  type: JointType
  boneIds: string[]
  actions: JointActionName[]
}

export interface MuscleAction {
  joint: string
  action: JointActionName
  role: 'prime' | 'assist' | 'stabilize'
  /** Some actions only apply through part of the range or from a given position
   *  — e.g. pec major assists shoulder flexion only up to about 60°. */
  qualifier?: string
}

/* --------------------------------------------------------------------- nerves */

export type Plexus = 'cervical' | 'brachial' | 'lumbar' | 'sacral' | 'none'

export interface Nerve {
  id: string
  name: string
  plexus: Plexus
  parentId?: string
  /** Spinal root levels, e.g. ['C5','C6']. */
  roots: string[]
}

export interface Innervation {
  nerveId: string
  roots: string[]
  note?: string
}

/* -------------------------------------------------------------------- vessels */

export interface Artery {
  id: string
  name: string
  parentId?: string
  region: AnatomicalRegion | 'systemic'
}

export interface BloodSupply {
  arteryId: string
  note?: string
}

/* -------------------------------------------------------------------- muscles */

export type ReviewStatus = 'draft' | 'reviewed' | 'verified'

/** A named part of a muscle with its own attachment or action profile — the
 *  clavicular head of pec major, the long head of triceps. Heads are what the
 *  engine's finer TrainableUnits actually correspond to. */
export interface MuscleHead {
  id: string
  name: string
  origin: Attachment[]
  insertion?: Attachment[]
  trainableUnitId?: TrainableUnitId
  actions?: MuscleAction[]
}

export interface AnatomicalMuscle {
  id: string
  name: string
  /** Terminologia Anatomica / Latin name. */
  latin: string
  region: AnatomicalRegion
  /** Anatomical grouping, e.g. 'rotator cuff', 'hamstrings', 'deep hip rotators'. */
  group?: string
  compartment?: string
  origin: Attachment[]
  insertion: Attachment[]
  innervation: Innervation[]
  actions: MuscleAction[]
  /** Actions that are not movements at a joint — the muscles of facial
   *  expression move skin, sphincters close orifices, the diaphragm changes a
   *  cavity's volume. Kept separate from `actions` so the derived synergist and
   *  antagonist logic, which is defined over joints, stays sound. */
  functions?: string[]
  heads?: MuscleHead[]
  bloodSupply?: BloodSupply[]
  /** Where this lands in the engine's vocabulary. Many muscles map to one unit;
   *  a muscle with heads may map per head instead. Left undefined for muscles
   *  the engine has no business programming — the intrinsic muscles of the hand,
   *  the muscles of facial expression — which is how the library grows toward
   *  medical-school completeness without the engine ever seeing them. §1 */
  trainableUnitId?: TrainableUnitId
  /** Can it be felt or seen? Drives a "find it on yourself" card type. */
  palpable?: boolean
  notes?: string
  reviewStatus: ReviewStatus
  sources?: string[]
}

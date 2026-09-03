/** Anatomy layer. Additive to the engine: it can grow toward ~600 muscles
 *  without touching a line of engine code, because every anatomical muscle maps
 *  into a TrainableUnit that the engine already understands.
 *  See docs/anatomy-model.md */

import type { MuscleId as TrainableUnitId, Region } from './muscles'

export type { TrainableUnitId }

/* ------------------------------------------------------------------ skeleton */

export interface Bone {
  id: string
  name: string
  region: Region | 'axial' | 'girdle'
}

/** Attachments reference landmarks rather than storing prose, which is what
 *  makes "what attaches to the coracoid process?" a graph walk. §2 */
export interface Landmark {
  id: string
  name: string
  boneId: string
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
  region: Region | 'axial'
  /** Anatomical grouping, e.g. 'rotator cuff', 'hamstrings', 'deep hip rotators'. */
  group?: string
  compartment?: string
  origin: Attachment[]
  insertion: Attachment[]
  innervation: Innervation[]
  actions: MuscleAction[]
  heads?: MuscleHead[]
  /** Where this lands in the engine's vocabulary. Many muscles map to one unit;
   *  a muscle with heads may map per head instead. */
  trainableUnitId?: TrainableUnitId
  /** Can it be felt or seen? Drives a "find it on yourself" card type. */
  palpable?: boolean
  notes?: string
  reviewStatus: ReviewStatus
  sources?: string[]
}

/** Core entities. Deliberately free of DOM, IndexedDB and framework types so
 *  this module ports to Swift as a mechanical translation and can be unit
 *  tested standalone. See docs/data-model.md */

import type { MuscleId, MuscleVector } from './taxonomy/muscles'
import type { AxisId } from './taxonomy/axes'

export const MOVEMENT_PATTERNS = [
  'horizontal_press', 'vertical_press', 'horizontal_pull', 'vertical_pull',
  'squat', 'hip_hinge', 'lunge', 'knee_flexion', 'knee_extension',
  'hip_abduction', 'hip_adduction', 'calf_raise',
  'elbow_flexion', 'elbow_extension', 'shoulder_raise', 'shoulder_rotation',
  'trunk_flexion', 'trunk_rotation', 'trunk_extension', 'carry', 'other',
] as const
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number]

/** Which axes a movement exposes, and what each value does to its muscle
 *  contributions. Values are multipliers applied to the base vector. */
export interface MovementAxis {
  axis: AxisId
  values: string[]
  default: string
  modifiers?: Record<string, MuscleVector>
}

export interface Movement {
  id: string
  name: string
  pattern: MovementPattern
  equipmentTypeIds: string[]
  baseContributions: MuscleVector
  axes: MovementAxis[]
  /** Fraction of bodyweight moved, for bodyweight movements. §12.2 */
  bodyweightFactor?: number
  /** Whole-body cost beyond the muscles worked; budgets a session. 0–1. */
  systemicLoad: number
  /** Spinal loading, for capping how many heavy axial movements land in a day. */
  axialLoad: number
  /** Curated movements are auto-prescribed; imported ones are loggable only. §11 */
  source: 'curated' | 'imported' | 'user'
  /** Why this movement is in the catalog, or what it is uniquely good for.
   *  Surfaced when the generator explains a pick. */
  notes?: string
  instructions?: string[]
  images?: string[]
  vendorId?: string
}

/** A resolved, loggable exercise: movement + concrete axis values. Derived from
 *  the movement rather than hand-authored. */
export interface Variant {
  /** Deterministic and human-readable, e.g.
   *  `cable_fly@pulley_height:high|attachment:d_handle`. History keys on this,
   *  so it must survive a catalog rebuild and be legible in an export. §5 */
  id: string
  movementId: string
  equipmentTypeId: string
  config: Partial<Record<AxisId, string>>
  displayName: string
  /** Cached result of base × every selected value's modifiers. Not renormalized:
   *  magnitude carries real information about how much work is done. */
  contributions: MuscleVector
}

export type SetKind = 'warmup' | 'working' | 'backoff' | 'amrap' | 'drop' | 'myorep'

export interface SetLog {
  id: string
  variantId: string
  /** ISO 8601 with offset. */
  performedAt: string
  setIndex: number
  kind: SetKind
  /** Canonical kilograms; null for unloaded bodyweight. */
  weightKg: number | null
  /** Weighted dips/pull-ups. Negative means assisted. */
  addedWeightKg?: number
  reps: number
  /** Reps in reserve. Optional, but the highest-value field in the schema: a set
   *  to failure and a set with four left must not look identical. §6 */
  rir?: number
  restSecBefore?: number
  equipmentInstanceId?: string
  notes?: string
}

export interface Workout {
  id: string
  gymId: string
  startedAt: string
  endedAt?: string
  /** Set at log time so an lb→kg→lb round trip displays 135, not 134.9. */
  displayUnit: 'kg' | 'lb'
  entries: WorkoutEntry[]
  notes?: string
}

export interface WorkoutEntry {
  id: string
  variantId: string
  order: number
  /** What the engine proposed, kept alongside what happened, so the engine can
   *  be evaluated against reality later. */
  prescribed?: { sets: number; repRange: [number, number]; targetKg: number | null; targetRir: number }
  sets: SetLog[]
  /** Set when the user swapped away from a generated pick — training signal. */
  substitutedFromVariantId?: string
}

/** Rolling per-variant progression state. Recomputable from history; cached. */
export interface ProgressionState {
  variantId: string
  estimated1rmKg: number
  lastWorkingWeightKg: number
  lastTopSetReps: number
  consecutiveStalls: number
  updatedAt: string
}

/** Per-muscle fatigue at a point in time. Recomputable from history; cached. */
export interface FatigueState {
  computedAt: string
  /** Decayed accumulated stimulus, unitless. */
  load: Partial<Record<MuscleId, number>>
  /** 0 = fully fatigued, 1 = fully recovered. */
  freshness: Partial<Record<MuscleId, number>>
  /** Rolling 28-day baseline used to normalize. Personal, self-calibrating. */
  capacity: Partial<Record<MuscleId, number>>
}

export interface UserProfile {
  id: string
  bodyweightKg?: number
  displayUnit: 'kg' | 'lb'
  defaultGymId: string
  /** Weekly working-set targets per muscle. Drives generation's "need". */
  weeklyVolumeTargets: Partial<Record<MuscleId, number>>
  excludedMovementIds: string[]
  /** Muscles to train around rather than through. */
  restrictedMuscleIds: MuscleId[]
}

/** The canonical interchange format. Because the PWA is a real training log that
 *  has to survive the port to Swift, this is the migration path, not a
 *  nice-to-have. Round-trip tested. §10 */
export interface ExportDocument {
  schemaVersion: number
  exportedAt: string
  profile: UserProfile
  gyms: unknown[]
  equipment: unknown[]
  customMovements: Movement[]
  workouts: Workout[]
}

export const SCHEMA_VERSION = 1

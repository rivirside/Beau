/** One place that turns a picked variant into sets × reps @ weight, so Today's
 *  review cards and the session that starts from them cannot disagree. */

import type { PickedExercise } from '../core/engine/generate'
import type { WorkoutEntry } from '../core/types'
import { prescribe, type Prescription, type ProgressionState } from '../core/engine/progression'
import { equipmentById } from '../core/equipment/catalog'
import type { Profile } from './db'
import { VARIANTS } from './store'

export function prescriptionFor(
  pick: PickedExercise, profile: Profile, progression: Map<string, ProgressionState>,
): Prescription {
  const loading = equipmentById(pick.movement.equipmentTypeIds[0]!)!.defaultLoading
  const bwBase = pick.movement.bodyweightFactor
    ? profile.bodyweightKg * pick.movement.bodyweightFactor : 0
  const sibling = [...progression.values()]
    .filter((s) => VARIANTS.get(s.variantId)?.movement.id === pick.movement.id)
    .sort((a, b) => b.sessions - a.sessions)[0]
  return prescribe(progression.get(pick.variant.id), undefined, loading, {
    sets: pick.sets, unit: profile.displayUnit,
    bodyweightKg: profile.bodyweightKg, bodyweightBaseKg: bwBase,
    seedFromKg: sibling?.lastWorkingWeightKg,
  })
}

export function entryFor(
  pick: PickedExercise, order: number, p: Prescription,
): WorkoutEntry {
  return {
    id: crypto.randomUUID(), variantId: pick.variant.id, order,
    prescribed: { sets: p.sets, repRange: [p.repRange.min, p.repRange.max],
                  targetKg: p.targetKg, targetRir: p.targetRir,
                  ...(p.firstTime ? { firstTime: true } : {}) },
    sets: [],
  }
}

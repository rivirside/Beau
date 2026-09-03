/** Workout generation.
 *
 *  Greedy, deterministic, and fully offline: compute what each muscle is owed,
 *  score every variant the user's equipment can produce against that need, take
 *  the best, subtract what it satisfies, repeat until a budget runs out.
 *  See docs/data-model.md §9 */

import type { Movement, Variant, SetLog } from '../types'
import type { MuscleId } from '../taxonomy/muscles'
import { MUSCLES } from '../taxonomy/muscles'
import { buildVariantIndex, type IndexedVariant } from '../movements'
import { GENERATION, DEFAULT_WEEKLY_TARGETS } from './constants'
import type { FatigueState } from './fatigue'

export interface GenerateInput {
  at: Date
  fatigue: FatigueState
  /** Equipment type ids available at the gym being trained in. */
  availableEquipment: Set<string>
  /** Every set logged in the trailing 7 days, for weekly volume accounting. */
  recentSets: SetLog[]
  variantIndex?: Map<string, IndexedVariant>
  weeklyTargets?: Partial<Record<MuscleId, number>>
  /** Movements the user never wants prescribed. */
  excludedMovementIds?: Set<string>
  /** Muscles to train around — anything contributing to them is dropped. */
  restrictedMuscles?: Set<MuscleId>
  /** Roughly how long the session should take. */
  minutesAvailable?: number
  /** Optional focus: only units in these regions are treated as owed. */
  regions?: Set<string>
  /** Variants the lifter already has progression history on. Without this the
   *  generator picks a slightly different variant every session and nothing
   *  ever accumulates enough sessions to progress. */
  familiarVariantIds?: Set<string>
}

export interface PickedExercise {
  variant: Variant
  movement: Movement
  sets: number
  /** What this pick was chosen to satisfy, best first. */
  targets: { muscle: MuscleId; need: number; contribution: number }[]
  score: number
  rationale: string
}

export interface GeneratedWorkout {
  at: string
  exercises: PickedExercise[]
  systemicUsed: number
  axialUsed: number
  /** Units still owed volume that nothing could satisfy today. */
  unmet: { muscle: MuscleId; remaining: number }[]
}

const SETS_PER_PICK = 3

/** Weekly sets already banked per unit. A set counts toward a muscle in
 *  proportion to how much of the work that muscle actually did. */
function setsThisWeek(
  recentSets: SetLog[], index: Map<string, IndexedVariant>,
): Partial<Record<MuscleId, number>> {
  const out: Partial<Record<MuscleId, number>> = {}
  for (const set of recentSets) {
    if (set.kind === 'warmup') continue
    const contributions = index.get(set.variantId)?.variant.contributions
    if (!contributions) continue
    for (const [muscle, value] of Object.entries(contributions) as [MuscleId, number][]) {
      if (value < 0.3) continue
      out[muscle] = (out[muscle] ?? 0) + Math.min(1, value)
    }
  }
  return out
}

export function generateWorkout(input: GenerateInput): GeneratedWorkout {
  const index = input.variantIndex ?? buildVariantIndex()
  const targets = input.weeklyTargets ?? DEFAULT_WEEKLY_TARGETS
  const banked = setsThisWeek(input.recentSets, index)
  const excluded = input.excludedMovementIds ?? new Set()
  const restricted = input.restrictedMuscles ?? new Set()

  /** What each unit is still owed this week. */
  const need = new Map<MuscleId, number>()
  for (const [muscle, target] of Object.entries(targets) as [MuscleId, number][]) {
    if (!target) continue
    if (restricted.has(muscle)) continue
    if (input.regions && !input.regions.has(MUSCLES[muscle].region)) continue
    const remaining = target - (banked[muscle] ?? 0)
    if (remaining > 0) need.set(muscle, remaining)
  }

  // Candidate variants: equipment on hand, movement not excluded, nothing that
  // loads a restricted muscle.
  const candidates: IndexedVariant[] = []
  for (const entry of index.values()) {
    if (excluded.has(entry.movement.id)) continue
    if (!entry.movement.equipmentTypeIds.every((id) => input.availableEquipment.has(id))) continue
    if ([...restricted].some((m) => (entry.variant.contributions[m] ?? 0) >= 0.3)) continue
    candidates.push(entry)
  }

  const recentMovements = new Set<string>()
  const cutoff = input.at.getTime() - GENERATION.recentMovementDays * 86_400_000
  for (const set of input.recentSets) {
    if (new Date(set.performedAt).getTime() < cutoff) continue
    const movement = index.get(set.variantId)?.movement.id
    if (movement) recentMovements.add(movement)
  }

  const minutes = input.minutesAvailable ?? 60
  let systemicLeft = GENERATION.systemicBudget
  let axialLeft = GENERATION.axialBudget
  let minutesLeft = minutes
  const picked: PickedExercise[] = []
  const usedMovements = new Set<string>()
  let firstScore = 0

  while (need.size > 0 && minutesLeft >= SETS_PER_PICK * GENERATION.minutesPerSet) {
    let best: PickedExercise | null = null

    for (const entry of candidates) {
      const { variant, movement } = entry
      if (usedMovements.has(movement.id)) continue
      if (movement.systemicLoad > systemicLeft || movement.axialLoad > axialLeft) continue

      const targetsHit: PickedExercise['targets'] = []
      let score = 0
      for (const [muscle, remaining] of need) {
        const contribution = variant.contributions[muscle] ?? 0
        if (contribution < 0.3) continue
        const freshness = input.fatigue.freshness[muscle] ?? 1
        // Fatigued muscles are worth less, not nothing: a compound that hits one
        // tired muscle among four fresh ones is still a good pick.
        const weight = freshness < GENERATION.freshnessFloor ? 0.15 : freshness
        score += remaining * contribution * weight
        targetsHit.push({ muscle, need: remaining, contribution })
      }
      if (score <= 0) continue

      if (recentMovements.has(movement.id)) score *= GENERATION.recentMovementPenalty
      // Prefer the standard setup. Some axis modifier almost always flatters the
      // target muscle, so without this the generator never programs a plain
      // bench press — it always finds a fancier variant that scores a hair higher.
      const tweaks = Object.keys(variant.config).filter((axis) =>
        variant.config[axis as keyof typeof variant.config] !==
          movement.axes.find((a) => a.axis === axis)?.default).length
      score *= 1 - GENERATION.configurationPenalty * tweaks
      // Continuity: progression needs the same exercise repeated.
      if (input.familiarVariantIds?.has(variant.id)) score *= GENERATION.familiarityBonus
      // Prefer variants that spend little of the systemic budget per unit of need.
      score /= 1 + movement.systemicLoad

      if (!best || score > best.score) {
        targetsHit.sort((a, b) => b.need * b.contribution - a.need * a.contribution)
        const lead = targetsHit[0]
        best = {
          variant, movement, sets: SETS_PER_PICK, targets: targetsHit, score,
          rationale: lead
            ? `${MUSCLES[lead.muscle].name} is owed ${lead.need.toFixed(1)} sets ` +
              `and reads ${Math.round((input.fatigue.freshness[lead.muscle] ?? 1) * 100)}% recovered.`
            : '',
        }
      }
    }

    if (!best) break
    if (picked.length === 0) firstScore = best.score
    else if (best.score < firstScore * GENERATION.minRelativeScore) break

    picked.push(best)
    usedMovements.add(best.movement.id)
    systemicLeft -= best.movement.systemicLoad
    axialLeft -= best.movement.axialLoad
    minutesLeft -= best.sets * GENERATION.minutesPerSet

    for (const { muscle, contribution } of best.targets) {
      const remaining = (need.get(muscle) ?? 0) - best.sets * Math.min(1, contribution)
      if (remaining > 0.5) need.set(muscle, remaining)
      else need.delete(muscle)
    }
  }

  return {
    at: input.at.toISOString(),
    exercises: picked,
    systemicUsed: Math.round((GENERATION.systemicBudget - systemicLeft) * 100) / 100,
    axialUsed: Math.round((GENERATION.axialBudget - axialLeft) * 100) / 100,
    unmet: [...need].map(([muscle, remaining]) => ({ muscle, remaining }))
      .sort((a, b) => b.remaining - a.remaining),
  }
}

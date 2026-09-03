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
  /** Finer focus — a push day is chest, front/side delts and triceps, which no
   *  region boundary expresses. Intersected with `regions` if both are given. */
  focusUnits?: Set<MuscleId>
  /** Exercises the user has already accepted. They stay, their satisfied need
   *  is subtracted first, and generation fills around them. This is what makes
   *  "reject this one, keep the rest" cheap. */
  lockedVariantIds?: string[]
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
    if (input.focusUnits && !input.focusUnits.has(muscle)) continue
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

  for (const id of input.lockedVariantIds ?? []) {
    const entry = index.get(id)
    if (!entry || usedMovements.has(entry.movement.id)) continue
    const targets: PickedExercise['targets'] = []
    for (const [muscle, remaining] of need) {
      const contribution = entry.variant.contributions[muscle] ?? 0
      if (contribution >= 0.3) targets.push({ muscle, need: remaining, contribution })
    }
    targets.sort((a, b) => b.need * b.contribution - a.need * a.contribution)
    picked.push({
      variant: entry.variant, movement: entry.movement, sets: SETS_PER_PICK, targets,
      score: Infinity, rationale: 'Kept from your review.',
    })
    usedMovements.add(entry.movement.id)
    systemicLeft -= entry.movement.systemicLoad
    axialLeft -= entry.movement.axialLoad
    minutesLeft -= SETS_PER_PICK * GENERATION.minutesPerSet
    for (const { muscle, contribution } of targets) {
      const remaining = (need.get(muscle) ?? 0) - SETS_PER_PICK * Math.min(1, contribution)
      if (remaining > 0.5) need.set(muscle, remaining)
      else need.delete(muscle)
    }
  }

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
    if (firstScore === 0) firstScore = best.score
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

/** Alternatives to a variant, most similar first: same job, different exercise.
 *  Used by the swap button. Ranked by cosine similarity of resolved muscle
 *  vectors, so there is no hand-maintained substitution table to rot. */
export function alternativesFor(
  variantId: string,
  opts: {
    availableEquipment: Set<string>
    excludedMovementIds?: Set<string>
    /** Movements already in the session, which a swap must not duplicate. */
    excludeMovementIds?: Set<string>
    variantIndex?: Map<string, IndexedVariant>
    limit?: number
  },
): IndexedVariant[] {
  const index = opts.variantIndex ?? buildVariantIndex()
  const source = index.get(variantId)
  if (!source) return []
  const a = source.variant.contributions
  const dot = (b: typeof a) => {
    let d = 0, na = 0, nb = 0
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<MuscleId>) {
      const x = a[k] ?? 0, y = b[k] ?? 0
      d += x * y; na += x * x; nb += y * y
    }
    return na && nb ? d / Math.sqrt(na * nb) : 0
  }

  const best = new Map<string, { entry: IndexedVariant; sim: number }>()
  for (const entry of index.values()) {
    if (entry.movement.id === source.movement.id) continue
    if (opts.excludedMovementIds?.has(entry.movement.id)) continue
    if (opts.excludeMovementIds?.has(entry.movement.id)) continue
    if (!entry.movement.equipmentTypeIds.every((e) => opts.availableEquipment.has(e))) continue
    // Prefer the default configuration of each movement; a swap should land on
    // the plain version unless the user then tweaks it.
    const tweaks = Object.keys(entry.variant.config).filter((axis) =>
      entry.variant.config[axis as keyof typeof entry.variant.config] !==
        entry.movement.axes.find((x) => x.axis === axis)?.default).length
    const sim = dot(entry.variant.contributions) * (1 - 0.04 * tweaks)
    const prev = best.get(entry.movement.id)
    if (!prev || sim > prev.sim) best.set(entry.movement.id, { entry, sim })
  }
  return [...best.values()]
    .sort((x, y) => y.sim - x.sim)
    .slice(0, opts.limit ?? 6)
    .map((x) => x.entry)
}

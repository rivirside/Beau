/** Per-muscle fatigue and recovery.
 *
 *  Deliberately a transparent decay model rather than anything learned: it is
 *  testable, deterministic, and it can explain itself, which is what the privacy
 *  positioning implies. See docs/data-model.md §7 */

import type { SetLog } from '../types'
import type { MuscleId, MuscleVector } from '../taxonomy/muscles'
import { MUSCLES } from '../taxonomy/muscles'
import { FATIGUE } from './constants'

export interface FatigueInput {
  sets: SetLog[]
  /** variantId → resolved muscle contributions. */
  contributionsFor: (variantId: string) => MuscleVector | undefined
  /** Needed to score bodyweight movements. */
  bodyweightKg?: number
  /** variantId → fraction of bodyweight moved, for bodyweight movements. */
  bodyweightFactorFor?: (variantId: string) => number | undefined
}

export interface FatigueState {
  computedAt: string
  load: Partial<Record<MuscleId, number>>
  capacity: Partial<Record<MuscleId, number>>
  freshness: Partial<Record<MuscleId, number>>
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

/** Weight actually moved by a set, including bodyweight where it applies. */
export function effectiveLoadKg(set: SetLog, input: FatigueInput): number {
  const bwFactor = input.bodyweightFactorFor?.(set.variantId)
  const external = (set.weightKg ?? 0) + (set.addedWeightKg ?? 0)
  if (bwFactor && input.bodyweightKg) return bwFactor * input.bodyweightKg + external
  return external
}

/** Sets taken closer to failure cost disproportionately more recovery. */
export const effortFactor = (rir: number | undefined) =>
  Math.exp(-FATIGUE.effortDecayPerRir * Math.max(0, rir ?? FATIGUE.assumedRir))

/** How much recovery debt one set creates for one muscle. Warm-ups excluded:
 *  they are real work but not the work the model is about. */
export function setStimulus(set: SetLog, muscle: MuscleId, input: FatigueInput): number {
  if (set.kind === 'warmup') return 0
  const contribution = input.contributionsFor(set.variantId)?.[muscle]
  if (!contribution) return 0
  const load = effectiveLoadKg(set, input)
  if (load <= 0) return 0
  return contribution * set.reps * load * effortFactor(set.rir)
}

/** Decayed accumulated stimulus per muscle at a moment in time. */
export function fatigueLoadAt(at: Date, input: FatigueInput): Partial<Record<MuscleId, number>> {
  const out: Partial<Record<MuscleId, number>> = {}
  const t = at.getTime()

  for (const set of input.sets) {
    const contributions = input.contributionsFor(set.variantId)
    if (!contributions) continue
    const elapsedH = (t - new Date(set.performedAt).getTime()) / 3_600_000
    if (elapsedH < 0) continue

    for (const key of Object.keys(contributions) as MuscleId[]) {
      const halfLife = MUSCLES[key].halfLifeH
      if (elapsedH > halfLife * FATIGUE.halfLivesConsidered) continue
      const stimulus = setStimulus(set, key, input)
      if (stimulus === 0) continue
      out[key] = (out[key] ?? 0) + stimulus * Math.pow(2, -elapsedH / halfLife)
    }
  }
  return out
}

/** Personal, self-calibrating scale: the mean of the largest daily fatigue peaks
 *  in the trailing window. Unitless, so absolute strength never enters. */
export function capacityFrom(at: Date, input: FatigueInput): Partial<Record<MuscleId, number>> {
  const windowStart = at.getTime() - FATIGUE.capacityWindowDays * 86_400_000
  const days = new Set<string>()
  for (const set of input.sets) {
    const ts = new Date(set.performedAt).getTime()
    if (ts >= windowStart && ts <= at.getTime()) days.add(set.performedAt.slice(0, 10))
  }

  const peaks = new Map<MuscleId, number[]>()
  for (const day of days) {
    // End of that training day, when its fatigue is at its highest.
    const endOfDay = new Date(`${day}T23:59:59.000Z`)
    const load = fatigueLoadAt(endOfDay > at ? at : endOfDay, input)
    for (const [key, value] of Object.entries(load) as [MuscleId, number][]) {
      const list = peaks.get(key)
      if (list) list.push(value)
      else peaks.set(key, [value])
    }
  }

  const out: Partial<Record<MuscleId, number>> = {}
  for (const [key, values] of peaks) {
    const top = values.sort((a, b) => b - a).slice(0, FATIGUE.capacityPeakCount)
    out[key] = top.reduce((a, b) => a + b, 0) / top.length
  }
  return out
}

export function computeFatigue(at: Date, input: FatigueInput): FatigueState {
  const load = fatigueLoadAt(at, input)
  const capacity = capacityFrom(at, input)
  const freshness: Partial<Record<MuscleId, number>> = {}

  for (const key of Object.keys(MUSCLES) as MuscleId[]) {
    const cap = capacity[key] ?? 0
    // No history means no scale; report fresh rather than inventing a number.
    freshness[key] = cap <= FATIGUE.capacityFloor ? 1 : clamp01(1 - (load[key] ?? 0) / cap)
  }
  return { computedAt: at.toISOString(), load, capacity, freshness }
}

/** Plain-language reason a muscle reads as it does. The model is only worth
 *  having if it can say why. */
export function explainFreshness(
  muscle: MuscleId, at: Date, state: FatigueState, input: FatigueInput,
): string {
  const pct = Math.round((state.freshness[muscle] ?? 1) * 100)
  const name = MUSCLES[muscle].name
  const relevant = input.sets
    .filter((s) => s.kind !== 'warmup' && input.contributionsFor(s.variantId)?.[muscle])
    .filter((s) => new Date(s.performedAt) <= at)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))

  if (relevant.length === 0) return `${name} is fresh — no logged work.`
  const last = relevant[0]!
  const hours = (at.getTime() - new Date(last.performedAt).getTime()) / 3_600_000
  const sameDay = relevant.filter((s) => s.performedAt.slice(0, 10) === last.performedAt.slice(0, 10))
  const days = hours / 24
  const ago = days < 1 ? `${Math.round(hours)}h` : `${days.toFixed(days < 2 ? 1 : 0)}d`
  return `${name} ${pct}% recovered — ${sameDay.length} set${sameDay.length === 1 ? '' : 's'} ${ago} ago.`
}

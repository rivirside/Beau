/** Per-variant load progression.
 *
 *  Tracked per variant, not per movement: incline dumbbell press at 30° is not
 *  flat dumbbell press, and sharing a progression state between them would
 *  propose a weight you cannot lift. See docs/data-model.md §8 */

import type { SetLog } from '../types'
import type { LoadingModel } from '../taxonomy/equipment'
import { resolveLoad } from '../equipment/load'
import { PROGRESSION } from './constants'

export interface ProgressionState {
  variantId: string
  estimated1rmKg: number
  lastWorkingWeightKg: number
  lastTopSetReps: number
  consecutiveStalls: number
  updatedAt: string
  sessions: number
}

export interface RepRange { min: number; max: number }

/** Epley, adjusted so a set with reps in reserve is scored as the set it could
 *  have been. Returns null when the set is too far from failure to estimate. */
export function estimate1rm(weightKg: number, reps: number, rir = 0): number | null {
  const repsToFailure = reps + Math.max(0, rir)
  if (weightKg <= 0 || reps <= 0) return null
  if (repsToFailure > PROGRESSION.maxRepsToFailureForE1rm) return null
  return weightKg * (1 + repsToFailure / 30)
}

const workingSets = (sets: SetLog[]) => sets.filter((s) => s.kind !== 'warmup')

/** The lightest load above zero this equipment can produce. Calibration by
 *  multiplication cannot escape zero, and an unloaded plate-loaded machine
 *  starts there. */
function smallestPositiveLoad(
  loading: LoadingModel, unit: 'kg' | 'lb', bodyweightKg?: number,
): number {
  for (const probe of [1, 2.5, 5, 10, 20, 40]) {
    const r = resolveLoad(loading, probe, unit, bodyweightKg)
    if (r.kg > 0) return r.kg
  }
  return 0
}

/** Can this equipment produce anything heavier than `fromKg`? Bodyweight
 *  movements with nothing to hang off it cannot, and must progress by reps. */
function nextLoadAbove(
  loading: LoadingModel, fromKg: number, unit: 'kg' | 'lb', bodyweightKg?: number,
): { kg: number; display: string } | null {
  for (const bump of [0.5, 1, 1.25, 2, 2.5, 5, 10]) {
    const candidate = resolveLoad(loading, fromKg + bump, unit, bodyweightKg)
    if (candidate.kg > fromKg + 1e-6) return { kg: candidate.kg, display: candidate.display }
  }
  return null
}

/** Fold one session's sets into the running state for a variant. */
export function applySession(
  prior: ProgressionState | undefined,
  variantId: string,
  sets: SetLog[],
  at: string,
): ProgressionState {
  const working = workingSets(sets)
  if (working.length === 0) {
    return prior ?? {
      variantId, estimated1rmKg: 0, lastWorkingWeightKg: 0, lastTopSetReps: 0,
      consecutiveStalls: 0, updatedAt: at, sessions: 0,
    }
  }

  const estimates = working
    .map((s) => estimate1rm((s.weightKg ?? 0) + (s.addedWeightKg ?? 0), s.reps, s.rir))
    .filter((x): x is number => x !== null)
  const best = estimates.length ? Math.max(...estimates) : (prior?.estimated1rmKg ?? 0)

  // Smoothed so one good day does not spike tomorrow's target.
  const measurable = estimates.length > 0
  const smoothed = !measurable ? (prior?.estimated1rmKg ?? 0)
    : prior && prior.sessions > 0 && prior.estimated1rmKg > 0
    ? prior.estimated1rmKg * (1 - PROGRESSION.smoothing) + best * PROGRESSION.smoothing
    : best

  // Unknown is not the same as "did not improve". With no usable estimate the
  // stall counter must hold, or a lifter working far from failure accumulates
  // phantom stalls and gets deloaded for it.
  const improved = !prior || prior.sessions === 0 ||
    (measurable && best > prior.estimated1rmKg * (1 + PROGRESSION.progressThreshold))
  const stalls = !measurable ? (prior?.consecutiveStalls ?? 0)
               : improved ? 0
               : (prior?.consecutiveStalls ?? 0) + 1

  const top = working.reduce((a, b) =>
    ((b.weightKg ?? 0) + (b.addedWeightKg ?? 0)) > ((a.weightKg ?? 0) + (a.addedWeightKg ?? 0)) ? b : a)

  return {
    variantId,
    estimated1rmKg: smoothed,
    lastWorkingWeightKg: (top.weightKg ?? 0) + (top.addedWeightKg ?? 0),
    lastTopSetReps: top.reps,
    consecutiveStalls: stalls,
    updatedAt: at,
    sessions: (prior?.sessions ?? 0) + 1,
  }
}

export interface Prescription {
  sets: number
  repRange: RepRange
  targetKg: number
  targetRir: number
  /** How to set that weight on this equipment. */
  display: string
  /** Why this weight — surfaced in the UI so the number is never mysterious. */
  rationale: string
  /** No history and no sibling to seed from. The number here is a placeholder
   *  the UI should replace with a blank the lifter fills in: asking beats
   *  discovering a working weight over weeks of calibration. */
  firstTime?: true
}

/** Double progression: earn the top of the rep range on every set, then the
 *  weight goes up by the smallest increment the equipment can produce. */
export function prescribe(
  state: ProgressionState | undefined,
  lastSession: SetLog[] | undefined,
  loading: LoadingModel,
  opts: { sets?: number; repRange?: RepRange; targetRir?: number;
          unit?: 'kg' | 'lb'; bodyweightKg?: number;
          /** Bodyweight actually moved by this movement, so calibration works
           *  on effective load rather than just the added plates. */
          bodyweightBaseKg?: number
          /** Working weight of the most similar variant the lifter already
           *  trains, used to seed a brand-new exercise. */
          seedFromKg?: number } = {},
): Prescription {
  const repRange = opts.repRange ?? { min: 6, max: 10 }
  const targetRir = opts.targetRir ?? 2
  const sets = opts.sets ?? 3
  const unit = opts.unit ?? 'lb'

  if (!state || state.sessions === 0) {
    // A sibling variant of the same movement is the best available guess: flat
    // dumbbell press tells you a great deal about incline dumbbell press, and
    // restarting every new exercise from an empty bar wastes real sessions.
    if (opts.seedFromKg && opts.seedFromKg > 0) {
      const seeded = resolveLoad(
        loading, opts.seedFromKg * PROGRESSION.siblingSeedFraction, unit, opts.bodyweightKg)
      return {
        sets, repRange, targetKg: seeded.kg, targetRir, display: seeded.display,
        rationale: `First time — starting from a similar exercise you already train, ` +
                   `slightly lighter.`,
      }
    }
    const resolved = resolveLoad(loading, 0, unit, opts.bodyweightKg)
    return {
      sets, repRange, targetKg: resolved.kg, targetRir, display: resolved.display,
      firstTime: true,
      rationale: `First time — enter a weight you could do for about ${repRange.max} reps. ` +
                 'Beau calibrates from there.',
    }
  }

  const working = (lastSession ?? []).filter((s) => s.kind !== 'warmup')
  const allHitTop = working.length > 0 &&
    working.every((s) => s.reps >= repRange.max && (s.rir ?? 0) <= targetRir)

  if (state.consecutiveStalls >= PROGRESSION.stallsBeforeDeload &&
      state.lastWorkingWeightKg > 0) {
    const target = state.lastWorkingWeightKg * (1 - PROGRESSION.deloadFraction)
    const resolved = resolveLoad(loading, target, unit, opts.bodyweightKg)
    return {
      sets, repRange, targetKg: resolved.kg, targetRir, display: resolved.display,
      rationale: `Stalled ${state.consecutiveStalls} sessions — dropping ` +
                 `${Math.round(PROGRESSION.deloadFraction * 100)}% to build back.`,
    }
  }

  const base = opts.bodyweightBaseKg ?? 0
  const top = working.length
    ? working.reduce((a, b) => (b.reps > a.reps ? b : a))
    : undefined
  const overshoot = top ? top.reps - repRange.max : 0

  if (top && overshoot >= PROGRESSION.calibrationOvershoot) {
    const lastEffective = state.lastWorkingWeightKg + base
    if (lastEffective <= 0) {
      // Nothing to multiply. Start from the lightest real load instead.
      const seed = smallestPositiveLoad(loading, unit, opts.bodyweightKg)
      if (seed > 0) {
        const resolved = resolveLoad(loading, seed, unit, opts.bodyweightKg)
        return {
          sets, repRange, targetKg: resolved.kg, targetRir, display: resolved.display,
          rationale: `${top.reps} reps unloaded — adding the lightest real load.`,
        }
      }
    } else {
      // Invert Epley through the observed set to the middle of the target range.
      const mid = (repRange.min + repRange.max) / 2
      const ratio = (1 + (top.reps + (top.rir ?? 0)) / 30) / (1 + (mid + targetRir) / 30)
      const capped = Math.min(ratio, PROGRESSION.maxCalibrationJump)
      const resolved = resolveLoad(loading, lastEffective * capped - base, unit, opts.bodyweightKg)
      if (resolved.kg > state.lastWorkingWeightKg) {
        return {
          sets, repRange, targetKg: resolved.kg, targetRir, display: resolved.display,
          rationale: `${top.reps} reps when ${repRange.max} was the target — the weight was ` +
                     `too light, jumping to calibrate.`,
        }
      }
    }
  }

  if (allHitTop) {
    const next = nextLoadAbove(loading, state.lastWorkingWeightKg, unit, opts.bodyweightKg)
    if (next) {
      return {
        sets, repRange, targetKg: next.kg, targetRir, display: next.display,
        rationale: `Hit ${repRange.max} on every set last time — up one increment.`,
      }
    }
    // Nothing heavier exists — a push-up, an unweighted plank. Progress by reps
    // instead of pretending the load can move.
    const reps = state.lastTopSetReps + 1
    const current = resolveLoad(loading, state.lastWorkingWeightKg, unit, opts.bodyweightKg)
    return {
      sets, repRange: { min: reps, max: reps + 2 }, targetKg: current.kg, targetRir,
      display: current.display,
      rationale: `No heavier load available — progressing by reps, aim for ${reps}.`,
    }
  }

  const resolved = resolveLoad(loading, state.lastWorkingWeightKg, unit, opts.bodyweightKg)
  return {
    sets, repRange, targetKg: resolved.kg, targetRir, display: resolved.display,
    rationale: `Hold — last time was ${state.lastTopSetReps} reps, ` +
               `${repRange.max} on every set earns the increase.`,
  }
}

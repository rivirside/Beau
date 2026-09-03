/** Quantising a target weight to something the equipment can actually produce.
 *  Suggesting 47.5 lb on a rack that jumps by 5 is the kind of small wrongness
 *  that makes an app feel like it does not lift. See docs/data-model.md §4 */

import type { LoadingModel } from '../taxonomy/equipment'

export interface ResolvedLoad {
  /** What you will actually be lifting, in kg. */
  kg: number
  /** How to set it up, in the user's units. */
  display: string
  /** How far this is from what progression asked for, in kg. */
  deltaKg: number
}

const LB = 0.45359237
const toLb = (kg: number) => kg / LB
const fmt = (kg: number, unit: 'kg' | 'lb') =>
  unit === 'kg' ? `${Math.round(kg * 4) / 4} kg` : `${Math.round(toLb(kg) * 2) / 2} lb`

const nearest = (options: number[], target: number) =>
  options.reduce((best, x) => (Math.abs(x - target) < Math.abs(best - target) ? x : best))

/** Greedy plate maths, per side. Greedy is optimal for standard plate sets
 *  (each plate is at least the sum of nothing smaller that beats it) and is
 *  what a lifter does at the rack anyway. */
function loadPlates(platePairsKg: number[], perSideKg: number) {
  const sorted = [...platePairsKg].sort((a, b) => b - a)
  const used: number[] = []
  let left = perSideKg
  for (const plate of sorted) {
    while (left >= plate - 1e-9) { used.push(plate); left -= plate }
  }
  return { used, achievedPerSide: perSideKg - left }
}

export function resolveLoad(
  model: LoadingModel,
  targetKg: number,
  unit: 'kg' | 'lb' = 'lb',
  bodyweightKg = 0,
): ResolvedLoad {
  const done = (kg: number, display: string): ResolvedLoad =>
    ({ kg, display, deltaKg: Math.round((kg - targetKg) * 100) / 100 })

  switch (model.kind) {
    case 'fixed_set': {
      const kg = nearest(model.weightsKg, targetKg)
      return done(kg, fmt(kg, unit))
    }

    case 'selectorized': {
      const combos = [0, ...(model.addOnKg ?? [])].flatMap((addOn) =>
        model.stopsKg.map((stop, i) => ({ kg: stop + addOn, stop: i + 1, addOn })))
      const best = combos.reduce((a, b) =>
        Math.abs(b.kg - targetKg) < Math.abs(a.kg - targetKg) ? b : a)
      const suffix = best.addOn > 0 ? ` + ${fmt(best.addOn, unit)} add-on` : ''
      return done(best.kg, `pin ${best.stop}${suffix} (${fmt(best.kg, unit)})`)
    }

    case 'plate_loaded': {
      const bar = model.barKg + (model.collarsKg ?? 0)
      if (targetKg <= bar) return done(bar, `empty bar (${fmt(bar, unit)})`)
      const { used, achievedPerSide } = loadPlates(model.platePairsKg, (targetKg - bar) / 2)
      const counts = new Map<number, number>()
      for (const p of used) counts.set(p, (counts.get(p) ?? 0) + 1)
      const perSide = [...counts].map(([p, n]) => `${n}×${fmt(p, unit).replace(/ (kg|lb)$/, '')}`)
      const kg = bar + achievedPerSide * 2
      return done(kg, perSide.length
        ? `${perSide.join(' + ')} per side (${fmt(kg, unit)})`
        : `empty bar (${fmt(bar, unit)})`)
    }

    case 'bodyweight': {
      const extra = targetKg - bodyweightKg
      if (Math.abs(extra) < 1) return done(bodyweightKg, 'bodyweight')
      if (extra > 0 && model.canAddLoad) return done(targetKg, `bodyweight + ${fmt(extra, unit)}`)
      if (extra < 0 && model.canAssist) return done(targetKg, `bodyweight − ${fmt(-extra, unit)} assist`)
      return done(bodyweightKg, 'bodyweight')
    }

    case 'band': {
      const level = model.levels.reduce((a, b) =>
        Math.abs(b.approxKg - targetKg) < Math.abs(a.approxKg - targetKg) ? b : a)
      return done(level.approxKg, `${level.label} band (~${fmt(level.approxKg, unit)})`)
    }

    case 'none':
      return done(targetKg, fmt(targetKg, unit))
  }
}

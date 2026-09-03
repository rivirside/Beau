/** Does every trainable unit actually have a way to be trained?
 *
 *  A unit only earns its place if some movement in the catalog can target it.
 *  A unit with no prime mover is one the generator can never satisfy: it would
 *  accumulate volume debt forever and quietly distort every session it touched.
 *  This report is what decides whether the unit list is right. */

import { MUSCLES, type MuscleId } from '../taxonomy/muscles'
import { MOVEMENT_CATALOG } from './index'
import { enumerateVariants } from '../variants'
import { equipmentById } from '../equipment/catalog'
import { AXES } from '../taxonomy/axes'

export interface UnitCoverage {
  unit: MuscleId
  region: string
  /** Highest contribution any variant in the catalog gives this unit. */
  peak: number
  /** Movements where it reaches 0.8+ — genuinely targetable. */
  primeMovers: string[]
  /** Movements where it reaches 0.3+ — meaningful secondary work. */
  contributors: number
}

export function coverage(): UnitCoverage[] {
  const rows = new Map<MuscleId, UnitCoverage>()
  for (const [unit, m] of Object.entries(MUSCLES) as [MuscleId, { region: string }][]) {
    rows.set(unit, { unit, region: m.region, peak: 0, primeMovers: [], contributors: 0 })
  }

  for (const movement of MOVEMENT_CATALOG) {
    const best = new Map<MuscleId, number>()
    for (const v of enumerateVariants(movement)) {
      for (const [unit, value] of Object.entries(v.contributions) as [MuscleId, number][]) {
        best.set(unit, Math.max(best.get(unit) ?? 0, value))
      }
    }
    for (const [unit, value] of best) {
      const row = rows.get(unit)
      if (!row) continue
      row.peak = Math.max(row.peak, value)
      if (value >= 0.8) row.primeMovers.push(movement.id)
      if (value >= 0.3) row.contributors++
    }
  }
  return [...rows.values()]
}

/** Structural problems that would break the generator rather than merely skew it. */
export function validateCatalog(): string[] {
  const errors: string[] = []
  const seen = new Set<string>()

  for (const m of MOVEMENT_CATALOG) {
    if (seen.has(m.id)) errors.push(`duplicate movement id: ${m.id}`)
    seen.add(m.id)

    if (m.equipmentTypeIds.length === 0) errors.push(`${m.id}: no equipment`)
    for (const id of m.equipmentTypeIds) {
      if (!equipmentById(id)) errors.push(`${m.id}: unknown equipment "${id}"`)
    }

    for (const axis of m.axes) {
      const legal = AXES[axis.axis] as readonly string[] | undefined
      if (!legal) { errors.push(`${m.id}: unknown axis "${axis.axis}"`); continue }
      for (const v of axis.values) {
        if (!legal.includes(v)) errors.push(`${m.id}/${axis.axis}: illegal value "${v}"`)
      }
      if (!axis.values.includes(axis.default)) {
        errors.push(`${m.id}/${axis.axis}: default "${axis.default}" not among its values`)
      }
      for (const value of Object.keys(axis.modifiers ?? {})) {
        if (!axis.values.includes(value)) {
          errors.push(`${m.id}/${axis.axis}: modifier for unlisted value "${value}"`)
        }
      }
      // An axis a movement uses must be one its equipment can actually express.
      const expressible = m.equipmentTypeIds
        .flatMap((id) => equipmentById(id)?.axes ?? [])
      if (!expressible.includes(axis.axis)) {
        errors.push(`${m.id}: no equipment can express axis "${axis.axis}"`)
      }
    }

    if (Object.keys(m.baseContributions).length === 0) {
      errors.push(`${m.id}: no muscle contributions`)
    }
  }
  return errors
}

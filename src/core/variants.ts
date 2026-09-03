/** Variant resolution: expand a Movement + axis selections into a concrete,
 *  loggable exercise with a resolved muscle vector. §3, §5 */

import type { Movement, Variant } from './types'
import type { MuscleId, MuscleVector } from './taxonomy/muscles'
import type { AxisId } from './taxonomy/axes'

export type Config = Partial<Record<AxisId, string>>

/** base × every selected axis value's modifiers. Deliberately not renormalized:
 *  magnitude carries information about how much total work the variant does. */
export function resolveContributions(movement: Movement, config: Config): MuscleVector {
  const out: MuscleVector = { ...movement.baseContributions }
  for (const ax of movement.axes) {
    const value = config[ax.axis] ?? ax.default
    const mods = ax.modifiers?.[value]
    if (!mods) continue
    for (const [muscle, factor] of Object.entries(mods) as [MuscleId, number][]) {
      out[muscle] = (out[muscle] ?? 0) * factor
    }
  }
  for (const k of Object.keys(out) as MuscleId[]) {
    if (!out[k]) delete out[k]
  }
  return out
}

/** Deterministic, human-readable, and stable across catalog rebuilds: only
 *  non-default axis values appear, sorted by axis name. §5 */
export function variantId(movement: Movement, config: Config): string {
  const parts = movement.axes
    .filter((ax) => config[ax.axis] !== undefined && config[ax.axis] !== ax.default)
    .map((ax) => `${ax.axis}:${config[ax.axis]}`)
    .sort()
  return parts.length === 0 ? movement.id : `${movement.id}@${parts.join('|')}`
}

const LABELS: Record<string, string> = {
  low: 'Low', mid: 'Mid', high: 'High', floor: 'Floor', overhead: 'Overhead',
  decline: 'Decline', flat: 'Flat', incline_low: 'Low Incline',
  incline_high: 'High Incline', upright: 'Upright',
  narrow: 'Narrow-Grip', shoulder: '', wide: 'Wide-Grip',
  pronated: 'Overhand', supinated: 'Underhand', neutral: 'Neutral-Grip',
  rope: 'Rope', straight_bar: 'Straight-Bar', ez_bar: 'EZ-Bar', v_bar: 'V-Bar',
  d_handle: '', single_d: 'Single-Handle', lat_bar: 'Lat-Bar',
  seated: 'Seated', standing: 'Standing', lying: 'Lying', prone: 'Prone',
  bent_over: 'Bent-Over', kneeling: 'Kneeling',
  unilateral: 'Single-Arm', alternating: 'Alternating', bilateral: '',
  lengthened_partial: 'Lengthened-Partial', shortened_partial: 'Shortened-Partial',
}

export function variantName(movement: Movement, config: Config): string {
  const prefixes = movement.axes
    .filter((ax) => config[ax.axis] !== undefined && config[ax.axis] !== ax.default)
    .map((ax) => LABELS[config[ax.axis]!] ?? '')
    .filter(Boolean)
  return [...prefixes, movement.name].join(' ')
}

export function resolveVariant(movement: Movement, config: Config): Variant {
  return {
    id: variantId(movement, config),
    movementId: movement.id,
    equipmentTypeId: movement.equipmentTypeIds[0]!,
    config,
    displayName: variantName(movement, config),
    contributions: resolveContributions(movement, config),
  }
}

/** Every legal combination of a movement's axes. Used to build the searchable
 *  catalog and to let the generator search configurations for a target muscle. */
export function enumerateVariants(movement: Movement): Variant[] {
  let configs: Config[] = [{}]
  for (const ax of movement.axes) {
    configs = configs.flatMap((c) => ax.values.map((v) => ({ ...c, [ax.axis]: v })))
  }
  return configs.map((c) => resolveVariant(movement, c))
}

/** Cosine similarity of resolved muscle vectors — how substitution works
 *  without a hand-maintained "similar exercises" table. §1 */
export function similarity(a: MuscleVector, b: MuscleVector): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<MuscleId>
  let dot = 0, na = 0, nb = 0
  for (const k of keys) {
    const x = a[k] ?? 0, y = b[k] ?? 0
    dot += x * y; na += x * x; nb += y * y
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

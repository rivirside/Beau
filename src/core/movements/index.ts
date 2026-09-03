import type { Movement, Variant } from '../types'
import { enumerateVariants } from '../variants'
import { CHEST_MOVEMENTS } from './chest'
import { BACK_MOVEMENTS } from './back'
import { SHOULDER_MOVEMENTS } from './shoulders'
import { ARM_MOVEMENTS } from './arms'
import { LEG_MOVEMENTS } from './legs'
import { CORE_MOVEMENTS } from './core'

export * from './helpers'
export { CHEST_MOVEMENTS, BACK_MOVEMENTS, SHOULDER_MOVEMENTS, ARM_MOVEMENTS,
         LEG_MOVEMENTS, CORE_MOVEMENTS }

/** The curated catalog: movements the generator is allowed to prescribe.
 *  Imported entries from the vendor dataset stay loggable-only. */
export const MOVEMENT_CATALOG: Movement[] = [
  ...CHEST_MOVEMENTS, ...BACK_MOVEMENTS, ...SHOULDER_MOVEMENTS,
  ...ARM_MOVEMENTS, ...LEG_MOVEMENTS, ...CORE_MOVEMENTS,
]

export const movementById = (id: string) => MOVEMENT_CATALOG.find((m) => m.id === id)

export interface IndexedVariant { variant: Variant; movement: Movement }

/** Every variant the catalog can produce, keyed by variant id. Built once and
 *  reused: the engine looks up contributions on this hot path constantly. */
export function buildVariantIndex(catalog = MOVEMENT_CATALOG): Map<string, IndexedVariant> {
  const index = new Map<string, IndexedVariant>()
  for (const movement of catalog) {
    for (const variant of enumerateVariants(movement)) {
      index.set(variant.id, { variant, movement })
    }
  }
  return index
}

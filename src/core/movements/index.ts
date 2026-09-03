import type { Movement } from '../types'
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

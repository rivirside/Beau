export * from './skeleton'
export * from './nerves'
export * from './helpers'
export { UPPER_LIMB_MUSCLES } from './muscles-upper'
export { LOWER_LIMB_MUSCLES } from './muscles-lower'
export { TRUNK_MUSCLES } from './muscles-trunk'

import { UPPER_LIMB_MUSCLES } from './muscles-upper'
import { LOWER_LIMB_MUSCLES } from './muscles-lower'
import { TRUNK_MUSCLES } from './muscles-trunk'
import type { AnatomicalMuscle } from '../taxonomy/anatomy'

export const MUSCLE_LIBRARY: AnatomicalMuscle[] = [
  ...UPPER_LIMB_MUSCLES, ...LOWER_LIMB_MUSCLES, ...TRUNK_MUSCLES,
]

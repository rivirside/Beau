export * from './bones'
export * from './skeleton'
export * from './nerves'
export * from './helpers'
export { UPPER_LIMB_MUSCLES } from './muscles-upper'
export { LOWER_LIMB_MUSCLES } from './muscles-lower'
export { TRUNK_MUSCLES } from './muscles-trunk'
export { HAND_MUSCLES } from './muscles-hand'
export { FOOT_MUSCLES } from './muscles-foot'
export { HEAD_NECK_MUSCLES } from './muscles-head'
export { THORAX_MUSCLES } from './muscles-thorax'

import { UPPER_LIMB_MUSCLES } from './muscles-upper'
import { LOWER_LIMB_MUSCLES } from './muscles-lower'
import { TRUNK_MUSCLES } from './muscles-trunk'
import { HAND_MUSCLES } from './muscles-hand'
import { FOOT_MUSCLES } from './muscles-foot'
import { HEAD_NECK_MUSCLES } from './muscles-head'
import { THORAX_MUSCLES } from './muscles-thorax'
import type { AnatomicalMuscle } from '../taxonomy/anatomy'

export const MUSCLE_LIBRARY: AnatomicalMuscle[] = [
  ...UPPER_LIMB_MUSCLES, ...LOWER_LIMB_MUSCLES, ...TRUNK_MUSCLES,
  ...HAND_MUSCLES, ...FOOT_MUSCLES, ...HEAD_NECK_MUSCLES, ...THORAX_MUSCLES,
]

/** Muscles the engine can program. Everything else — the intrinsic hand and
 *  foot muscles, facial expression, the extraocular muscles — exists only in
 *  the library. This split is the whole reason the library can keep growing. */
export const TRAINABLE_MUSCLES: AnatomicalMuscle[] = MUSCLE_LIBRARY.filter(
  (m) => m.trainableUnitId !== undefined || (m.heads ?? []).some((h) => h.trainableUnitId),
)

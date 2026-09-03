/** Terse constructors for the movement catalog. */

import type { Movement, MovementAxis } from '../types'
import type { MuscleVector } from '../taxonomy/muscles'
import type { AxisId } from '../taxonomy/axes'

export const mv = (m: Omit<Movement, 'source'> & { source?: Movement['source'] }): Movement =>
  ({ source: 'curated', ...m })

export const ax = (
  axis: AxisId,
  values: string[],
  def: string,
  modifiers?: Record<string, MuscleVector>,
): MovementAxis => ({ axis, values, default: def, ...(modifiers ? { modifiers } : {}) })

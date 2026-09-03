/** Terse constructors so the muscle tables read like a reference book rather
 *  than like JSON. */

import type { Attachment, MuscleAction, Innervation, JointActionName } from '../taxonomy/anatomy'

export const at = (landmarkId: string, detail?: string): Attachment => ({ landmarkId, detail })

export const act = (
  joint: string,
  action: JointActionName,
  role: MuscleAction['role'] = 'prime',
  qualifier?: string,
): MuscleAction => ({ joint, action, role, qualifier })

export const inn = (nerveId: string, roots: string[], note?: string): Innervation =>
  ({ nerveId, roots, note })

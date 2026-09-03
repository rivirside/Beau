/** Equipment is two layers: the catalog type (what a cable tower *is*) and the
 *  gym instance (what *your* cable tower can actually do). Prescription gates on
 *  the instance; load suggestions quantize to it. §4 */

import type { AxisId, AxisValue } from './axes'

export const EQUIPMENT_CATEGORIES = [
  'free_weight', 'cable', 'machine', 'bodyweight', 'support', 'accessory',
] as const
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number]

/** How resistance is selected. Drives `resolveLoad` so a proposed weight is
 *  always one you can actually set. */
export type LoadingModel =
  | { kind: 'plate_loaded'; barKg: number; platePairsKg: number[]; collarsKg?: number }
  | { kind: 'selectorized'; stopsKg: number[]; addOnKg?: number[] }
  | { kind: 'fixed_set'; weightsKg: number[] }
  | { kind: 'bodyweight'; canAddLoad: boolean; canAssist: boolean }
  | { kind: 'band'; levels: { id: string; label: string; approxKg: number }[] }
  | { kind: 'none' }

export interface EquipmentType {
  id: string
  name: string
  category: EquipmentCategory
  /** Axes this equipment can express at all. A gym instance may support fewer. */
  axes: AxisId[]
  defaultLoading: LoadingModel
  /** Attachment values this equipment can accept, if any. */
  attachments?: AxisValue<'attachment'>[]
}

/** The user's actual equipment, per gym. This is the gate on what can be
 *  prescribed and the source of truth for load quantization. */
export interface GymEquipment {
  id: string
  gymId: string
  equipmentTypeId: string
  /** Overrides the type default with this machine's real increments. */
  loading: LoadingModel
  /** Attachments actually owned. Empty means the bare cable/handle only. */
  attachments?: AxisValue<'attachment'>[]
  /** Restricts axis values for this instance, e.g. a fixed flat bench. */
  axisLimits?: Partial<Record<AxisId, string[]>>
  notes?: string
}

export interface Gym {
  id: string
  name: string
  isDefault: boolean
}

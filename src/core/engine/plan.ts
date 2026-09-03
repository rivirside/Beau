/** Weekly planning: which days, how long, and what each day is for.
 *
 *  A focus is a set of trainable units, not a region. "Push" is chest, front and
 *  side delts and triceps — a boundary no region expresses — so it has to be
 *  spelled out at unit level. */

import type { MuscleId } from '../taxonomy/muscles'
import { MUSCLES } from '../taxonomy/muscles'
import { DEFAULT_WEEKLY_TARGETS } from './constants'

export const FOCUSES = ['auto', 'full', 'upper', 'lower', 'push', 'pull', 'legs', 'core'] as const
export type Focus = (typeof FOCUSES)[number]

export const FOCUS_LABEL: Record<Focus, string> = {
  auto: 'Whatever is owed', full: 'Full body', upper: 'Upper body', lower: 'Lower body',
  push: 'Push', pull: 'Pull', legs: 'Legs', core: 'Core',
}

const units = (pred: (id: MuscleId) => boolean) =>
  new Set((Object.keys(MUSCLES) as MuscleId[]).filter(pred))
const region = (...rs: string[]) => units((id) => rs.includes(MUSCLES[id].region))

const PUSH: MuscleId[] = ['pec_upper', 'pec_mid', 'pec_lower', 'delt_front', 'delt_lateral',
  'triceps_long', 'triceps_lateral', 'triceps_medial', 'supraspinatus']
const PULL: MuscleId[] = ['lats', 'traps_upper', 'traps_mid', 'traps_lower', 'rhomboids',
  'erectors', 'delt_rear', 'cuff_ext_rotators', 'biceps_long', 'biceps_short', 'brachialis',
  'brachioradialis', 'forearm_flexors']

/** Units a focus treats as owed. `auto` returns null: no filter. */
export function focusUnits(focus: Focus): Set<MuscleId> | null {
  switch (focus) {
    case 'auto': return null
    case 'full': return units(() => true)
    case 'upper': return region('chest', 'back', 'shoulders', 'arms')
    case 'lower': return region('legs', 'core')
    case 'legs': return region('legs')
    case 'core': return region('core')
    case 'push': return new Set(PUSH)
    case 'pull': return new Set(PULL)
  }
}

export type VolumePreset = 'minimal' | 'standard' | 'high'
export const VOLUME_SCALE: Record<VolumePreset, number> = { minimal: 0.6, standard: 1, high: 1.4 }

/** Weekly targets scaled by preset. Zero-target units stay zero: a preset must
 *  never switch the rehab tail on by itself. */
export function scaledTargets(
  preset: VolumePreset,
  base: Partial<Record<MuscleId, number>> = DEFAULT_WEEKLY_TARGETS,
): Partial<Record<MuscleId, number>> {
  const out: Partial<Record<MuscleId, number>> = {}
  for (const [k, v] of Object.entries(base) as [MuscleId, number][]) {
    out[k] = v ? Math.round(v * VOLUME_SCALE[preset]) : 0
  }
  return out
}

export interface DayPlan { focus: Focus; minutes: number }
/** 0 = Sunday … 6 = Saturday, matching Date#getDay. Absent = rest day. */
export type WeekPlan = Partial<Record<number, DayPlan>>

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const DEFAULT_WEEK: WeekPlan = {
  1: { focus: 'upper', minutes: 60 },
  2: { focus: 'lower', minutes: 60 },
  4: { focus: 'upper', minutes: 60 },
  5: { focus: 'lower', minutes: 60 },
}

/** Sensible splits by training frequency, for the Plan screen's quick picks. */
export const SPLIT_TEMPLATES: { id: string; name: string; days: number; week: WeekPlan }[] = [
  { id: 'fb3', name: 'Full body × 3', days: 3,
    week: { 1: { focus: 'full', minutes: 60 }, 3: { focus: 'full', minutes: 60 },
            5: { focus: 'full', minutes: 60 } } },
  { id: 'ul4', name: 'Upper / Lower × 4', days: 4, week: DEFAULT_WEEK },
  { id: 'ppl6', name: 'Push / Pull / Legs × 6', days: 6,
    week: { 1: { focus: 'push', minutes: 55 }, 2: { focus: 'pull', minutes: 55 },
            3: { focus: 'legs', minutes: 55 }, 4: { focus: 'push', minutes: 55 },
            5: { focus: 'pull', minutes: 55 }, 6: { focus: 'legs', minutes: 55 } } },
  { id: 'auto4', name: 'Let Beau decide × 4', days: 4,
    week: { 1: { focus: 'auto', minutes: 60 }, 2: { focus: 'auto', minutes: 60 },
            4: { focus: 'auto', minutes: 60 }, 5: { focus: 'auto', minutes: 60 } } },
]

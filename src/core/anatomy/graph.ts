/** Queries over the anatomy graph. Synergists and antagonists are derived here
 *  rather than stored, so the graph cannot contradict itself.
 *  See docs/anatomy-model.md §3 */

import type { AnatomicalMuscle, MuscleAction, JointActionName } from '../taxonomy/anatomy'
import { OPPOSING_ACTIONS } from '../taxonomy/anatomy'
import { MUSCLE_LIBRARY } from './index'
import { LANDMARKS, JOINTS } from './skeleton'
import { NERVES } from './nerves'

const key = (a: Pick<MuscleAction, 'joint' | 'action'>) => `${a.joint}:${a.action}`

export const muscleById = (id: string) => MUSCLE_LIBRARY.find((m) => m.id === id)
export const landmarkById = (id: string) => LANDMARKS.find((l) => l.id === id)
export const nerveById = (id: string) => NERVES.find((n) => n.id === id)
export const jointById = (id: string) => JOINTS.find((j) => j.id === id)

/** Everything attaching to a bony landmark, split by whether it is an origin or
 *  an insertion. The query that makes landmark cards possible. */
export function attachmentsAt(landmarkId: string, library = MUSCLE_LIBRARY) {
  return {
    origins: library.filter((m) => m.origin.some((a) => a.landmarkId === landmarkId)),
    insertions: library.filter((m) => m.insertion.some((a) => a.landmarkId === landmarkId)),
  }
}

/** Muscles producing a given action at a given joint. */
export function musclesForAction(
  joint: string,
  action: JointActionName,
  opts: { includeAssist?: boolean } = {},
  library = MUSCLE_LIBRARY,
) {
  const roles = opts.includeAssist ? ['prime', 'assist'] : ['prime']
  return library.filter((m) =>
    m.actions.some((a) => a.joint === joint && a.action === action && roles.includes(a.role)))
}

/** Muscles sharing a prime action with this one. */
export function synergistsOf(muscle: AnatomicalMuscle, library = MUSCLE_LIBRARY) {
  const primes = new Set(muscle.actions.filter((a) => a.role === 'prime').map(key))
  return library.filter((m) =>
    m.id !== muscle.id && m.actions.some((a) => a.role === 'prime' && primes.has(key(a))))
}

/** Muscles whose prime action opposes one of this muscle's prime actions at the
 *  same joint. Derived from the OPPOSING_ACTIONS table. */
export function antagonistsOf(muscle: AnatomicalMuscle, library = MUSCLE_LIBRARY) {
  const opposed = new Set(
    muscle.actions
      .filter((a) => a.role === 'prime')
      .map((a) => {
        const opposite = OPPOSING_ACTIONS[a.action]
        return opposite ? `${a.joint}:${opposite}` : null
      })
      .filter((k): k is string => k !== null),
  )
  return library.filter((m) =>
    m.id !== muscle.id && m.actions.some((a) => a.role === 'prime' && opposed.has(key(a))))
}

/** Everything a nerve supplies, optionally including nerves branching from it. */
export function musclesInnervatedBy(
  nerveId: string,
  opts: { includeBranches?: boolean } = {},
  library = MUSCLE_LIBRARY,
) {
  const ids = new Set([nerveId])
  if (opts.includeBranches) {
    let grew = true
    while (grew) {
      grew = false
      for (const n of NERVES) {
        if (n.parentId && ids.has(n.parentId) && !ids.has(n.id)) { ids.add(n.id); grew = true }
      }
    }
  }
  return library.filter((m) => m.innervation.some((i) => ids.has(i.nerveId)))
}

/** Anatomical muscles (and heads) mapping onto an engine TrainableUnit. This is
 *  the bridge that lets a logged set select what to study. §1 */
export function musclesForTrainableUnit(unitId: string, library = MUSCLE_LIBRARY) {
  return library.filter((m) =>
    m.trainableUnitId === unitId || m.heads?.some((h) => h.trainableUnitId === unitId))
}

/** Referential integrity over the whole graph. Run in tests: a dangling
 *  landmark id silently produces a card with a blank answer. */
export function validateGraph(library = MUSCLE_LIBRARY): string[] {
  const errors: string[] = []
  const landmarkIds = new Set(LANDMARKS.map((l) => l.id))
  const nerveIds = new Set(NERVES.map((n) => n.id))
  const seen = new Set<string>()

  for (const m of library) {
    if (seen.has(m.id)) errors.push(`duplicate muscle id: ${m.id}`)
    seen.add(m.id)

    for (const a of [...m.origin, ...m.insertion]) {
      if (!landmarkIds.has(a.landmarkId)) {
        errors.push(`${m.id}: unknown landmark "${a.landmarkId}"`)
      }
    }
    for (const i of m.innervation) {
      if (!nerveIds.has(i.nerveId)) errors.push(`${m.id}: unknown nerve "${i.nerveId}"`)
    }
    for (const a of m.actions) {
      const joint = jointById(a.joint)
      if (!joint) { errors.push(`${m.id}: unknown joint "${a.joint}"`); continue }
      if (!joint.actions.includes(a.action)) {
        errors.push(`${m.id}: joint "${a.joint}" does not list action "${a.action}"`)
      }
    }
    for (const h of m.heads ?? []) {
      for (const a of [...h.origin, ...(h.insertion ?? [])]) {
        if (!landmarkIds.has(a.landmarkId)) {
          errors.push(`${m.id}/${h.id}: unknown landmark "${a.landmarkId}"`)
        }
      }
    }
  }
  for (const n of NERVES) {
    if (n.parentId && !nerveIds.has(n.parentId)) {
      errors.push(`nerve ${n.id}: unknown parent "${n.parentId}"`)
    }
  }
  for (const l of LANDMARKS) {
    if (!new Set(['skull','mandible','cervical_spine','thoracic_spine','lumbar_spine','sacrum',
                  'coccyx','ribs','sternum','clavicle','scapula','humerus','radius','ulna','carpals',
                  'metacarpals','phalanges_hand','ilium','ischium','pubis','femur','patella','tibia',
                  'fibula','tarsals','metatarsals','phalanges_foot']).has(l.boneId)) {
      errors.push(`landmark ${l.id}: unknown bone "${l.boneId}"`)
    }
  }
  return errors
}

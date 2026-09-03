/** Queries over the anatomy graph. Synergists and antagonists are derived here
 *  rather than stored, so the graph cannot contradict itself.
 *  See docs/anatomy-model.md §3 */

import type { AnatomicalMuscle, MuscleAction, JointActionName } from '../taxonomy/anatomy'
import { OPPOSING_ACTIONS } from '../taxonomy/anatomy'
import { MUSCLE_LIBRARY } from './index'
import { LANDMARKS, JOINTS } from './skeleton'
import { BONES, TOTAL_BONE_COUNT } from './bones'
import { NERVES } from './nerves'

const key = (a: Pick<MuscleAction, 'joint' | 'action'>) => `${a.joint}:${a.action}`

export const muscleById = (id: string) => MUSCLE_LIBRARY.find((m) => m.id === id)
export const landmarkById = (id: string) => LANDMARKS.find((l) => l.id === id)
export const nerveById = (id: string) => NERVES.find((n) => n.id === id)
export const jointById = (id: string) => JOINTS.find((j) => j.id === id)
export const boneById = (id: string) => BONES.find((x) => x.id === id)

/** Every landmark on a bone — "name the features of the scapula". */
export const landmarksOnBone = (boneId: string) =>
  LANDMARKS.filter((l) => l.boneId === boneId)

/** Every muscle attaching anywhere on a bone, via its landmarks. */
export function musclesOnBone(boneId: string, library = MUSCLE_LIBRARY) {
  const ids = new Set(landmarksOnBone(boneId).map((l) => l.id))
  return library.filter((m) =>
    [...m.origin, ...m.insertion].some((a) => ids.has(a.landmarkId)))
}

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
  const boneIds = new Set(BONES.map((x) => x.id))
  for (const l of LANDMARKS) {
    if (l.boneId && !boneIds.has(l.boneId)) {
      errors.push(`landmark ${l.id}: unknown bone "${l.boneId}"`)
    }
  }
  for (const bone of BONES) {
    for (const other of bone.articulatesWith ?? []) {
      if (!boneIds.has(other)) errors.push(`bone ${bone.id}: unknown articulation "${other}"`)
    }
  }
  if (TOTAL_BONE_COUNT !== 206) {
    errors.push(`skeleton totals ${TOTAL_BONE_COUNT} bones, expected 206`)
  }
  return errors
}

/** App state. Small enough that a module-level store with subscribers beats a
 *  state library, and it keeps the dependency list honest. */

import { useEffect, useState } from 'preact/hooks'
import type { Workout, WorkoutEntry, SetLog } from '../core/types'
import type { ProgressionState } from '../core/engine/progression'
import { applySession } from '../core/engine/progression'
import { computeFatigue, type FatigueState } from '../core/engine/fatigue'
import { buildVariantIndex, type IndexedVariant } from '../core/movements'
import * as store from './db'
import type { Profile, Gym } from './db'

export const VARIANTS: Map<string, IndexedVariant> = buildVariantIndex()
export const contributionsFor = (id: string) => VARIANTS.get(id)?.variant.contributions
export const bodyweightFactorFor = (id: string) => VARIANTS.get(id)?.movement.bodyweightFactor

export interface AppState {
  ready: boolean
  profile: Profile
  gyms: Gym[]
  workouts: Workout[]
  progression: Map<string, ProgressionState>
  sets: SetLog[]
  fatigue: FatigueState
  /** The session in progress, if any. Persisted as it goes. */
  active: Workout | null
}

const EMPTY_FATIGUE: FatigueState = {
  computedAt: new Date().toISOString(), load: {}, capacity: {}, freshness: {},
}

let state: AppState = {
  ready: false, profile: store.DEFAULT_PROFILE, gyms: [], workouts: [],
  progression: new Map(), sets: [], fatigue: EMPTY_FATIGUE, active: null,
}
let listeners: ((s: AppState) => void)[] = []

function set(patch: Partial<AppState>) {
  state = { ...state, ...patch }
  for (const l of listeners) l(state)
}

export function useApp(): AppState {
  const [local, setLocal] = useState(state)
  useEffect(() => {
    listeners.push(setLocal)
    return () => { listeners = listeners.filter((l) => l !== setLocal) }
  }, [])
  return local
}

function recomputeFatigue(sets: SetLog[], profile: Profile): FatigueState {
  return computeFatigue(new Date(), {
    sets, contributionsFor, bodyweightKg: profile.bodyweightKg, bodyweightFactorFor,
  })
}

export async function load() {
  const [profile, gyms, workouts, progression] = await Promise.all([
    store.getProfile(), store.getGyms(), store.getWorkouts(), store.getProgression(),
  ])
  const active = workouts.find((w) => !w.endedAt) ?? null
  const finished = workouts.filter((w) => w.endedAt)
  const sets = finished.flatMap((w) => w.entries.flatMap((e) => e.sets))
  set({
    ready: true, profile, gyms, workouts: finished, progression, sets, active,
    fatigue: recomputeFatigue(sets, profile),
  })
}

export async function saveProfile(patch: Partial<Profile>) {
  const profile = { ...state.profile, ...patch }
  await store.putProfile(profile)
  set({ profile, fatigue: recomputeFatigue(state.sets, profile) })
}

export async function saveGym(gym: Gym) {
  await store.putGym(gym)
  set({ gyms: await store.getGyms() })
}

export function currentGym(): Gym | undefined {
  return state.gyms.find((g) => g.id === state.profile.defaultGymId) ?? state.gyms[0]
}

export async function startWorkout(entries: WorkoutEntry[]) {
  const workout: Workout = {
    id: crypto.randomUUID(),
    gymId: currentGym()?.id ?? 'default',
    startedAt: new Date().toISOString(),
    displayUnit: state.profile.displayUnit,
    entries,
  }
  await store.putWorkout(workout)
  set({ active: workout })
}

/** Persist after every set: a browser tab dying mid-session must not cost the
 *  work already done. */
export async function updateActive(next: Workout) {
  await store.putWorkout(next)
  set({ active: { ...next } })
}

export async function finishWorkout() {
  const active = state.active
  if (!active) return
  // Drop exercises that were never touched, so history reflects what happened.
  const entries = active.entries.filter((e) => e.sets.length > 0)
  const done: Workout = { ...active, entries, endedAt: new Date().toISOString() }
  await store.putWorkout(done)

  const progression = new Map(state.progression)
  for (const entry of entries) {
    const updated = applySession(
      progression.get(entry.variantId), entry.variantId, entry.sets, done.endedAt!)
    progression.set(entry.variantId, updated)
    await store.putProgression(updated)
  }

  const workouts = [done, ...state.workouts]
  const sets = workouts.flatMap((w) => w.entries.flatMap((e) => e.sets))
  set({
    active: null, workouts, progression, sets,
    fatigue: recomputeFatigue(sets, state.profile),
  })
}

export async function abandonWorkout() {
  if (state.active) await store.deleteWorkout(state.active.id)
  set({ active: null })
}

export async function reloadEverything() {
  set({ ready: false })
  await load()
}

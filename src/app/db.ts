/** On-device storage. No account, no server, no network calls — the entire
 *  database lives in this browser. See docs/data-model.md §10 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Workout, SetLog } from '../core/types'
import type { ProgressionState } from '../core/engine/progression'
import type { ReviewState } from '../core/learn/scheduler'
import type { MuscleId } from '../taxonomy-shim'

export const SCHEMA_VERSION = 1

export interface Gym {
  id: string
  name: string
  equipmentTypeIds: string[]
}

export interface Profile {
  id: 'me'
  onboarded: boolean
  displayUnit: 'kg' | 'lb'
  bodyweightKg: number
  defaultGymId: string
  /** Overrides for DEFAULT_WEEKLY_TARGETS; absent means use the default. */
  weeklyTargets?: Partial<Record<MuscleId, number>>
  excludedMovementIds: string[]
  restrictedMuscles: MuscleId[]
  sessionMinutes: number
  /** Show an anatomy card between sets. */
  studyDuringRest: boolean
  restSeconds: number
}

interface BeauDB extends DBSchema {
  profile: { key: string; value: Profile }
  gyms: { key: string; value: Gym }
  workouts: { key: string; value: Workout; indexes: { byStart: string } }
  progression: { key: string; value: ProgressionState }
  reviews: { key: string; value: ReviewState }
}

let dbPromise: Promise<IDBPDatabase<BeauDB>> | null = null

export function db() {
  dbPromise ??= openDB<BeauDB>('beau', SCHEMA_VERSION, {
    upgrade(database, oldVersion) {
      // Migrations are an explicit chain from version 1. Months of real training
      // data will live here; silent schema drift would destroy it.
      if (oldVersion < 1) {
        database.createObjectStore('profile', { keyPath: 'id' })
        database.createObjectStore('gyms', { keyPath: 'id' })
        const workouts = database.createObjectStore('workouts', { keyPath: 'id' })
        workouts.createIndex('byStart', 'startedAt')
        database.createObjectStore('progression', { keyPath: 'variantId' })
        database.createObjectStore('reviews', { keyPath: 'cardId' })
      }
    },
  })
  return dbPromise
}

export const DEFAULT_PROFILE: Profile = {
  id: 'me', onboarded: false, displayUnit: 'lb', bodyweightKg: 80,
  defaultGymId: 'default', excludedMovementIds: [], restrictedMuscles: [],
  sessionMinutes: 60, studyDuringRest: true, restSeconds: 120,
}

export async function getProfile(): Promise<Profile> {
  return (await (await db()).get('profile', 'me')) ?? DEFAULT_PROFILE
}

export async function putProfile(p: Profile) {
  await (await db()).put('profile', p)
}

export async function getGyms(): Promise<Gym[]> {
  return (await db()).getAll('gyms')
}

export async function putGym(g: Gym) {
  await (await db()).put('gyms', g)
}

export async function getWorkouts(): Promise<Workout[]> {
  const all = await (await db()).getAllFromIndex('workouts', 'byStart')
  return all.reverse()
}

export async function putWorkout(w: Workout) {
  await (await db()).put('workouts', w)
}

export async function deleteWorkout(id: string) {
  await (await db()).delete('workouts', id)
}

/** Every set ever logged, flattened. The engine works on this. */
export async function allSets(): Promise<SetLog[]> {
  const workouts = await (await db()).getAll('workouts')
  return workouts.flatMap((w) => w.entries.flatMap((e) => e.sets))
}

export async function getProgression(): Promise<Map<string, ProgressionState>> {
  const rows = await (await db()).getAll('progression')
  return new Map(rows.map((r) => [r.variantId, r]))
}

export async function putProgression(s: ProgressionState) {
  await (await db()).put('progression', s)
}

export async function getReviews(): Promise<Map<string, ReviewState>> {
  const rows = await (await db()).getAll('reviews')
  return new Map(rows.map((r) => [r.cardId, r]))
}

export async function putReview(s: ReviewState) {
  await (await db()).put('reviews', s)
}

export async function clearAll() {
  const database = await db()
  for (const store of ['profile', 'gyms', 'workouts', 'progression', 'reviews'] as const) {
    await database.clear(store)
  }
}

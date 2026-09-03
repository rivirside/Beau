/** The canonical interchange format.
 *
 *  This prototype is a real training log that has to survive the port to Swift,
 *  so the exporter is the migration path, not a nice-to-have. It ships in the
 *  first build and round-trips through its own importer.
 *  See docs/data-model.md §10 */

import { db, SCHEMA_VERSION, type Profile, type Gym } from './db'
import type { Workout } from '../core/types'
import type { ProgressionState } from '../core/engine/progression'
import type { ReviewState } from '../core/learn/scheduler'

export interface BeauExport {
  format: 'beau-export'
  schemaVersion: number
  exportedAt: string
  appVersion: string
  profile: Profile | null
  gyms: Gym[]
  workouts: Workout[]
  progression: ProgressionState[]
  reviews: ReviewState[]
}

import { APP_VERSION } from './update'

export async function buildExport(): Promise<BeauExport> {
  const database = await db()
  return {
    format: 'beau-export',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    profile: (await database.get('profile', 'me')) ?? null,
    gyms: await database.getAll('gyms'),
    workouts: await database.getAll('workouts'),
    progression: await database.getAll('progression'),
    reviews: await database.getAll('reviews'),
  }
}

export async function downloadExport() {
  const data = await buildExport()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `beau-${data.exportedAt.slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export interface ImportResult {
  workouts: number
  sets: number
  replaced: boolean
}

/** Replaces everything. Merging two divergent histories is a real problem and
 *  guessing at it would lose data quietly; this is explicit instead. */
export async function importExport(json: unknown): Promise<ImportResult> {
  const data = json as Partial<BeauExport>
  if (data.format !== 'beau-export') {
    throw new Error('Not a Beau export file.')
  }
  if (typeof data.schemaVersion !== 'number' || data.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `That file is from a newer version of Beau (schema ${data.schemaVersion}). ` +
      'Update the app first, then import.')
  }

  const database = await db()
  const tx = database.transaction(
    ['profile', 'gyms', 'workouts', 'progression', 'reviews'], 'readwrite')
  await Promise.all([
    tx.objectStore('profile').clear(),
    tx.objectStore('gyms').clear(),
    tx.objectStore('workouts').clear(),
    tx.objectStore('progression').clear(),
    tx.objectStore('reviews').clear(),
  ])
  if (data.profile) await tx.objectStore('profile').put(data.profile)
  for (const g of data.gyms ?? []) await tx.objectStore('gyms').put(g)
  for (const w of data.workouts ?? []) await tx.objectStore('workouts').put(w)
  for (const p of data.progression ?? []) await tx.objectStore('progression').put(p)
  for (const r of data.reviews ?? []) await tx.objectStore('reviews').put(r)
  await tx.done

  const workouts = data.workouts ?? []
  return {
    workouts: workouts.length,
    sets: workouts.reduce((n, w) => n + w.entries.reduce((m, e) => m + e.sets.length, 0), 0),
    replaced: true,
  }
}

/** The day's proposal as a store, so the Today list and the pushed exercise page
 *  read and change the same thing. Persisted as a dated draft. */

import { useEffect, useState } from 'preact/hooks'
import type { PickedExercise } from '../core/engine/generate'
import { generateWorkout, alternativesFor } from '../core/engine/generate'
import { focusUnits, scaledTargets } from '../core/engine/plan'
import { resolveVariant } from '../core/variants'
import { MOVEMENT_CATALOG, type IndexedVariant } from '../core/movements'
import { useApp, currentGym, saveProfile, saveGym, startWorkout, VARIANTS, todayKey } from './store'
import { prescriptionFor, entryFor } from './prescription'
import type { AppState } from './store'

let picks: PickedExercise[] | null = null
let listeners: (() => void)[] = []
const notify = () => { for (const l of listeners) l() }

export function useToday() {
  const app = useApp()
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.push(l)
    return () => { listeners = listeners.filter((x) => x !== l) }
  }, [])
  const today = todayKey()
  const dow = new Date().getDay()
  const dayPlan = app.profile.week[dow]
  const trainAnyway = app.profile.draft?.date === today && !!app.profile.draft.trainAnyway
  return {
    app, today, dow, dayPlan, trainAnyway,
    isRestDay: !dayPlan && !trainAnyway,
    focus: dayPlan?.focus ?? 'auto',
    minutes: dayPlan?.minutes ?? app.profile.sessionMinutes,
    picks,
  }
}

function skippedToday(app: AppState) {
  return new Set(app.profile.skipped?.date === todayKey() ? app.profile.skipped.movementIds : [])
}

function generate(app: AppState, locked: string[], over: {
  skip?: Set<string>; excluded?: Set<string>; equipment?: Set<string>
} = {}): PickedExercise[] {
  const gym = currentGym()
  if (!gym) return []
  const dow = new Date().getDay()
  const dayPlan = app.profile.week[dow]
  const units = focusUnits(dayPlan?.focus ?? 'auto')
  const weekAgo = Date.now() - 7 * 86_400_000
  return generateWorkout({
    at: new Date(), fatigue: app.fatigue,
    availableEquipment: over.equipment ?? new Set(gym.equipmentTypeIds),
    recentSets: app.sets.filter((s) => new Date(s.performedAt).getTime() >= weekAgo),
    variantIndex: VARIANTS,
    weeklyTargets: app.profile.weeklyTargets ?? scaledTargets(app.profile.volumePreset),
    excludedMovementIds: new Set([...(over.excluded ?? app.profile.excludedMovementIds), ...(over.skip ?? skippedToday(app))]),
    restrictedMuscles: new Set(app.profile.restrictedMuscles),
    minutesAvailable: dayPlan?.minutes ?? app.profile.sessionMinutes,
    familiarVariantIds: new Set(app.progression.keys()),
    ...(units ? { focusUnits: units } : {}),
    lockedVariantIds: locked,
  }).exercises
}

async function commit(next: PickedExercise[], trainAnyway?: boolean) {
  picks = next
  notify()
  await saveProfile({ draft: { date: todayKey(), variantIds: next.map((p) => p.variant.id),
                               ...(trainAnyway ? { trainAnyway: true } : {}) } })
}

/** Called by Today on mount and whenever the plan/gym changes. */
export function ensureProposal(app: AppState, isRestDay: boolean) {
  if (isRestDay || !currentGym()) { picks = []; notify(); return }
  const draft = app.profile.draft
  const locked = draft?.date === todayKey() ? draft.variantIds : []
  picks = generate(app, locked)
  notify()
}

export const todayActions = {
  regenerate: (app: AppState) => commit(generate(app, []), !!app.profile.draft?.trainAnyway),
  trainAnyway: (app: AppState) => commit(generate(app, []), true),

  async skip(app: AppState, pick: PickedExercise) {
    const skip = new Set([...skippedToday(app), pick.movement.id])
    await saveProfile({ skipped: { date: todayKey(), movementIds: [...skip] } })
    await commit(generate(app, rest(pick), { skip }))
  },
  async never(app: AppState, pick: PickedExercise) {
    const excluded = new Set([...app.profile.excludedMovementIds, pick.movement.id])
    await saveProfile({ excludedMovementIds: [...excluded] })
    await commit(generate(app, rest(pick), { excluded }))
  },
  async remove(_app: AppState, pick: PickedExercise) {
    await commit((picks ?? []).filter((p) => p.variant.id !== pick.variant.id))
  },
  async missingEquipment(app: AppState, pick: PickedExercise, equipmentId: string) {
    const gym = currentGym()
    if (!gym) return
    const ids = gym.equipmentTypeIds.filter((e) => e !== equipmentId)
    await saveGym({ ...gym, equipmentTypeIds: ids })
    await commit(generate(app, rest(pick), { equipment: new Set(ids) }))
  },
  alternatives(app: AppState, pick: PickedExercise): IndexedVariant[] {
    const gym = currentGym()
    if (!gym) return []
    return alternativesFor(pick.variant.id, {
      availableEquipment: new Set(gym.equipmentTypeIds),
      excludedMovementIds: new Set([...app.profile.excludedMovementIds, ...skippedToday(app)]),
      excludeMovementIds: new Set((picks ?? []).map((p) => p.movement.id)),
      variantIndex: VARIANTS, limit: 8,
    })
  },
  async swap(_app: AppState, pick: PickedExercise, alt: IndexedVariant) {
    const replacement: PickedExercise = { variant: alt.variant, movement: alt.movement, sets: pick.sets,
      targets: pick.targets, score: pick.score, rationale: `Swapped in for ${pick.variant.displayName}.` }
    await commit((picks ?? []).map((p) => (p.variant.id === pick.variant.id ? replacement : p)))
  },
  async add(_app: AppState, entry: IndexedVariant) {
    const added: PickedExercise = { variant: entry.variant, movement: entry.movement, sets: 3, targets: [],
      score: 0, rationale: 'Added by you.' }
    await commit([...(picks ?? []), added])
  },
  searchable(query: string) {
    const gym = currentGym()
    const have = new Set(gym?.equipmentTypeIds ?? [])
    const inSession = new Set((picks ?? []).map((p) => p.movement.id))
    const q = query.trim().toLowerCase()
    return MOVEMENT_CATALOG
      .filter((m) => !inSession.has(m.id) && (!q || m.name.toLowerCase().includes(q)))
      .map((m) => ({ movement: m, variant: resolveVariant(m, {}),
                     available: m.equipmentTypeIds.every((e) => have.has(e)) }))
      .sort((a, b) => Number(b.available) - Number(a.available)).slice(0, 40)
  },
  async begin(app: AppState) {
    if (!picks?.length) return
    const entries = picks.map((p, i) => entryFor(p, i, prescriptionFor(p, app.profile, app.progression)))
    await saveProfile({ draft: undefined, skipped: undefined })
    picks = null
    await startWorkout(entries)
  },
}

const rest = (pick: PickedExercise) => (picks ?? []).filter((p) => p.variant.id !== pick.variant.id).map((p) => p.variant.id)

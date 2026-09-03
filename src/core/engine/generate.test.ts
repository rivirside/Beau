import { test } from 'node:test'
import { focusUnits } from './plan'
import assert from 'node:assert/strict'
import type { SetLog } from '../types'
import { buildVariantIndex } from '../movements'
import { computeFatigue } from './fatigue'
import { generateWorkout } from './generate'
import { GENERATION } from './constants'
import { EQUIPMENT_TYPES } from '../equipment/catalog'

const INDEX = buildVariantIndex()
const AT = new Date('2026-02-02T18:00:00.000Z')
const FULL_GYM = new Set(EQUIPMENT_TYPES.map((e) => e.id))
const contributionsFor = (id: string) => INDEX.get(id)?.variant.contributions

const fresh = computeFatigue(AT, { sets: [], contributionsFor })

const base = {
  at: AT, fatigue: fresh, availableEquipment: FULL_GYM,
  recentSets: [] as SetLog[], variantIndex: INDEX,
}

test('a full gym and a rested lifter produces a workout', () => {
  const w = generateWorkout(base)
  assert.ok(w.exercises.length >= 3)
  assert.ok(w.exercises.every((e) => e.sets > 0))
})

test('it never exceeds its systemic or axial budget', () => {
  const w = generateWorkout({ ...base, minutesAvailable: 240 })
  assert.ok(w.systemicUsed <= GENERATION.systemicBudget + 1e-9)
  assert.ok(w.axialUsed <= GENERATION.axialBudget + 1e-9)
})

test('a shorter session yields fewer exercises', () => {
  const short = generateWorkout({ ...base, minutesAvailable: 25 })
  const long = generateWorkout({ ...base, minutesAvailable: 90 })
  assert.ok(short.exercises.length < long.exercises.length)
})

test('it never prescribes the same movement twice in one session', () => {
  const w = generateWorkout({ ...base, minutesAvailable: 240 })
  const ids = w.exercises.map((e) => e.movement.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('only equipment on hand is used', () => {
  const bodyweightOnly = new Set(['bodyweight', 'pull_up_bar', 'dip_station'])
  const w = generateWorkout({ ...base, availableEquipment: bodyweightOnly })
  for (const e of w.exercises) {
    for (const id of e.movement.equipmentTypeIds) assert.ok(bodyweightOnly.has(id))
  }
})

test('an empty gym produces nothing rather than an impossible plan', () => {
  const w = generateWorkout({ ...base, availableEquipment: new Set() })
  assert.equal(w.exercises.length, 0)
  assert.ok(w.unmet.length > 0)
})

test('a restricted muscle is trained around, not through', () => {
  const w = generateWorkout({ ...base, restrictedMuscles: new Set(['lats']), minutesAvailable: 240 })
  for (const e of w.exercises) {
    assert.ok((e.variant.contributions.lats ?? 0) < 0.3, e.movement.id)
  }
})

test('excluded movements are never prescribed', () => {
  const first = generateWorkout({ ...base, minutesAvailable: 240 })
  const banned = new Set([first.exercises[0]!.movement.id])
  const second = generateWorkout({ ...base, minutesAvailable: 240, excludedMovementIds: banned })
  assert.ok(!second.exercises.some((e) => banned.has(e.movement.id)))
})

test('yesterday\'s hard session steers today away from those muscles', () => {
  const chestVariant = [...INDEX.keys()].find((id) => id.startsWith('barbell_bench_press'))!
  const yesterday = new Date(AT.getTime() - 24 * 3_600_000).toISOString()
  const recentSets: SetLog[] = Array.from({ length: 6 }, (_, n) => ({
    id: String(n), variantId: chestVariant, performedAt: yesterday,
    setIndex: n, kind: 'working' as const, weightKg: 100, reps: 8, rir: 1,
  }))
  const fatigued = computeFatigue(AT, { sets: recentSets, contributionsFor })
  assert.ok(fatigued.freshness.pec_mid! < 0.5)

  const w = generateWorkout({ ...base, fatigue: fatigued, recentSets, minutesAvailable: 90 })
  const chestWork = w.exercises.reduce((n, e) => n + (e.variant.contributions.pec_mid ?? 0), 0)
  const restedRun = generateWorkout({ ...base, minutesAvailable: 90 })
  const restedChest = restedRun.exercises.reduce((n, e) => n + (e.variant.contributions.pec_mid ?? 0), 0)
  assert.ok(chestWork < restedChest)
})

test('volume already banked this week reduces what is owed', () => {
  const legVariant = [...INDEX.keys()].find((id) => id.startsWith('back_squat'))!
  const recentSets: SetLog[] = Array.from({ length: 12 }, (_, n) => ({
    id: String(n), variantId: legVariant,
    performedAt: new Date(AT.getTime() - 6 * 86_400_000).toISOString(),
    setIndex: n, kind: 'working' as const, weightKg: 140, reps: 5, rir: 2,
  }))
  const withHistory = generateWorkout({ ...base, recentSets, minutesAvailable: 90 })
  const quadWork = withHistory.exercises.reduce(
    (n, e) => n + (e.variant.contributions.quads_vasti ?? 0), 0)
  const withoutHistory = generateWorkout({ ...base, minutesAvailable: 90 })
  const quadBaseline = withoutHistory.exercises.reduce(
    (n, e) => n + (e.variant.contributions.quads_vasti ?? 0), 0)
  assert.ok(quadWork < quadBaseline)
})

test('every pick explains itself', () => {
  const w = generateWorkout(base)
  for (const e of w.exercises) {
    assert.ok(e.rationale.length > 0)
    assert.match(e.rationale, /owed/)
    assert.ok(e.targets.length > 0)
  }
})

test('generation is deterministic', () => {
  const a = generateWorkout({ ...base, minutesAvailable: 75 })
  const b = generateWorkout({ ...base, minutesAvailable: 75 })
  assert.deepEqual(a.exercises.map((e) => e.variant.id), b.exercises.map((e) => e.variant.id))
})

test('units with a zero weekly target are never programmed by default', () => {
  const w = generateWorkout({ ...base, minutesAvailable: 240 })
  // toe_flexors, neck and the ankle units default to 0 — the rehab tail is opt-in.
  const leads = w.exercises.map((e) => e.targets[0]!.muscle)
  for (const m of ['toe_flexors', 'ankle_evertors', 'neck_flexors'] as const) {
    assert.ok(!leads.includes(m))
  }
})

test('it stops rather than padding a session with near-pointless picks', () => {
  const w = generateWorkout({ ...base, minutesAvailable: 240 })
  const leadNeeds = w.exercises.map((e) => e.targets[0]!.need * e.targets[0]!.contribution)
  const first = leadNeeds[0]!
  for (const n of leadNeeds) assert.ok(n > first * 0.05, 'a pick satisfied almost nothing')
})

test('familiar variants are preferred, so progression can accumulate', () => {
  const plain = generateWorkout({ ...base, minutesAvailable: 90 })
  const target = plain.exercises[1]!.movement
  // A non-default variant of that movement, which would not normally be picked.
  const sibling = [...INDEX.values()].find((e) =>
    e.movement.id === target.id && e.variant.id !== plain.exercises[1]!.variant.id)
  if (!sibling) return
  const withHistory = generateWorkout({
    ...base, minutesAvailable: 90, familiarVariantIds: new Set([sibling.variant.id]),
  })
  const chosen = withHistory.exercises.find((e) => e.movement.id === target.id)
  assert.equal(chosen?.variant.id, sibling.variant.id)
})

test('locked variants are kept and generation fills around them', () => {
  const first = generateWorkout({ ...base, minutesAvailable: 60 })
  const keep = first.exercises.slice(0, 2).map((e) => e.variant.id)
  const banned = new Set(first.exercises.slice(2).map((e) => e.movement.id))
  const again = generateWorkout({
    ...base, minutesAvailable: 60, lockedVariantIds: keep, excludedMovementIds: banned,
  })
  assert.deepEqual(again.exercises.slice(0, 2).map((e) => e.variant.id), keep)
  assert.ok(again.exercises.length >= 2)
  for (const e of again.exercises.slice(2)) assert.ok(!banned.has(e.movement.id))
})

test('a locked pick never duplicates its movement', () => {
  const first = generateWorkout({ ...base, minutesAvailable: 90 })
  const keep = first.exercises[0]!.variant.id
  const again = generateWorkout({ ...base, minutesAvailable: 90, lockedVariantIds: [keep] })
  const ids = again.exercises.map((e) => e.movement.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('a push focus programs no rows or curls', () => {
  
  const w = generateWorkout({ ...base, minutesAvailable: 120, focusUnits: focusUnits('push')! })
  assert.ok(w.exercises.length > 0)
  for (const e of w.exercises) {
    const lead = e.targets[0]!.muscle
    assert.ok(!['lats', 'rhomboids', 'biceps_long', 'biceps_short'].includes(lead), e.movement.id)
  }
})

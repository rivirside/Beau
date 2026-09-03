import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { SetLog } from '../types'
import { MUSCLES } from '../taxonomy/muscles'
import { computeFatigue, fatigueLoadAt, effortFactor, setStimulus, explainFreshness } from './fatigue'
import type { FatigueInput } from './fatigue'

const T0 = new Date('2026-01-15T18:00:00.000Z')
const hoursAfter = (h: number) => new Date(T0.getTime() + h * 3_600_000)

const set = (over: Partial<SetLog> = {}): SetLog => ({
  id: Math.random().toString(36).slice(2),
  variantId: 'bench',
  performedAt: T0.toISOString(),
  setIndex: 0, kind: 'working', weightKg: 100, reps: 8, rir: 2,
  ...over,
})

const input = (sets: SetLog[]): FatigueInput => ({
  sets,
  contributionsFor: (id) =>
    id === 'bench' ? { pec_mid: 1.0, triceps_lateral: 0.5 }
    : id === 'curl' ? { biceps_long: 1.0 }
    : id === 'pullup' ? { lats: 1.0 } : undefined,
  bodyweightKg: 80,
  bodyweightFactorFor: (id) => (id === 'pullup' ? 0.95 : undefined),
})

test('effort factor rises as reps in reserve fall', () => {
  assert.ok(effortFactor(0) > effortFactor(2))
  assert.ok(effortFactor(2) > effortFactor(4))
  assert.equal(effortFactor(0), 1)
  // An unlogged RIR is assumed conservative, not maximal.
  assert.equal(effortFactor(undefined), effortFactor(2))
})

test('warm-up sets create no fatigue', () => {
  const i = input([set({ kind: 'warmup' })])
  assert.equal(setStimulus(i.sets[0]!, 'pec_mid', i), 0)
})

test('a set only fatigues the muscles the variant actually works', () => {
  const i = input([set()])
  assert.ok(setStimulus(i.sets[0]!, 'pec_mid', i) > 0)
  assert.equal(setStimulus(i.sets[0]!, 'quads_vasti', i), 0)
})

test('contribution scales stimulus proportionally', () => {
  const i = input([set()])
  const pec = setStimulus(i.sets[0]!, 'pec_mid', i)
  const tri = setStimulus(i.sets[0]!, 'triceps_lateral', i)
  assert.ok(Math.abs(tri - pec * 0.5) < 1e-9)
})

test('bodyweight movements are loaded even with no external weight', () => {
  const i = input([set({ variantId: 'pullup', weightKg: null })])
  assert.ok(setStimulus(i.sets[0]!, 'lats', i) > 0)
})

test('fatigue halves after exactly one half-life', () => {
  const i = input([set()])
  const halfLife = MUSCLES.pec_mid.halfLifeH
  const immediate = fatigueLoadAt(T0, i).pec_mid!
  const later = fatigueLoadAt(hoursAfter(halfLife), i).pec_mid!
  assert.ok(Math.abs(later / immediate - 0.5) < 1e-9)
})

test('fatigue decays monotonically and future sets are ignored', () => {
  const i = input([set()])
  const points = [0, 12, 24, 48, 96].map((h) => fatigueLoadAt(hoursAfter(h), i).pec_mid ?? 0)
  for (let n = 1; n < points.length; n++) assert.ok(points[n]! < points[n - 1]!)
  assert.equal(fatigueLoadAt(hoursAfter(-1), i).pec_mid ?? 0, 0)
})

test('freshness is 1 when there is no history to calibrate against', () => {
  const state = computeFatigue(T0, input([]))
  assert.equal(state.freshness.pec_mid, 1)
})

test('a hard session leaves the trained muscle less fresh than an untrained one', () => {
  const sets = Array.from({ length: 5 }, (_, n) => set({ setIndex: n }))
  const state = computeFatigue(hoursAfter(1), input(sets))
  assert.ok(state.freshness.pec_mid! < state.freshness.quads_vasti!)
  assert.equal(state.freshness.quads_vasti, 1)
})

test('freshness recovers toward 1 as time passes', () => {
  const sets = Array.from({ length: 5 }, (_, n) => set({ setIndex: n }))
  const i = input(sets)
  const day1 = computeFatigue(hoursAfter(24), i).freshness.pec_mid!
  const day4 = computeFatigue(hoursAfter(96), i).freshness.pec_mid!
  assert.ok(day4 > day1)
  assert.ok(day4 > 0.85)
})

test('capacity is personal: doubling every load leaves freshness unchanged', () => {
  const light = Array.from({ length: 4 }, (_, n) =>
    set({ setIndex: n, performedAt: hoursAfter(-24 * n).toISOString() }))
  const heavy = light.map((s) => ({ ...s, weightKg: (s.weightKg ?? 0) * 2 }))
  const a = computeFatigue(hoursAfter(1), input(light)).freshness.pec_mid!
  const b = computeFatigue(hoursAfter(1), input(heavy)).freshness.pec_mid!
  assert.ok(Math.abs(a - b) < 1e-9)
})

test('explanations name the muscle, a percentage and when it was worked', () => {
  const sets = Array.from({ length: 3 }, (_, n) => set({ setIndex: n }))
  const i = input(sets)
  const text = explainFreshness('pec_mid', hoursAfter(48), computeFatigue(hoursAfter(48), i), i)
  assert.match(text, /Mid chest/)
  assert.match(text, /%/)
  assert.match(text, /3 sets/)
})

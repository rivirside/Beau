import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { SetLog } from '../types'
import type { LoadingModel } from '../taxonomy/equipment'
import { estimate1rm, applySession, prescribe } from './progression'
import { PROGRESSION } from './constants'

const DB: LoadingModel = { kind: 'fixed_set', weightsKg: [10, 12.5, 15, 17.5, 20, 22.5, 25] }
const BAR: LoadingModel = { kind: 'plate_loaded', barKg: 20, platePairsKg: [20, 10, 5, 2.5, 1.25] }

const sets = (weightKg: number, reps: number, rir = 1, n = 3): SetLog[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${weightKg}-${i}`, variantId: 'v', performedAt: '2026-01-15T18:00:00.000Z',
    setIndex: i, kind: 'working' as const, weightKg, reps, rir,
  }))

test('e1RM rises with reps and with reps in reserve', () => {
  const a = estimate1rm(100, 5, 0)!
  const b = estimate1rm(100, 8, 0)!
  const c = estimate1rm(100, 5, 3)!
  assert.ok(b > a)
  assert.ok(c > a)
  // reps + rir is what matters, not either alone
  assert.equal(estimate1rm(100, 5, 3), estimate1rm(100, 8, 0))
})

test('e1RM refuses to guess from sets far off failure', () => {
  assert.equal(estimate1rm(100, 20, 5), null)
  assert.equal(estimate1rm(0, 5, 0), null)
  assert.equal(estimate1rm(100, 0, 0), null)
})

test('a first session establishes state without smoothing toward zero', () => {
  const state = applySession(undefined, 'v', sets(100, 8), '2026-01-15T18:00:00.000Z')
  assert.equal(state.sessions, 1)
  assert.equal(state.lastWorkingWeightKg, 100)
  assert.ok(Math.abs(state.estimated1rmKg - estimate1rm(100, 8, 1)!) < 1e-9)
})

test('a non-improving session increments the stall counter', () => {
  let s = applySession(undefined, 'v', sets(100, 8), '2026-01-15T18:00:00.000Z')
  s = applySession(s, 'v', sets(100, 8), '2026-01-18T18:00:00.000Z')
  assert.equal(s.consecutiveStalls, 1)
  s = applySession(s, 'v', sets(100, 8), '2026-01-22T18:00:00.000Z')
  assert.equal(s.consecutiveStalls, 2)
})

test('an improving session clears the stall counter', () => {
  let s = applySession(undefined, 'v', sets(100, 8), '2026-01-15T18:00:00.000Z')
  s = applySession(s, 'v', sets(100, 8), '2026-01-18T18:00:00.000Z')
  assert.equal(s.consecutiveStalls, 1)
  s = applySession(s, 'v', sets(105, 8), '2026-01-22T18:00:00.000Z')
  assert.equal(s.consecutiveStalls, 0)
})

test('warm-up sets never set the working weight', () => {
  const withWarmup: SetLog[] = [
    { ...sets(140, 3)[0]!, kind: 'warmup' },
    ...sets(100, 8),
  ]
  const s = applySession(undefined, 'v', withWarmup, '2026-01-15T18:00:00.000Z')
  assert.equal(s.lastWorkingWeightKg, 100)
})

test('no history asks for a calibration session rather than guessing', () => {
  const p = prescribe(undefined, undefined, DB)
  assert.match(p.rationale, /First time/)
})

test('hitting the top of the range on every set earns an increase', () => {
  const last = sets(20, 10, 1)
  const state = applySession(undefined, 'v', last, '2026-01-15T18:00:00.000Z')
  const p = prescribe(state, last, DB, { repRange: { min: 6, max: 10 }, targetRir: 2 })
  assert.ok(p.targetKg > 20)
  assert.equal(p.targetKg, 22.5)   // the rack's next real weight, not 21
  assert.match(p.rationale, /up one increment/)
})

test('falling short of the range holds the weight', () => {
  const last = sets(20, 7, 1)
  const state = applySession(undefined, 'v', last, '2026-01-15T18:00:00.000Z')
  const p = prescribe(state, last, DB, { repRange: { min: 6, max: 10 } })
  assert.equal(p.targetKg, 20)
  assert.match(p.rationale, /Hold/)
})

test('reps at the top of the range but far from failure do not earn an increase', () => {
  const last = sets(20, 10, 5)
  const state = applySession(undefined, 'v', last, '2026-01-15T18:00:00.000Z')
  const p = prescribe(state, last, DB, { repRange: { min: 6, max: 10 }, targetRir: 2 })
  assert.equal(p.targetKg, 20)
})

test('repeated stalls trigger a deload', () => {
  let s = applySession(undefined, 'v', sets(100, 8), '2026-01-15T18:00:00.000Z')
  for (let i = 0; i < PROGRESSION.stallsBeforeDeload; i++) {
    s = applySession(s, 'v', sets(100, 8), '2026-01-18T18:00:00.000Z')
  }
  const p = prescribe(s, sets(100, 8), BAR)
  assert.ok(p.targetKg < 100)
  assert.match(p.rationale, /Stalled/)
})

test('every prescription is a weight the equipment can actually produce', () => {
  const last = sets(100, 10, 0)
  const state = applySession(undefined, 'v', last, '2026-01-15T18:00:00.000Z')
  const p = prescribe(state, last, BAR, { repRange: { min: 6, max: 10 } })
  const perSide = (p.targetKg - 20) / 2
  // Must be reachable from 20/10/5/2.5/1.25 pairs
  assert.ok(Math.abs(perSide * 4 - Math.round(perSide * 4)) < 1e-9)
  assert.match(p.display, /per side/)
})

test('an unmeasurable session does not count as a stall', () => {
  // 20 reps at RIR 5 is far too far from failure to estimate anything from.
  let s = applySession(undefined, 'v', sets(20, 20, 5), '2026-01-15T18:00:00.000Z')
  for (let i = 0; i < 5; i++) {
    s = applySession(s, 'v', sets(20, 20, 5), '2026-01-18T18:00:00.000Z')
  }
  assert.equal(s.consecutiveStalls, 0)
})

test('badly beating the rep range jumps the weight instead of nudging it', () => {
  const last = sets(20, 20, 2)
  const state = applySession(undefined, 'v', last, '2026-01-15T18:00:00.000Z')
  const p = prescribe(state, last, BAR, { repRange: { min: 6, max: 10 }, unit: 'kg' })
  // One increment would be 21.25kg; calibration should clear that comfortably.
  assert.ok(p.targetKg >= 25, `expected a real jump, got ${p.targetKg}`)
  assert.match(p.rationale, /too light/)
})

test('calibration can escape zero on an unloaded plate machine', () => {
  const machine: LoadingModel = { kind: 'plate_loaded', barKg: 0, platePairsKg: [20, 10, 5, 2.5] }
  const last = sets(0, 20, 2)
  const state = applySession(undefined, 'v', last, '2026-01-15T18:00:00.000Z')
  const p = prescribe(state, last, machine, { repRange: { min: 6, max: 10 } })
  assert.ok(p.targetKg > 0, 'multiplying zero cannot escape zero')
})

test('a movement with no heavier load progresses by reps', () => {
  const bw: LoadingModel = { kind: 'bodyweight', canAddLoad: false, canAssist: false }
  const last = sets(0, 10, 1)
  const state = applySession(undefined, 'v', last, '2026-01-15T18:00:00.000Z')
  const p = prescribe(state, last, bw, { repRange: { min: 6, max: 10 }, targetRir: 2 })
  assert.ok(p.repRange.min > 10)
  assert.match(p.rationale, /by reps/)
})

test('an unloadable movement is never deloaded by a fraction of nothing', () => {
  const bw: LoadingModel = { kind: 'bodyweight', canAddLoad: false, canAssist: false }
  let s = applySession(undefined, 'v', sets(0, 8, 1), '2026-01-15T18:00:00.000Z')
  for (let i = 0; i < 5; i++) s = applySession(s, 'v', sets(0, 8, 1), '2026-01-18T18:00:00.000Z')
  const p = prescribe(s, sets(0, 8, 1), bw, { repRange: { min: 6, max: 10 } })
  assert.doesNotMatch(p.rationale, /Stalled/)
})

test('a new variant is seeded from a sibling rather than an empty bar', () => {
  const cold = prescribe(undefined, undefined, BAR)
  const seeded = prescribe(undefined, undefined, BAR, { seedFromKg: 80 })
  assert.ok(seeded.targetKg > cold.targetKg)
  assert.ok(seeded.targetKg < 80)
  assert.match(seeded.rationale, /similar exercise/)
})

test('only a truly cold start is flagged firstTime', () => {
  assert.equal(prescribe(undefined, undefined, DB).firstTime, true)
  assert.equal(prescribe(undefined, undefined, DB, { seedFromKg: 40 }).firstTime, undefined)
  const state = applySession(undefined, 'v', sets(20, 8), '2026-01-15T18:00:00.000Z')
  assert.equal(prescribe(state, sets(20, 8), DB).firstTime, undefined)
})

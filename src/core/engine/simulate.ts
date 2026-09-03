/** Eight weeks of synthetic training.
 *
 *  Unit tests prove each piece is correct in isolation; this asks whether the
 *  three of them together produce a programme a person would actually follow.
 *  Run with `npm run simulate`. */

import type { SetLog } from '../types'
import type { MuscleId } from '../taxonomy/muscles'
import { MUSCLES } from '../taxonomy/muscles'
import { buildVariantIndex } from '../movements'
import { EQUIPMENT_TYPES, equipmentById } from '../equipment/catalog'
import { computeFatigue, explainFreshness } from './fatigue'
import { applySession, prescribe, estimate1rm, type ProgressionState } from './progression'
import { generateWorkout } from './generate'
import { DEFAULT_WEEKLY_TARGETS } from './constants'

const INDEX = buildVariantIndex()
const GYM = new Set(EQUIPMENT_TYPES.map((e) => e.id))
const contributionsFor = (id: string) => INDEX.get(id)?.variant.contributions
const bodyweightFactorFor = (id: string) => INDEX.get(id)?.movement.bodyweightFactor
const BODYWEIGHT = 82

const WEEKS = 8
const DAYS = [1, 2, 4, 5]           // Mon, Tue, Thu, Fri
const START = new Date('2026-03-02T17:30:00.000Z')

/** The simulated lifter's real capability, hidden from the engine. */
const trueE1rm = new Map<string, number>()
const seedStrength = (variantId: string) => {
  const entry = INDEX.get(variantId)!
  const loading = equipmentById(entry.movement.equipmentTypeIds[0]!)!.defaultLoading
  const base = loading.kind === 'plate_loaded' ? 70
             : loading.kind === 'selectorized' ? 45
             : loading.kind === 'fixed_set' ? 26 : BODYWEIGHT
  return base
}

/** Given a prescribed weight, how many reps this lifter gets. Inverse Epley. */
function performReps(variantId: string, weightKg: number, targetRir: number): number {
  const strength = trueE1rm.get(variantId) ?? seedStrength(variantId)
  const bw = bodyweightFactorFor(variantId)
  const effective = bw ? BODYWEIGHT * bw + weightKg : weightKg
  if (effective <= 0) return 12
  const repsToFailure = 30 * (strength / effective - 1)
  return Math.max(1, Math.min(20, Math.round(repsToFailure - targetRir)))
}

const progression = new Map<string, ProgressionState>()
const allSets: SetLog[] = []
let setId = 0

for (let week = 0; week < WEEKS; week++) {
  for (const day of DAYS) {
    const at = new Date(START.getTime() + (week * 7 + day) * 86_400_000)
    const weekAgo = at.getTime() - 7 * 86_400_000
    const recentSets = allSets.filter((s) => new Date(s.performedAt).getTime() >= weekAgo)

    const fatigue = computeFatigue(at, { sets: allSets, contributionsFor,
                                         bodyweightKg: BODYWEIGHT, bodyweightFactorFor })
    const workout = generateWorkout({
      at, fatigue, availableEquipment: GYM, recentSets, variantIndex: INDEX,
      minutesAvailable: 65, familiarVariantIds: new Set(progression.keys()),
    })

    for (const exercise of workout.exercises) {
      const { variant, movement } = exercise
      const loading = equipmentById(movement.equipmentTypeIds[0]!)!.defaultLoading
      const state = progression.get(variant.id)
      const history = allSets.filter((s) => s.variantId === variant.id)
      const lastDay = history.at(-1)?.performedAt.slice(0, 10)
      const lastSession = history.filter((s) => s.performedAt.slice(0, 10) === lastDay)
      // Seed a new variant from the closest sibling of the same movement.
      const sibling = [...progression.values()]
        .filter((x) => INDEX.get(x.variantId)?.movement.id === movement.id)
        .sort((a, b) => b.sessions - a.sessions)[0]
      const bwFactor = movement.bodyweightFactor
      const p = prescribe(state, lastSession.length ? lastSession : undefined, loading, {
        sets: exercise.sets, bodyweightKg: BODYWEIGHT, unit: 'lb',
        bodyweightBaseKg: bwFactor ? BODYWEIGHT * bwFactor : 0,
        seedFromKg: sibling?.lastWorkingWeightKg,
      })

      const performed: SetLog[] = []
      for (let i = 0; i < p.sets; i++) {
        const reps = performReps(variant.id, p.targetKg, p.targetRir) - (i > 0 ? i - 1 : 0)
        performed.push({
          id: String(setId++), variantId: variant.id,
          performedAt: new Date(at.getTime() + i * 180_000).toISOString(),
          setIndex: i, kind: 'working', weightKg: p.targetKg, reps: Math.max(1, reps),
          rir: p.targetRir,
        })
      }
      allSets.push(...performed)
      progression.set(variant.id, applySession(state, variant.id, performed, at.toISOString()))

      // The lifter gets slightly stronger at what they actually trained.
      const current = trueE1rm.get(variant.id) ?? seedStrength(variant.id)
      trueE1rm.set(variant.id, current * 1.012)
    }
  }
}

/* ------------------------------------------------------------------- report */

console.log(`\n${WEEKS} weeks · ${DAYS.length} sessions/week · ${allSets.length} sets logged`)

const finalAt = new Date(START.getTime() + (WEEKS * 7) * 86_400_000)
const lastWeek = allSets.filter((s) =>
  new Date(s.performedAt).getTime() >= finalAt.getTime() - 7 * 86_400_000)

console.log('\nWEEKLY VOLUME vs TARGET (final week)')
const actual = new Map<MuscleId, number>()
for (const s of lastWeek) {
  for (const [m, v] of Object.entries(contributionsFor(s.variantId) ?? {}) as [MuscleId, number][]) {
    if (v < 0.3) continue
    actual.set(m, (actual.get(m) ?? 0) + Math.min(1, v))
  }
}
let region = ''
let hit = 0, targeted = 0
for (const [m, target] of Object.entries(DEFAULT_WEEKLY_TARGETS) as [MuscleId, number][]) {
  if (!target) continue
  targeted++
  const got = actual.get(m) ?? 0
  if (got >= target * 0.7) hit++
  if (MUSCLES[m].region !== region) { region = MUSCLES[m].region; console.log(`  ${region}`) }
  const bar = '█'.repeat(Math.min(24, Math.round(got))) + '·'.repeat(Math.max(0, Math.min(24, target) - Math.round(got)))
  console.log(`    ${m.padEnd(19)} ${String(Math.round(got)).padStart(2)}/${String(target).padEnd(2)} ${bar}`)
}
console.log(`\n  ${hit}/${targeted} units reached at least 70% of target`)

console.log('\nPROGRESSION (most-trained variants)')
const bySessions = [...progression.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 8)
for (const s of bySessions) {
  const name = INDEX.get(s.variantId)!.variant.displayName
  // Baseline is the first estimate that was measurable at all — the opening
  // calibration sessions are deliberately too light to estimate from.
  const startE1rm = allSets
    .filter((x) => x.variantId === s.variantId)
    .map((x) => estimate1rm((x.weightKg ?? 0) + (x.addedWeightKg ?? 0), x.reps, x.rir))
    .find((x): x is number => x !== null) ?? 0
  const change = startE1rm > 0 ? ((s.estimated1rmKg / startE1rm - 1) * 100) : 0
  console.log(`  ${name.slice(0, 32).padEnd(34)} ${String(s.sessions).padStart(2)} sessions  ` +
              `e1RM ${s.estimated1rmKg.toFixed(1).padStart(5)}kg  ` +
              `${startE1rm > 0 ? (change >= 0 ? '+' : '') + change.toFixed(1) + '%' : 'calibrating'}` +
              (s.consecutiveStalls ? `  (${s.consecutiveStalls} stalls)` : ''))
}

console.log('\nA GENERATED SESSION, WITH ITS REASONING')
const finalFatigue = computeFatigue(finalAt, { sets: allSets, contributionsFor,
                                               bodyweightKg: BODYWEIGHT, bodyweightFactorFor })
const next = generateWorkout({
  at: finalAt, fatigue: finalFatigue, availableEquipment: GYM,
  recentSets: lastWeek, variantIndex: INDEX, minutesAvailable: 65,
})
for (const e of next.exercises) {
  const loading = equipmentById(e.movement.equipmentTypeIds[0]!)!.defaultLoading
  const p = prescribe(progression.get(e.variant.id),
                      (() => { const h = allSets.filter((s) => s.variantId === e.variant.id)
                               const d = h.at(-1)?.performedAt.slice(0, 10)
                               return h.filter((s) => s.performedAt.slice(0, 10) === d) })(),
                      loading, { sets: e.sets, bodyweightKg: BODYWEIGHT, unit: 'lb',
                                 bodyweightBaseKg: e.movement.bodyweightFactor
                                   ? BODYWEIGHT * e.movement.bodyweightFactor : 0 })
  console.log(`  ${e.variant.displayName}`)
  console.log(`    ${p.sets}×${p.repRange.min}–${p.repRange.max} @ ${p.display}, RIR ${p.targetRir}`)
  console.log(`    ${e.rationale}`)
  console.log(`    ${p.rationale}`)
}
console.log(`  budget: systemic ${next.systemicUsed}, axial ${next.axialUsed}`)

console.log('\nWHY THE ENGINE SAYS WHAT IT SAYS')
for (const m of ['pec_mid', 'quads_vasti', 'lats', 'delt_lateral'] as MuscleId[]) {
  console.log('  ' + explainFreshness(m, finalAt, finalFatigue,
    { sets: allSets, contributionsFor, bodyweightKg: BODYWEIGHT, bodyweightFactorFor }))
}
console.log()

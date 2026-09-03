import { useMemo, useState } from 'preact/hooks'
import type { WorkoutEntry } from '../../core/types'
import { MUSCLES, type MuscleId } from '../../core/taxonomy/muscles'
import { generateWorkout } from '../../core/engine/generate'
import { prescribe } from '../../core/engine/progression'
import { DEFAULT_WEEKLY_TARGETS } from '../../core/engine/constants'
import { equipmentById } from '../../core/equipment/catalog'
import { useApp, currentGym, startWorkout, VARIANTS } from '../store'
import { fmtWeight } from '../format'

export function Today() {
  const app = useApp()
  const gym = currentGym()
  const [seed, setSeed] = useState(0)

  const plan = useMemo(() => {
    if (!gym) return null
    const weekAgo = Date.now() - 7 * 86_400_000
    const recentSets = app.sets.filter((s) => new Date(s.performedAt).getTime() >= weekAgo)
    return generateWorkout({
      at: new Date(),
      fatigue: app.fatigue,
      availableEquipment: new Set(gym.equipmentTypeIds),
      recentSets,
      variantIndex: VARIANTS,
      weeklyTargets: app.profile.weeklyTargets ?? DEFAULT_WEEKLY_TARGETS,
      excludedMovementIds: new Set(app.profile.excludedMovementIds),
      restrictedMuscles: new Set(app.profile.restrictedMuscles),
      minutesAvailable: app.profile.sessionMinutes,
      familiarVariantIds: new Set(app.progression.keys()),
    })
  }, [app.sets, app.fatigue, app.profile, gym, seed])

  const begin = async () => {
    if (!plan) return
    const entries: WorkoutEntry[] = plan.exercises.map((e, i) => {
      const loading = equipmentById(e.movement.equipmentTypeIds[0]!)!.defaultLoading
      const bwBase = e.movement.bodyweightFactor
        ? app.profile.bodyweightKg * e.movement.bodyweightFactor : 0
      const sibling = [...app.progression.values()]
        .filter((s) => VARIANTS.get(s.variantId)?.movement.id === e.movement.id)
        .sort((a, b) => b.sessions - a.sessions)[0]
      const p = prescribe(app.progression.get(e.variant.id), undefined, loading, {
        sets: e.sets, unit: app.profile.displayUnit,
        bodyweightKg: app.profile.bodyweightKg, bodyweightBaseKg: bwBase,
        seedFromKg: sibling?.lastWorkingWeightKg,
      })
      return {
        id: crypto.randomUUID(), variantId: e.variant.id, order: i,
        prescribed: { sets: p.sets, repRange: [p.repRange.min, p.repRange.max],
                      targetKg: p.targetKg, targetRir: p.targetRir },
        sets: [],
      }
    })
    await startWorkout(entries)
  }

  const freshness = Object.entries(app.fatigue.freshness)
    .filter(([m]) => (app.profile.weeklyTargets ?? DEFAULT_WEEKLY_TARGETS)[m as MuscleId])
    .sort((a, b) => (a[1] ?? 1) - (b[1] ?? 1))
    .slice(0, 6) as [MuscleId, number][]

  return (
    <>
      <h1>Today</h1>
      {!gym && <p class="muted">No gym set up yet — check Settings.</p>}

      {plan && plan.exercises.length === 0 && (
        <div class="card">
          <strong>Nothing to prescribe</strong>
          <p class="muted" style="margin:6px 0 0">
            Either everything is still recovering, or the equipment you have cannot reach
            what you are owed this week. Try a longer session, or add equipment in Settings.
          </p>
        </div>
      )}

      {plan && plan.exercises.map((e) => {
        const entry = app.progression.get(e.variant.id)
        return (
          <div class="card" key={e.variant.id}>
            <div class="spread">
              <strong>{e.variant.displayName}</strong>
              <span class="pill">{e.sets} sets</span>
            </div>
            <p class="tiny" style="margin:6px 0 0">{e.rationale}</p>
            {entry && (
              <p class="tiny" style="margin:2px 0 0">
                Last time {fmtWeight(entry.lastWorkingWeightKg, app.profile.displayUnit)}
                {' '}× {entry.lastTopSetReps}
              </p>
            )}
          </div>
        )
      })}

      {plan && plan.exercises.length > 0 && (
        <div class="row" style="margin-top:4px">
          <button class="ghost" onClick={() => setSeed(seed + 1)}>Regenerate</button>
          <button class="primary" style="flex:1" onClick={begin}>Start session</button>
        </div>
      )}

      {freshness.length > 0 && (
        <>
          <h2>Recovery</h2>
          {freshness.map(([m, f]) => (
            <div class="card tight" key={m}>
              <div class="spread" style="margin-bottom:6px">
                <span>{MUSCLES[m].name}</span>
                <span class="tiny">{Math.round((f ?? 1) * 100)}%</span>
              </div>
              <div class="bar">
                <span style={`width:${Math.round((f ?? 1) * 100)}%;background:${
                  (f ?? 1) > 0.75 ? 'var(--good)' : (f ?? 1) > 0.45 ? 'var(--warn)' : 'var(--bad)'
                }`} />
              </div>
            </div>
          ))}
        </>
      )}
    </>
  )
}

import { useEffect, useMemo, useState } from 'preact/hooks'
import type { PickedExercise } from '../../core/engine/generate'
import { generateWorkout, alternativesFor } from '../../core/engine/generate'
import { focusUnits, scaledTargets, DAY_NAMES, FOCUS_LABEL } from '../../core/engine/plan'
import { MUSCLES, type MuscleId } from '../../core/taxonomy/muscles'
import { equipmentById } from '../../core/equipment/catalog'
import { MOVEMENT_CATALOG } from '../../core/movements'
import { resolveVariant } from '../../core/variants'
import { useApp, currentGym, startWorkout, saveProfile, saveGym, VARIANTS, todayKey } from '../store'
import { prescriptionFor, entryFor } from '../prescription'
import { fmtWeight } from '../format'
import type { IndexedVariant } from '../../core/movements'

type Sheet =
  | { kind: 'reject'; pick: PickedExercise }
  | { kind: 'swap'; pick: PickedExercise; alts: IndexedVariant[] }
  | { kind: 'add' }
  | null

export function Today() {
  const app = useApp()
  const gym = currentGym()
  const today = todayKey()
  const dow = new Date().getDay()
  const dayPlan = app.profile.week[dow]
  const trainAnyway = app.profile.draft?.date === today && app.profile.draft.trainAnyway
  const isRestDay = !dayPlan && !trainAnyway
  const focus = dayPlan?.focus ?? 'auto'
  const minutes = dayPlan?.minutes ?? app.profile.sessionMinutes

  const skipped = useMemo(() => new Set(
    app.profile.skipped?.date === today ? app.profile.skipped.movementIds : []),
    [app.profile.skipped, today])

  const [picks, setPicks] = useState<PickedExercise[] | null>(null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [query, setQuery] = useState('')

  const generate = (locked: string[]) => {
    if (!gym) return []
    const weekAgo = Date.now() - 7 * 86_400_000
    const units = focusUnits(focus)
    return generateWorkout({
      at: new Date(), fatigue: app.fatigue,
      availableEquipment: new Set(gym.equipmentTypeIds),
      recentSets: app.sets.filter((s) => new Date(s.performedAt).getTime() >= weekAgo),
      variantIndex: VARIANTS,
      weeklyTargets: app.profile.weeklyTargets ?? scaledTargets(app.profile.volumePreset),
      excludedMovementIds: new Set([...app.profile.excludedMovementIds, ...skipped]),
      restrictedMuscles: new Set(app.profile.restrictedMuscles),
      minutesAvailable: minutes,
      familiarVariantIds: new Set(app.progression.keys()),
      ...(units ? { focusUnits: units } : {}),
      lockedVariantIds: locked,
    }).exercises
  }

  // First render: restore today's reviewed draft if there is one, else propose.
  useEffect(() => {
    if (!gym || isRestDay) { setPicks([]); return }
    const draft = app.profile.draft
    if (draft?.date === today && draft.variantIds.length) {
      // Locked picks come back in order; the generator fills around them.
      setPicks(generate(draft.variantIds))
    } else {
      setPicks(generate([]))
    }
  }, [gym?.equipmentTypeIds.join(), isRestDay, focus, minutes])

  const commit = async (next: PickedExercise[]) => {
    setPicks(next)
    await saveProfile({ draft: { date: today, variantIds: next.map((p) => p.variant.id),
                                 trainAnyway: trainAnyway || undefined } })
  }

  const remaining = (pick: PickedExercise) =>
    (picks ?? []).filter((p) => p.variant.id !== pick.variant.id).map((p) => p.variant.id)

  const rejectSkip = async (pick: PickedExercise) => {
    await saveProfile({ skipped: { date: today, movementIds: [...skipped, pick.movement.id] } })
    setSheet(null)
    // skipped is read from the profile on next render; regenerate with the new set
    const keep = remaining(pick)
    const next = generateWorkoutWith(keep, new Set([...skipped, pick.movement.id]))
    await commit(next)
  }
  const rejectNever = async (pick: PickedExercise) => {
    const excluded = [...app.profile.excludedMovementIds, pick.movement.id]
    await saveProfile({ excludedMovementIds: excluded })
    setSheet(null)
    await commit(generateWorkoutWith(remaining(pick), skipped, new Set(excluded)))
  }
  const rejectRemove = async (pick: PickedExercise) => {
    setSheet(null)
    await commit((picks ?? []).filter((p) => p.variant.id !== pick.variant.id))
  }
  const rejectEquipment = async (pick: PickedExercise, equipmentId: string) => {
    if (!gym) return
    const ids = gym.equipmentTypeIds.filter((e) => e !== equipmentId)
    await saveGym({ ...gym, equipmentTypeIds: ids })
    setSheet(null)
    await commit(generateWorkoutWith(remaining(pick), skipped, undefined, new Set(ids)))
  }

  /** Same as generate() but with overrides that have not landed in state yet. */
  const generateWorkoutWith = (
    locked: string[], skip: Set<string>, excluded?: Set<string>, equipment?: Set<string>,
  ) => {
    if (!gym) return []
    const weekAgo = Date.now() - 7 * 86_400_000
    const units = focusUnits(focus)
    return generateWorkout({
      at: new Date(), fatigue: app.fatigue,
      availableEquipment: equipment ?? new Set(gym.equipmentTypeIds),
      recentSets: app.sets.filter((s) => new Date(s.performedAt).getTime() >= weekAgo),
      variantIndex: VARIANTS,
      weeklyTargets: app.profile.weeklyTargets ?? scaledTargets(app.profile.volumePreset),
      excludedMovementIds: new Set([...(excluded ?? app.profile.excludedMovementIds), ...skip]),
      restrictedMuscles: new Set(app.profile.restrictedMuscles),
      minutesAvailable: minutes,
      familiarVariantIds: new Set(app.progression.keys()),
      ...(units ? { focusUnits: units } : {}),
      lockedVariantIds: locked,
    }).exercises
  }

  const openSwap = (pick: PickedExercise) => {
    if (!gym) return
    const alts = alternativesFor(pick.variant.id, {
      availableEquipment: new Set(gym.equipmentTypeIds),
      excludedMovementIds: new Set([...app.profile.excludedMovementIds, ...skipped]),
      excludeMovementIds: new Set((picks ?? []).map((p) => p.movement.id)),
      variantIndex: VARIANTS, limit: 6,
    })
    setSheet({ kind: 'swap', pick, alts })
  }
  const doSwap = async (pick: PickedExercise, alt: IndexedVariant) => {
    setSheet(null)
    const replacement: PickedExercise = {
      variant: alt.variant, movement: alt.movement, sets: pick.sets, targets: pick.targets,
      score: pick.score, rationale: `Swapped in for ${pick.variant.displayName}.`,
    }
    await commit((picks ?? []).map((p) => (p.variant.id === pick.variant.id ? replacement : p)))
  }
  const doAdd = async (entry: IndexedVariant) => {
    setSheet(null); setQuery('')
    const added: PickedExercise = {
      variant: entry.variant, movement: entry.movement, sets: 3, targets: [], score: 0,
      rationale: 'Added by you.',
    }
    await commit([...(picks ?? []), added])
  }

  const begin = async () => {
    if (!picks?.length) return
    const entries = picks.map((p, i) => entryFor(p, i, prescriptionFor(p, app.profile, app.progression)))
    await saveProfile({ draft: undefined, skipped: undefined })
    await startWorkout(entries)
  }

  const searchable = useMemo(() => {
    const q = query.trim().toLowerCase()
    const have = new Set(gym?.equipmentTypeIds ?? [])
    const inSession = new Set((picks ?? []).map((p) => p.movement.id))
    return MOVEMENT_CATALOG
      .filter((m) => !inSession.has(m.id))
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .map((m) => ({ movement: m, variant: resolveVariant(m, {}),
                     available: m.equipmentTypeIds.every((e) => have.has(e)) }))
      .sort((a, b) => Number(b.available) - Number(a.available))
      .slice(0, 30)
  }, [query, gym, picks])

  const freshness = Object.entries(app.fatigue.freshness)
    .filter(([m]) => (scaledTargets(app.profile.volumePreset))[m as MuscleId])
    .sort((a, b) => (a[1] ?? 1) - (b[1] ?? 1)).slice(0, 5) as [MuscleId, number][]

  return (
    <>
      <div class="spread">
        <h1 style="margin:0">{DAY_NAMES[dow]}</h1>
        <span class="pill">{isRestDay ? 'Rest day' : `${FOCUS_LABEL[focus]} · ${minutes} min`}</span>
      </div>
      <p class="tiny" style="margin:4px 0 14px">
        {isRestDay ? 'Nothing planned today.' : 'Review what Beau proposes. Swap or reject anything — it refills around what you keep.'}
      </p>

      {isRestDay && (
        <div class="card">
          <strong>Rest day</strong>
          <p class="muted" style="margin:6px 0 10px">Recovery is training too. Change the week in Plan, or train anyway.</p>
          <button class="wide" onClick={() => void saveProfile({
            draft: { date: today, variantIds: [], trainAnyway: true } })}>Train anyway</button>
        </div>
      )}

      {!isRestDay && picks?.length === 0 && (
        <div class="card">
          <strong>Nothing to propose</strong>
          <p class="muted" style="margin:6px 0 0">Everything is still recovering, or your equipment cannot reach what is owed. Add an exercise below, or widen the plan.</p>
        </div>
      )}

      {picks?.map((pick) => {
        const p = prescriptionFor(pick, app.profile, app.progression)
        return (
          <div class="card" key={pick.variant.id}>
            <div class="spread">
              <strong>{pick.variant.displayName}</strong>
              <div class="row" style="gap:6px">
                <button class="ghost" style="min-height:34px;padding:4px 10px" onClick={() => openSwap(pick)}>Swap</button>
                <button class="ghost" style="min-height:34px;padding:4px 10px;color:var(--bad)" onClick={() => setSheet({ kind: 'reject', pick })}>✕</button>
              </div>
            </div>
            <p style="margin:6px 0 2px">
              {p.sets}×{p.repRange.min}–{p.repRange.max} @ {p.firstTime ? 'your call' : p.targetKg ? fmtWeight(p.targetKg, app.profile.displayUnit) : 'bodyweight'} · RIR {p.targetRir}
            </p>
            <p class="tiny" style="margin:0">{pick.rationale}</p>
            <p class="tiny" style="margin:2px 0 0;opacity:.8">{p.rationale}</p>
          </div>
        )
      })}

      {!isRestDay && picks !== null && (
        <>
          <div class="row" style="margin-top:4px">
            <button class="ghost" onClick={() => setSheet({ kind: 'add' })}>+ Add</button>
            <button class="ghost" onClick={() => void commit(generate([]))}>Regenerate</button>
            <button class="primary" style="flex:1" disabled={!picks.length} onClick={begin}>
              Start · {picks.length} exercise{picks.length === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}

      {freshness.length > 0 && (
        <>
          <h2>Recovery</h2>
          {freshness.map(([m, f]) => (
            <div class="card tight" key={m}>
              <div class="spread" style="margin-bottom:6px"><span>{MUSCLES[m].name}</span><span class="tiny">{Math.round((f ?? 1) * 100)}%</span></div>
              <div class="bar"><span style={`width:${Math.round((f ?? 1) * 100)}%;background:${(f ?? 1) > 0.75 ? 'var(--good)' : (f ?? 1) > 0.45 ? 'var(--warn)' : 'var(--bad)'}`} /></div>
            </div>
          ))}
        </>
      )}

      {sheet?.kind === 'reject' && (
        <div class="sheet" onClick={(e) => { if (e.target === e.currentTarget) setSheet(null) }}>
          <div>
            <strong>{sheet.pick.variant.displayName}</strong>
            <p class="tiny" style="margin:4px 0 12px">Why not? Beau learns from the reason.</p>
            <div class="stack">
              <div class="card tight" style="margin:0">
                <div class="tiny" style="margin-bottom:6px">Don't have the equipment</div>
                <div class="row wrap">
                  {sheet.pick.movement.equipmentTypeIds.map((e) => (
                    <button key={e} class="pill" style="min-height:36px" onClick={() => void rejectEquipment(sheet.pick, e)}>
                      No {equipmentById(e)?.name.toLowerCase()}
                    </button>
                  ))}
                </div>
                <div class="tiny" style="margin-top:6px;opacity:.7">Removes it from your gym and refills.</div>
              </div>
              <button onClick={() => void rejectSkip(sheet.pick)}>Not today — find something else</button>
              <button onClick={() => void rejectRemove(sheet.pick)}>Just remove it — shorter session</button>
              <button class="danger" onClick={() => void rejectNever(sheet.pick)}>Never show this exercise</button>
            </div>
          </div>
        </div>
      )}

      {sheet?.kind === 'swap' && (
        <div class="sheet" onClick={(e) => { if (e.target === e.currentTarget) setSheet(null) }}>
          <div>
            <strong>Swap {sheet.pick.variant.displayName}</strong>
            <p class="tiny" style="margin:4px 0 12px">Closest matches for the same muscles, with what you have.</p>
            {sheet.alts.length === 0 && <p class="muted">Nothing similar with your equipment.</p>}
            <div class="stack">
              {sheet.alts.map((a) => (
                <button key={a.variant.id} style="text-align:left" onClick={() => void doSwap(sheet.pick, a)}>
                  <div>{a.variant.displayName}</div>
                  <div class="tiny">{a.movement.notes ?? a.movement.equipmentTypeIds.map((e) => equipmentById(e)?.name).join(', ')}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {sheet?.kind === 'add' && (
        <div class="sheet" onClick={(e) => { if (e.target === e.currentTarget) setSheet(null) }}>
          <div>
            <input placeholder="Search exercises" value={query} autoFocus
                   onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
            <div class="stack" style="margin-top:10px">
              {searchable.map(({ movement, variant, available }) => (
                <button key={movement.id} style={`text-align:left;${available ? '' : 'opacity:.45'}`}
                        disabled={!available} onClick={() => void doAdd({ movement, variant })}>
                  <div>{movement.name}</div>
                  <div class="tiny">{available ? movement.equipmentTypeIds.map((e) => equipmentById(e)?.name).join(', ') : 'Needs equipment you have not selected'}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

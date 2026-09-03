import { useState } from 'preact/hooks'
import type { SetLog, Workout } from '../../core/types'
import type { MuscleId } from '../../core/taxonomy/muscles'
import { useApp, updateActive, finishWorkout, abandonWorkout, VARIANTS } from '../store'
import { fmtWeight, toDisplay, fromDisplay } from '../format'
import { RestTimer } from '../components/RestTimer'
import { Group, ActionSheet } from '../ui'

export function Session() {
  const app = useApp()
  const workout = app.active!
  const unit = app.profile.displayUnit
  const [resting, setResting] = useState<MuscleId[] | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [draft, setDraft] = useState<Record<string, { w: string; r: string; rir: string }>>({})

  const patch = async (next: Workout) => { await updateActive(next) }

  const keyFor = (entryId: string, index: number) => `${entryId}:${index}`

  const logSet = async (entryId: string, index: number) => {
    const entry = workout.entries.find((e) => e.id === entryId)!
    const d = draft[keyFor(entryId, index)]
    const reps = parseInt(d?.r ?? '', 10)
    if (!reps || reps <= 0) return
    const weightDisplay = parseFloat(d?.w ?? '')
    const rir = d?.rir === '' || d?.rir === undefined ? undefined : parseInt(d.rir, 10)

    const set: SetLog = {
      id: crypto.randomUUID(),
      variantId: entry.variantId,
      performedAt: new Date().toISOString(),
      setIndex: index,
      kind: 'working',
      weightKg: Number.isFinite(weightDisplay) ? fromDisplay(weightDisplay, unit) : null,
      reps,
      ...(rir !== undefined && Number.isFinite(rir) ? { rir } : {}),
    }
    const entries = workout.entries.map((e) =>
      e.id === entryId ? { ...e, sets: [...e.sets, set] } : e)
    await patch({ ...workout, entries })

    const units = Object.entries(VARIANTS.get(entry.variantId)?.variant.contributions ?? {})
      .filter(([, v]) => (v ?? 0) >= 0.4).map(([m]) => m as MuscleId)
    setResting(units)
  }

  const undoSet = async (entryId: string) => {
    const entries = workout.entries.map((e) =>
      e.id === entryId ? { ...e, sets: e.sets.slice(0, -1) } : e)
    await patch({ ...workout, entries })
  }

  const removeEntry = async (entryId: string) => {
    await patch({ ...workout, entries: workout.entries.filter((e) => e.id !== entryId) })
  }

  const totalSets = workout.entries.reduce((n, e) => n + e.sets.length, 0)
  const planned = workout.entries.reduce((n, e) => n + (e.prescribed?.sets ?? 3), 0)

  return (
    <main class="bare">
      <div class="navbar"><div /><div class="title">Session</div><div class="trailing"><span class="secondary mono">{totalSets}/{planned} sets</span></div></div>
      <h1 class="large-title">Session</h1>
      <p class="subtitle">Every set is saved the moment you log it.</p>

      {workout.entries.map((entry) => {
        const indexed = VARIANTS.get(entry.variantId)
        const target = entry.prescribed
        const rows = Math.max(target?.sets ?? 3, entry.sets.length + 1)
        // A loaded movement with no weight is missing data, not zero load; the
        // engine would score it as nothing. Bodyweight movements are exempt.
        const needsWeight = !indexed?.movement.bodyweightFactor
        const sub = target ? `${target.sets}×${target.repRange[0]}–${target.repRange[1]} @ ${target.firstTime ? 'your call — first time' : target.targetKg ? fmtWeight(target.targetKg, unit) : 'bodyweight'} · RIR ${target.targetRir}` : ''
        return (
          <Group key={entry.id} header={indexed?.variant.displayName ?? entry.variantId} footer={sub}>
            {Array.from({ length: rows }, (_, i) => {
              const done = entry.sets[i]
              const k = keyFor(entry.id, i)
              const cold = target?.firstTime === true
              const d = draft[k] ?? { w: target?.targetKg && !cold ? String(Math.round(toDisplay(target.targetKg, unit) * 2) / 2) : '', r: '', rir: String(target?.targetRir ?? 2) }
              if (done) return (
                <div class="set-grid" key={i}>
                  <span class="n">{i + 1}</span>
                  <span class="done">{done.weightKg ? fmtWeight(done.weightKg, unit) : 'BW'}</span>
                  <span class="done">{done.reps} reps</span>
                  <span class="done">{done.rir === undefined ? '—' : `RIR ${done.rir}`}</span>
                  {i === entry.sets.length - 1 ? <button class="done" style="color:var(--blue)" onClick={() => void undoSet(entry.id)}>↺</button> : <span />}
                </div>
              )
              const isNext = i === entry.sets.length
              return (
                <div class="set-grid" key={i} style={isNext ? '' : 'opacity:.35'}>
                  <span class="n">{i + 1}</span>
                  <input type="number" inputMode="decimal" placeholder={target?.firstTime && isNext ? 'weight?' : unit} value={d.w} disabled={!isNext} onInput={(e) => setDraft({ ...draft, [k]: { ...d, w: (e.target as HTMLInputElement).value } })} />
                  <input type="number" inputMode="numeric" placeholder="reps" value={d.r} disabled={!isNext} onInput={(e) => setDraft({ ...draft, [k]: { ...d, r: (e.target as HTMLInputElement).value } })} />
                  <input type="number" inputMode="numeric" placeholder="RIR" value={d.rir} disabled={!isNext} onInput={(e) => setDraft({ ...draft, [k]: { ...d, rir: (e.target as HTMLInputElement).value } })} />
                  <button class="go" disabled={!isNext || !d.r || (needsWeight && !d.w)} onClick={() => void logSet(entry.id, i)}>✓</button>
                </div>
              )
            })}
            <button class="row button" style="min-height:40px;color:var(--secondary);font-size:14px" onClick={() => void removeEntry(entry.id)}>Skip this exercise</button>
          </Group>
        )
      })}

      <div class="spacer" />
      <button class="btn primary" onClick={() => void finishWorkout()}>Finish session</button>
      <div class="spacer" />
      <button class="btn destructive" onClick={() => setConfirmEnd(true)}>Discard session</button>
      <div class="spacer" />

      {resting && (
        <RestTimer seconds={app.profile.restSeconds} trainedUnits={resting}
                   study={app.profile.studyDuringRest}
                   onDone={() => setResting(null)} onDismiss={() => setResting(null)} />
      )}

      {confirmEnd && (
        <ActionSheet title="Discard this session? Every set logged in it is deleted." onCancel={() => setConfirmEnd(false)}
          actions={[{ label: 'Discard session', destructive: true, onPress: () => { setConfirmEnd(false); void abandonWorkout() } }]} />
      )}
    </main>
  )
}

import { useState } from 'preact/hooks'
import type { SetLog, Workout } from '../../core/types'
import type { MuscleId } from '../../core/taxonomy/muscles'
import { useApp, updateActive, finishWorkout, abandonWorkout, VARIANTS } from '../store'
import { fmtWeight, toDisplay, fromDisplay } from '../format'
import { RestTimer } from '../components/RestTimer'

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
    <main>
      <div class="spread">
        <h1 style="margin:0">Session</h1>
        <span class="pill">{totalSets}/{planned} sets</span>
      </div>

      {workout.entries.map((entry) => {
        const indexed = VARIANTS.get(entry.variantId)
        const target = entry.prescribed
        const rows = Math.max(target?.sets ?? 3, entry.sets.length + 1)

        return (
          <div class="card" key={entry.id}>
            <div class="spread">
              <strong>{indexed?.variant.displayName ?? entry.variantId}</strong>
              <button class="ghost tiny" style="min-height:32px;padding:4px 8px"
                      onClick={() => void removeEntry(entry.id)}>Skip</button>
            </div>
            {target && (
              <p class="tiny" style="margin:4px 0 10px">
                {target.sets}×{target.repRange[0]}–{target.repRange[1]} @{' '}
                {target.targetKg ? fmtWeight(target.targetKg, unit) : 'bodyweight'}
                {' '}· RIR {target.targetRir}
              </p>
            )}

            {Array.from({ length: rows }, (_, i) => {
              const done = entry.sets[i]
              const k = keyFor(entry.id, i)
              const d = draft[k] ?? {
                w: target?.targetKg
                  ? String(Math.round(toDisplay(target.targetKg, unit) * 2) / 2) : '',
                r: '', rir: String(target?.targetRir ?? 2),
              }
              if (done) {
                return (
                  <div class="set-row done" key={i}>
                    <span class="n">{i + 1}</span>
                    <span class="tiny center">
                      {done.weightKg ? fmtWeight(done.weightKg, unit) : 'BW'}
                    </span>
                    <span class="tiny center">{done.reps} reps</span>
                    <span class="tiny center">
                      {done.rir === undefined ? '—' : `RIR ${done.rir}`}
                    </span>
                    {i === entry.sets.length - 1
                      ? <button class="ghost" style="min-height:36px;padding:4px"
                                onClick={() => void undoSet(entry.id)}>↺</button>
                      : <span />}
                  </div>
                )
              }
              const isNext = i === entry.sets.length
              return (
                <div class="set-row" key={i} style={isNext ? '' : 'opacity:0.4'}>
                  <span class="n">{i + 1}</span>
                  <input type="number" inputMode="decimal" placeholder={unit} value={d.w}
                         disabled={!isNext}
                         onInput={(e) => setDraft({ ...draft,
                           [k]: { ...d, w: (e.target as HTMLInputElement).value } })} />
                  <input type="number" inputMode="numeric" placeholder="reps" value={d.r}
                         disabled={!isNext}
                         onInput={(e) => setDraft({ ...draft,
                           [k]: { ...d, r: (e.target as HTMLInputElement).value } })} />
                  <input type="number" inputMode="numeric" placeholder="RIR" value={d.rir}
                         disabled={!isNext}
                         onInput={(e) => setDraft({ ...draft,
                           [k]: { ...d, rir: (e.target as HTMLInputElement).value } })} />
                  <button class="primary" style="min-height:40px;padding:4px"
                          disabled={!isNext || !d.r}
                          onClick={() => void logSet(entry.id, i)}>✓</button>
                </div>
              )
            })}
          </div>
        )
      })}

      <div class="row" style="margin-top:12px">
        <button class="danger" onClick={() => setConfirmEnd(true)}>Discard</button>
        <button class="primary" style="flex:1" onClick={() => void finishWorkout()}>
          Finish session
        </button>
      </div>
      <p class="tiny" style="margin-top:10px">
        Every set is saved as you log it — closing the app will not lose anything.
      </p>

      {resting && (
        <RestTimer seconds={app.profile.restSeconds} trainedUnits={resting}
                   study={app.profile.studyDuringRest}
                   onDone={() => setResting(null)} onDismiss={() => setResting(null)} />
      )}

      {confirmEnd && (
        <div class="sheet" onClick={(e) => {
          if (e.target === e.currentTarget) setConfirmEnd(false)
        }}>
          <div>
            <strong>Discard this session?</strong>
            <p class="muted">Every set you logged in it will be deleted. This cannot be undone.</p>
            <div class="row" style="margin-top:12px">
              <button style="flex:1" onClick={() => setConfirmEnd(false)}>Keep going</button>
              <button class="danger" style="flex:1"
                      onClick={() => { setConfirmEnd(false); void abandonWorkout() }}>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

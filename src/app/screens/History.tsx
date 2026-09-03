import { useState } from 'preact/hooks'
import { useApp, VARIANTS } from '../store'
import { fmtDate, fmtWeight } from '../format'
import { estimate1rm } from '../../core/engine/progression'

export function History() {
  const app = useApp()
  const [open, setOpen] = useState<string | null>(null)
  const unit = app.profile.displayUnit

  if (app.workouts.length === 0) {
    return (
      <>
        <h1>History</h1>
        <p class="muted">Nothing logged yet. Finish a session and it will appear here.</p>
      </>
    )
  }

  const totalSets = app.workouts.reduce(
    (n, w) => n + w.entries.reduce((m, e) => m + e.sets.length, 0), 0)

  return (
    <>
      <h1>History</h1>
      <p class="muted">
        {app.workouts.length} session{app.workouts.length === 1 ? '' : 's'} ·{' '}
        {totalSets} set{totalSets === 1 ? '' : 's'} ·{' '}
        {app.progression.size} exercise{app.progression.size === 1 ? '' : 's'} tracked
      </p>

      {app.workouts.map((w) => {
        const sets = w.entries.reduce((n, e) => n + e.sets.length, 0)
        const minutes = w.endedAt
          ? Math.round((new Date(w.endedAt).getTime() - new Date(w.startedAt).getTime()) / 60000)
          : 0
        const isOpen = open === w.id
        return (
          <div class="card" key={w.id}>
            <div class="spread" onClick={() => setOpen(isOpen ? null : w.id)}
                 style="cursor:pointer">
              <div>
                <strong>{fmtDate(w.startedAt)}</strong>
                <div class="tiny">
                  {w.entries.length} exercises · {sets} sets{minutes ? ` · ${minutes} min` : ''}
                </div>
              </div>
              <span class="tiny">{isOpen ? '▲' : '▼'}</span>
            </div>

            {isOpen && (
              <div style="margin-top:10px">
                {w.entries.map((e) => {
                  const name = VARIANTS.get(e.variantId)?.variant.displayName ?? e.variantId
                  const best = e.sets
                    .map((s) => estimate1rm((s.weightKg ?? 0) + (s.addedWeightKg ?? 0),
                                            s.reps, s.rir))
                    .filter((x): x is number => x !== null)
                  return (
                    <div key={e.id} style="margin-bottom:10px">
                      <div class="spread">
                        <span>{name}</span>
                        {best.length > 0 && (
                          <span class="tiny">
                            e1RM {fmtWeight(Math.max(...best), unit)}
                          </span>
                        )}
                      </div>
                      <div class="tiny">
                        {e.sets.map((s) =>
                          `${s.weightKg ? fmtWeight(s.weightKg, unit) : 'BW'}×${s.reps}`
                        ).join('  ·  ')}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

import { useEffect, useState } from 'preact/hooks'
import type { PickedExercise } from '../../core/engine/generate'
import { DAY_NAMES, FOCUS_LABEL } from '../../core/engine/plan'
import { MUSCLES, type MuscleId } from '../../core/taxonomy/muscles'
import { equipmentById } from '../../core/equipment/catalog'
import { musclesForTrainableUnit } from '../../core/anatomy/graph'
import { Page, Group, Row, ButtonRow, Bar, ActionSheet } from '../ui'
import { push } from '../nav'
import { useToday, ensureProposal, todayActions } from '../today'
import { prescriptionFor } from '../prescription'
import { fmtWeight } from '../format'
import { currentGym } from '../store'
import { PlanPage } from './Plan'
import { MuscleDetailPage } from './Learn'

const Caret = () => (
  <svg class="caret" viewBox="0 0 13 8" fill="none">
    <path d="M1 1l5.5 5.5L12 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
)

export function Today() {
  const t = useToday()
  const { app, picks, isRestDay, focus, minutes, dow } = t
  const gym = currentGym()
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => { ensureProposal(app, isRestDay) },
    [gym?.equipmentTypeIds.join(), isRestDay, focus, minutes, app.profile.week, app.profile.volumePreset])

  return (
    <Page title="Today" subtitle={DAY_NAMES[dow]}>
      <Group footer={isRestDay ? undefined : 'Tap an exercise to see why it is here and swap or reject it. Every rejection teaches Beau.'}>
        <Row label={isRestDay ? 'Rest day' : `${FOCUS_LABEL[focus]} · ${minutes} min`} sub="From your training plan"
             onPress={() => push({ key: 'plan', title: 'Training plan', render: () => <PlanPage /> })} />
      </Group>

      {isRestDay && (
        <Group footer="Recovery is training too. Beau uses rest days to let the muscles it has loaded come back.">
          <ButtonRow label="Train anyway" onPress={() => void todayActions.trainAnyway(app)} />
        </Group>
      )}

      {!isRestDay && picks !== null && picks.length === 0 && (
        <Group footer="Everything is still recovering, or your equipment cannot reach what is owed this week. Add an exercise, or widen the plan.">
          <Row label="Nothing to propose" />
        </Group>
      )}

      {!isRestDay && picks && picks.length > 0 && (
        <>
          <div class="group-header">Proposed session</div>
          {picks.map((pick) => (
            <ExerciseCard key={pick.variant.id} pick={pick}
                          open={open === pick.variant.id}
                          onToggle={() => setOpen(open === pick.variant.id ? null : pick.variant.id)} />
          ))}
        </>
      )}

      {!isRestDay && picks !== null && (
        <>
          <Group>
            <ButtonRow label="Add an exercise" onPress={() => push({ key: 'add', title: 'Add exercise', render: () => <AddExercisePage /> })} />
            <ButtonRow label="Propose a different session" onPress={() => void todayActions.regenerate(app)} />
          </Group>
          <div class="spacer" />
          <button class="btn primary" disabled={!picks.length} onClick={() => void todayActions.begin(app)}>
            Start session{picks.length ? ` · ${picks.length} exercise${picks.length === 1 ? '' : 's'}` : ''}
          </button>
          <div class="spacer" />
        </>
      )}
    </Page>
  )
}

/** One exercise, expanding in place. Everything that used to need two pushed
 *  pages — the detail, the alternatives — happens here without leaving Today. */
function ExerciseCard({ pick, open, onToggle }: { pick: PickedExercise; open: boolean; onToggle: () => void }) {
  const { app } = useToday()
  const [pane, setPane] = useState<'detail' | 'swap'>('detail')
  const [sheet, setSheet] = useState<'reject' | 'equipment' | null>(null)

  const p = prescriptionFor(pick, app.profile, app.progression)
  const weight = p.firstTime ? 'Your call' : p.targetKg ? fmtWeight(p.targetKg, app.profile.displayUnit) : 'Bodyweight'
  const muscles = (Object.entries(pick.variant.contributions) as [MuscleId, number][])
    .filter(([, v]) => v >= 0.3).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Collapsing resets the pane, so reopening never lands mid-swap.
  const toggle = () => { if (open) setPane('detail'); onToggle() }
  const alts = pane === 'swap' ? todayActions.alternatives(app, pick) : []

  return (
    <div class={`xcard${open ? ' open' : ''}`}>
      <button class="xcard-head" onClick={toggle} aria-expanded={open}>
        <div>
          <div class="name">{pick.variant.displayName}</div>
          <div class="meta">{p.sets} × {p.repRange.min}–{p.repRange.max} · {weight}</div>
        </div>
        <Caret />
      </button>

      <div class="xcard-body">
        <div class="inner">
          <div class="pane">
            {pane === 'detail' ? (
              <>
                <div class="stat-row">
                  <div class="stat"><div class="k">Sets</div><div class="v">{p.sets}</div></div>
                  <div class="stat"><div class="k">Reps</div><div class="v">{p.repRange.min}–{p.repRange.max}</div></div>
                  <div class="stat"><div class="k">Weight</div><div class="v">{weight}</div></div>
                  <div class="stat"><div class="k">Effort</div><div class="v">RIR {p.targetRir}</div></div>
                </div>
                <p class="why">{pick.rationale}</p>
                <p class="why" style="margin-top:-6px">{p.rationale}</p>

                <div class="pane-title"><span class="t">Muscles worked</span></div>
                {muscles.map(([m, v]) => (
                  <button class="muscle" key={m} onClick={() => {
                    const anat = musclesForTrainableUnit(m)[0]
                    if (anat) push({ key: `muscle:${anat.id}`, title: anat.name, render: () => <MuscleDetailPage id={anat.id} /> })
                  }}>
                    <div>
                      <div class="mname">{MUSCLES[m].name}</div>
                      <div class="mbar"><Bar value={v} color="var(--blue)" /></div>
                    </div>
                    <span class="mval">{Math.round(v * 100)}%</span>
                    <svg class="chevron" viewBox="0 0 8 13" fill="none"><path d="M1 1l5.5 5.5L1 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
                  </button>
                ))}

                <div class="pane-title" style="margin-top:12px"><span class="t">Equipment</span>
                  <span class="mval">{pick.movement.equipmentTypeIds.map((e) => equipmentById(e)?.name).join(' · ')}</span></div>

                <div class="actions">
                  <button onClick={() => setPane('swap')}>Swap</button>
                  <button class="warn" onClick={() => setSheet('reject')}>Not this one</button>
                </div>
              </>
            ) : (
              <>
                <div class="pane-title">
                  <span class="t">Closest matches</span>
                  <button onClick={() => setPane('detail')}>Back</button>
                </div>
                {alts.length === 0 && <p class="why">Nothing similar with your equipment.</p>}
                {alts.map((a) => (
                  <button class="alt" key={a.variant.id} onClick={() => { setPane('detail'); void todayActions.swap(app, pick, a) }}>
                    <div>
                      <div class="an">{a.variant.displayName}</div>
                      <div class="ae">{a.movement.equipmentTypeIds.map((e) => equipmentById(e)?.name).join(', ')}</div>
                    </div>
                    <span class="pick">Use</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {sheet === 'reject' && (
        <ActionSheet title="Beau learns from the reason." onCancel={() => setSheet(null)} actions={[
          { label: 'I don’t have the equipment', onPress: () => setSheet('equipment') },
          { label: 'Not today — find something else', onPress: () => { setSheet(null); void todayActions.skip(app, pick) } },
          { label: 'Just remove it — shorter session', onPress: () => { setSheet(null); void todayActions.remove(app, pick) } },
          { label: 'Never show this exercise', destructive: true, onPress: () => { setSheet(null); void todayActions.never(app, pick) } },
        ]} />
      )}
      {sheet === 'equipment' && (
        <ActionSheet title="Which one is missing? It comes off your gym list." onCancel={() => setSheet(null)}
          actions={pick.movement.equipmentTypeIds.map((e) => ({ label: `No ${equipmentById(e)?.name.toLowerCase()}`,
            onPress: () => { setSheet(null); void todayActions.missingEquipment(app, pick, e) } }))} />
      )}
    </div>
  )
}

function AddExercisePage() {
  const { app } = useToday()
  const [q, setQ] = useState('')
  const results = todayActions.searchable(q)
  return (
    <Page title="Add exercise">
      <Group>
        <div class="row"><input class="input" style="width:100%;text-align:left" type="text" placeholder="Search the catalog" value={q} autoFocus onInput={(e) => setQ((e.target as HTMLInputElement).value)} /></div>
      </Group>
      <Group footer="Greyed out means it needs equipment you have not selected.">
        {results.map(({ movement, variant, available }) => (
          <div key={movement.id} style={available ? '' : 'opacity:.4'}>
            <Row label={movement.name} sub={movement.equipmentTypeIds.map((e) => equipmentById(e)?.name).join(', ')}
                 onPress={available ? async () => { await todayActions.add(app, { movement, variant }); history.back() } : undefined} chevron={false} />
          </div>
        ))}
      </Group>
    </Page>
  )
}

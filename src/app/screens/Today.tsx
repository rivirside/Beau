import { useEffect, useState } from 'preact/hooks'
import { DAY_NAMES, FOCUS_LABEL } from '../../core/engine/plan'
import { equipmentById } from '../../core/equipment/catalog'
import { Page, Group, Row, ButtonRow } from '../ui'
import { push } from '../nav'
import { useToday, ensureProposal, todayActions } from '../today'
import { prescriptionFor } from '../prescription'
import { fmtWeight } from '../format'
import { currentGym } from '../store'
import { ExerciseDetailPage } from './ExerciseDetail'
import { PlanPage } from './Plan'

export function Today() {
  const t = useToday()
  const { app, picks, isRestDay, focus, minutes, dow } = t
  const gym = currentGym()

  useEffect(() => { ensureProposal(app, isRestDay) },
    [gym?.equipmentTypeIds.join(), isRestDay, focus, minutes, app.profile.week, app.profile.volumePreset])

  const header = isRestDay ? 'Rest day' : `${FOCUS_LABEL[focus]} · ${minutes} min`

  return (
    <Page title="Today" subtitle={DAY_NAMES[dow]}>
      <Group footer={isRestDay ? undefined : 'A proposal, not an order. Tap an exercise to see why it is here, swap it, or reject it — every reason teaches Beau.'}>
        <Row label={header} sub="From your training plan" onPress={() => push({ key: 'plan', title: 'Training plan', render: () => <PlanPage /> })} />
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
        <Group header="Proposed session">
          {picks.map((pick) => {
            const p = prescriptionFor(pick, app.profile, app.progression)
            const weight = p.firstTime ? 'your weight' : p.targetKg ? fmtWeight(p.targetKg, app.profile.displayUnit) : 'bodyweight'
            return (
              <Row key={pick.variant.id} label={pick.variant.displayName}
                   sub={`${p.sets} × ${p.repRange.min}–${p.repRange.max} @ ${weight}`}
                   onPress={() => push({ key: `ex:${pick.variant.id}`, title: pick.variant.displayName,
                                         render: () => <ExerciseDetailPage variantId={pick.variant.id} /> })} />
            )
          })}
        </Group>
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
        </>
      )}
    </Page>
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

import { useState } from 'preact/hooks'
import type { PickedExercise } from '../../core/engine/generate'
import { MUSCLES, type MuscleId } from '../../core/taxonomy/muscles'
import { equipmentById } from '../../core/equipment/catalog'
import { Page, Group, Row, ButtonRow, Custom, Bar, ActionSheet } from '../ui'
import { pop, push } from '../nav'
import { useToday, todayActions } from '../today'
import { prescriptionFor } from '../prescription'
import { fmtWeight } from '../format'
import { musclesForTrainableUnit } from '../../core/anatomy/graph'
import { MuscleDetailPage } from './Learn'

export function ExerciseDetailPage({ variantId }: { variantId: string }) {
  const { app, picks } = useToday()
  const [sheet, setSheet] = useState<'reject' | 'equipment' | null>(null)
  const pick = picks?.find((p) => p.variant.id === variantId)
  if (!pick) return <Page title="Exercise"><p class="p">This exercise is no longer in today's proposal.</p></Page>

  const p = prescriptionFor(pick, app.profile, app.progression)
  const muscles = (Object.entries(pick.variant.contributions) as [MuscleId, number][])
    .filter(([, v]) => v >= 0.3).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const done = async (fn: Promise<void>) => { await fn; pop() }

  return (
    <Page title={pick.variant.displayName}>
      <Group header="Prescription" footer={p.rationale}>
        <Row label="Sets" value={String(p.sets)} accentValue />
        <Row label="Reps" value={`${p.repRange.min}–${p.repRange.max}`} accentValue />
        <Row label="Weight" value={p.firstTime ? 'Your call' : p.targetKg ? fmtWeight(p.targetKg, app.profile.displayUnit) : 'Bodyweight'} accentValue />
        <Row label="Effort" value={`${p.targetRir} in reserve`} accentValue />
      </Group>

      <Group header="Why this" footer={pick.movement.notes}>
        <Row label={pick.rationale} />
      </Group>

      <Group header="Muscles worked" footer="Tap a muscle to read about it. Filled bar means a prime mover.">
        {muscles.map(([m, v]) => (
          <button key={m} class="row pressable" onClick={() => {
            const anat = musclesForTrainableUnit(m)[0]
            if (anat) push({ key: `muscle:${anat.id}`, title: anat.name, render: () => <MuscleDetailPage id={anat.id} /> })
          }}>
            <div class="label"><span>{MUSCLES[m].name}</span><div style="margin-top:6px"><Bar value={v} color="var(--blue)" /></div></div>
            <span class="value">{Math.round(v * 100)}%</span>
            <svg class="chevron" viewBox="0 0 8 13" fill="none"><path d="M1 1l5.5 5.5L1 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
          </button>
        ))}
      </Group>

      <Group header="Equipment">
        {pick.movement.equipmentTypeIds.map((e) => <Row key={e} label={equipmentById(e)?.name ?? e} />)}
      </Group>

      <Group>
        <ButtonRow label="Swap for something similar" onPress={() => push({ key: `alts:${variantId}`, title: 'Alternatives', render: () => <AlternativesPage pick={pick} /> })} />
        <ButtonRow label="Not this one…" destructive onPress={() => setSheet('reject')} />
      </Group>
      <div class="spacer" />

      {sheet === 'reject' && (
        <ActionSheet title="Beau learns from the reason." onCancel={() => setSheet(null)} actions={[
          { label: 'I don’t have the equipment', onPress: () => setSheet('equipment') },
          { label: 'Not today — find something else', onPress: () => void done(todayActions.skip(app, pick)) },
          { label: 'Just remove it — shorter session', onPress: () => void done(todayActions.remove(app, pick)) },
          { label: 'Never show this exercise', destructive: true, onPress: () => void done(todayActions.never(app, pick)) },
        ]} />
      )}
      {sheet === 'equipment' && (
        <ActionSheet title="Which one is missing? It comes off your gym list." onCancel={() => setSheet(null)}
          actions={pick.movement.equipmentTypeIds.map((e) => ({ label: `No ${equipmentById(e)?.name.toLowerCase()}`,
            onPress: () => void done(todayActions.missingEquipment(app, pick, e)) }))} />
      )}
    </Page>
  )
}

function AlternativesPage({ pick }: { pick: PickedExercise }) {
  const { app } = useToday()
  const alts = todayActions.alternatives(app, pick)
  return (
    <Page title="Alternatives" subtitle="Closest matches for the same muscles, with what you have.">
      <Group footer={alts.length ? 'Ranked by how closely the muscle profile matches.' : 'Nothing similar with your equipment.'}>
        {alts.map((a) => (
          <Row key={a.variant.id} label={a.variant.displayName} sub={a.movement.equipmentTypeIds.map((e) => equipmentById(e)?.name).join(', ')}
               onPress={async () => { await todayActions.swap(app, pick, a); history.go(-2) }} chevron={false} />
        ))}
      </Group>
    </Page>
  )
}

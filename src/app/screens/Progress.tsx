import { MUSCLES, type MuscleId } from '../../core/taxonomy/muscles'
import { scaledTargets } from '../../core/engine/plan'
import { explainFreshness } from '../../core/engine/fatigue'
import { estimate1rm } from '../../core/engine/progression'
import { Page, Group, Row, Custom, Bar } from '../ui'
import { push } from '../nav'
import { useApp, VARIANTS, contributionsFor, bodyweightFactorFor } from '../store'
import { fmtDate, fmtWeight } from '../format'

const pct = (f?: number) => `${Math.round((f ?? 1) * 100)}%`

export function Progress() {
  const app = useApp()
  const unit = app.profile.displayUnit
  const targets = scaledTargets(app.profile.volumePreset)
  const weekAgo = Date.now() - 7 * 86_400_000
  const weekSets = app.sets.filter((s) => new Date(s.performedAt).getTime() >= weekAgo)

  const banked: Partial<Record<MuscleId, number>> = {}
  for (const s of weekSets) {
    for (const [m, v] of Object.entries(contributionsFor(s.variantId) ?? {}) as [MuscleId, number][]) {
      if (v >= 0.3) banked[m] = (banked[m] ?? 0) + Math.min(1, v)
    }
  }

  const tracked = (Object.keys(targets) as MuscleId[]).filter((m) => targets[m])
  const recovery = tracked.map((m) => [m, app.fatigue.freshness[m] ?? 1] as const).sort((a, b) => a[1] - b[1])
  const worked = recovery.filter(([, f]) => f < 0.999)
  const volume = tracked.map((m) => [m, banked[m] ?? 0, targets[m]!] as const).sort((a, b) => (a[1] / a[2]) - (b[1] / b[2]))
  const exercises = [...app.progression.values()].sort((a, b) => b.sessions - a.sessions)

  return (
    <Page title="Progress" subtitle="How your body and your lifts are doing.">
      <Group header="Recovery"
             footer="How recovered each muscle is, estimated from what you trained and how long ago. Beau avoids prescribing muscles that are still recovering; a fully recovered muscle is not listed.">
        {worked.length === 0 && <Row label="Everything is recovered" sub="Nothing trained recently enough to still be recovering." />}
        {worked.slice(0, 5).map(([m, f]) => <RecoveryRow key={m} m={m} f={f} />)}
        {worked.length > 0 && <Row label="All muscles" onPress={() => push({ key: 'recovery', title: 'Recovery', render: () => <RecoveryPage /> })} />}
      </Group>

      <Group header="This week" footer="Working sets banked against your weekly target, per muscle. Today's proposal is built from what is still owed.">
        {volume.slice(0, 5).map(([m, got, target]) => (
          <Custom key={m}>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>{MUSCLES[m].name}</span><span class="secondary mono">{Math.round(got)} / {target}</span></div>
            <Bar value={got / target} color="var(--blue)" />
          </Custom>
        ))}
        <Row label="All muscles" onPress={() => push({ key: 'volume', title: 'This week', render: () => <VolumePage /> })} />
      </Group>

      <Group header="Exercises" footer={exercises.length ? 'Estimated one-rep max from your best set, smoothed across sessions.' : 'Finish a session and your lifts appear here.'}>
        {exercises.slice(0, 6).map((s) => (
          <Row key={s.variantId} label={VARIANTS.get(s.variantId)?.variant.displayName ?? s.variantId}
               sub={`${s.sessions} session${s.sessions === 1 ? '' : 's'}${s.consecutiveStalls ? ` · ${s.consecutiveStalls} stall${s.consecutiveStalls === 1 ? '' : 's'}` : ''}`}
               value={s.estimated1rmKg ? `e1RM ${fmtWeight(s.estimated1rmKg, unit)}` : 'calibrating'}
               onPress={() => push({ key: `ex:${s.variantId}`, title: 'Exercise', render: () => <ExerciseHistoryPage variantId={s.variantId} /> })} />
        ))}
        {exercises.length > 6 && <Row label="All exercises" onPress={() => push({ key: 'exercises', title: 'Exercises', render: () => <AllExercisesPage /> })} />}
      </Group>

      <Group header="Sessions" footer={app.workouts.length ? undefined : 'Nothing logged yet.'}>
        {app.workouts.slice(0, 5).map((w) => {
          const sets = w.entries.reduce((n, e) => n + e.sets.length, 0)
          return <Row key={w.id} label={fmtDate(w.startedAt)} sub={`${w.entries.length} exercises · ${sets} sets`}
                      onPress={() => push({ key: `w:${w.id}`, title: fmtDate(w.startedAt), render: () => <SessionPage id={w.id} /> })} />
        })}
        {app.workouts.length > 5 && <Row label="All sessions" onPress={() => push({ key: 'sessions', title: 'Sessions', render: () => <AllSessionsPage /> })} />}
      </Group>
    </Page>
  )
}

function RecoveryRow({ m, f }: { m: MuscleId; f: number }) {
  const app = useApp()
  const why = explainFreshness(m, new Date(), app.fatigue, { sets: app.sets, contributionsFor, bodyweightKg: app.profile.bodyweightKg, bodyweightFactorFor })
  return (
    <Custom>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>{MUSCLES[m].name}</span><span class="secondary mono">{pct(f)}</span></div>
      <Bar value={f} />
      <div class="tiny" style="margin-top:6px">{why.replace(/^[^—]+— /, '')}</div>
    </Custom>
  )
}

function RecoveryPage() {
  const app = useApp()
  const regions = [...new Set(Object.values(MUSCLES).map((m) => m.region))]
  return (
    <Page title="Recovery" subtitle="Every trainable muscle, by region.">
      {regions.map((r) => (
        <Group key={r} header={r}>
          {(Object.keys(MUSCLES) as MuscleId[]).filter((m) => MUSCLES[m].region === r).map((m) => (
            <Row key={m} label={MUSCLES[m].name} value={pct(app.fatigue.freshness[m])} accentValue />
          ))}
        </Group>
      ))}
    </Page>
  )
}

function VolumePage() {
  const app = useApp()
  const targets = scaledTargets(app.profile.volumePreset)
  const weekAgo = Date.now() - 7 * 86_400_000
  const banked: Partial<Record<MuscleId, number>> = {}
  for (const s of app.sets.filter((s) => new Date(s.performedAt).getTime() >= weekAgo)) {
    for (const [m, v] of Object.entries(contributionsFor(s.variantId) ?? {}) as [MuscleId, number][]) if (v >= 0.3) banked[m] = (banked[m] ?? 0) + Math.min(1, v)
  }
  const regions = [...new Set(Object.values(MUSCLES).map((m) => m.region))]
  return (
    <Page title="This week" subtitle="Sets banked against target. Zero-target muscles are opt-in.">
      {regions.map((r) => (
        <Group key={r} header={r}>
          {(Object.keys(MUSCLES) as MuscleId[]).filter((m) => MUSCLES[m].region === r).map((m) => (
            <Row key={m} label={MUSCLES[m].name} value={targets[m] ? `${Math.round(banked[m] ?? 0)} / ${targets[m]}` : 'off'} accentValue={!!targets[m]} />
          ))}
        </Group>
      ))}
    </Page>
  )
}

function ExerciseHistoryPage({ variantId }: { variantId: string }) {
  const app = useApp()
  const unit = app.profile.displayUnit
  const name = VARIANTS.get(variantId)?.variant.displayName ?? variantId
  const s = app.progression.get(variantId)
  const sessions = app.workouts.filter((w) => w.entries.some((e) => e.variantId === variantId))
  return (
    <Page title={name}>
      {s && (
        <Group header="Now">
          <Row label="Estimated 1RM" value={s.estimated1rmKg ? fmtWeight(s.estimated1rmKg, unit) : 'calibrating'} accentValue />
          <Row label="Last working weight" value={`${fmtWeight(s.lastWorkingWeightKg, unit)} × ${s.lastTopSetReps}`} accentValue />
          <Row label="Sessions" value={String(s.sessions)} accentValue />
          <Row label="Stalls in a row" value={String(s.consecutiveStalls)} accentValue />
        </Group>
      )}
      <Group header="History">
        {sessions.map((w) => {
          const e = w.entries.find((x) => x.variantId === variantId)!
          const best = Math.max(0, ...e.sets.map((x) => estimate1rm((x.weightKg ?? 0) + (x.addedWeightKg ?? 0), x.reps, x.rir) ?? 0))
          return <Row key={w.id} label={fmtDate(w.startedAt)} sub={e.sets.map((x) => `${x.weightKg ? fmtWeight(x.weightKg, unit) : 'BW'}×${x.reps}`).join('  ')} value={best ? fmtWeight(best, unit) : ''} />
        })}
      </Group>
    </Page>
  )
}

function AllExercisesPage() {
  const app = useApp()
  const unit = app.profile.displayUnit
  return (
    <Page title="Exercises">
      <Group>{[...app.progression.values()].sort((a, b) => b.sessions - a.sessions).map((s) => (
        <Row key={s.variantId} label={VARIANTS.get(s.variantId)?.variant.displayName ?? s.variantId} sub={`${s.sessions} sessions`}
             value={s.estimated1rmKg ? fmtWeight(s.estimated1rmKg, unit) : ''} onPress={() => push({ key: `ex:${s.variantId}`, title: 'Exercise', render: () => <ExerciseHistoryPage variantId={s.variantId} /> })} />
      ))}</Group>
    </Page>
  )
}

function AllSessionsPage() {
  const app = useApp()
  return (
    <Page title="Sessions">
      <Group>{app.workouts.map((w) => (
        <Row key={w.id} label={fmtDate(w.startedAt)} sub={`${w.entries.length} exercises · ${w.entries.reduce((n, e) => n + e.sets.length, 0)} sets`}
             onPress={() => push({ key: `w:${w.id}`, title: fmtDate(w.startedAt), render: () => <SessionPage id={w.id} /> })} />
      ))}</Group>
    </Page>
  )
}

function SessionPage({ id }: { id: string }) {
  const app = useApp()
  const unit = app.profile.displayUnit
  const w = app.workouts.find((x) => x.id === id)
  if (!w) return <Page title="Session"><p class="p">Not found.</p></Page>
  const minutes = w.endedAt ? Math.round((new Date(w.endedAt).getTime() - new Date(w.startedAt).getTime()) / 60000) : 0
  return (
    <Page title={fmtDate(w.startedAt)} subtitle={`${new Date(w.startedAt).toLocaleString()}${minutes ? ` · ${minutes} min` : ''}`}>
      {w.entries.map((e) => (
        <Group key={e.id} header={VARIANTS.get(e.variantId)?.variant.displayName ?? e.variantId}>
          {e.sets.map((s) => <Row key={s.id} label={`Set ${s.setIndex + 1}`} value={`${s.weightKg ? fmtWeight(s.weightKg, unit) : 'BW'} × ${s.reps}${s.rir !== undefined ? ` · RIR ${s.rir}` : ''}`} accentValue />)}
        </Group>
      ))}
    </Page>
  )
}

import { useState } from 'preact/hooks'
import { useApp, saveProfile } from '../store'
import { DAY_NAMES, FOCUSES, FOCUS_LABEL, SPLIT_TEMPLATES, VOLUME_SCALE, scaledTargets,
         type Focus, type VolumePreset, type WeekPlan } from '../../core/engine/plan'
import { Page, Group, Row, Custom, Segmented } from '../ui'

export function PlanPage() {
  const app = useApp()
  const week = app.profile.week
  const [editing, setEditing] = useState<number | null>(null)
  const days = Object.keys(week).map(Number).sort()
  const total = days.reduce((n, d) => n + (week[d]?.minutes ?? 0), 0)
  const setWeek = (w: WeekPlan) => void saveProfile({ week: w })
  const setDay = (d: number, patch: Partial<{ focus: Focus; minutes: number }>) => setWeek({ ...week, [d]: { ...week[d]!, ...patch } })
  const targets = scaledTargets(app.profile.volumePreset)

  return (
    <Page title="Training plan" subtitle={`${days.length} day${days.length === 1 ? '' : 's'} a week · ${total} min`}>
      <Group header="Week" footer="Tap a day to plan it or rest it. Tap a planned day again to change its focus and length.">
        <Custom>
          <div class="chips" style="justify-content:space-between">
            {DAY_NAMES.map((name, d) => (
              <button key={d} class={`chip${week[d] ? ' on' : ''}`} style="flex:1;justify-content:center;padding:6px 0"
                      onClick={() => {
                        if (!week[d]) { setWeek({ ...week, [d]: { focus: 'auto', minutes: app.profile.sessionMinutes } }); setEditing(d) }
                        else setEditing(editing === d ? null : d)
                      }}>{name}</button>
            ))}
          </div>
        </Custom>
        {editing !== null && week[editing] && (
          <>
            <Row label={`${DAY_NAMES[editing]} focus`} value={FOCUS_LABEL[week[editing]!.focus]} accentValue />
            <Custom><div class="chips">{FOCUSES.map((f) => <button key={f} class={`chip${week[editing]!.focus === f ? ' on' : ''}`} onClick={() => setDay(editing, { focus: f })}>{FOCUS_LABEL[f]}</button>)}</div></Custom>
            <Row label="Length" value={`${week[editing]!.minutes} min`} accentValue />
            <Custom><Segmented options={[30, 45, 60, 75, 90].map((m) => ({ id: String(m), label: String(m) }))} value={String(week[editing]!.minutes)} onChange={(v) => setDay(editing, { minutes: Number(v) })} /></Custom>
            <Row label="Make it a rest day" onPress={() => { const n = { ...week }; delete n[editing]; setWeek(n); setEditing(null) }} chevron={false}>
              <span class="value" style="color:var(--red)">Rest</span>
            </Row>
          </>
        )}
      </Group>

      <Group header="Quick splits" footer="Replaces the week above.">
        {SPLIT_TEMPLATES.map((t) => <Row key={t.id} label={t.name} value={`${t.days} days`} onPress={() => setWeek(t.week)} chevron={false} />)}
      </Group>

      <Group header="Weekly volume" footer={`×${VOLUME_SCALE[app.profile.volumePreset]} of baseline — e.g. mid chest ${targets.pec_mid}, quads ${targets.quads_vasti}, lats ${targets.lats} sets a week. Rehab-tail muscles stay off unless you turn them on.`}>
        <Custom><Segmented options={(['minimal', 'standard', 'high'] as VolumePreset[]).map((v) => ({ id: v, label: v[0]!.toUpperCase() + v.slice(1) }))}
                           value={app.profile.volumePreset} onChange={(v) => void saveProfile({ volumePreset: v })} /></Custom>
      </Group>
    </Page>
  )
}

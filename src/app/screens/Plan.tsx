import { useState } from 'preact/hooks'
import { useApp, saveProfile } from '../store'
import { DAY_NAMES, FOCUSES, FOCUS_LABEL, SPLIT_TEMPLATES, VOLUME_SCALE, scaledTargets,
         type Focus, type VolumePreset, type WeekPlan } from '../../core/engine/plan'

export function Plan() {
  const app = useApp()
  const week = app.profile.week
  const [editing, setEditing] = useState<number | null>(null)
  const days = Object.keys(week).map(Number).sort()
  const totalMin = days.reduce((n, d) => n + (week[d]?.minutes ?? 0), 0)

  const setWeek = (w: WeekPlan) => void saveProfile({ week: w })
  const toggleDay = (d: number) => {
    const next = { ...week }
    if (next[d]) { delete next[d]; if (editing === d) setEditing(null) }
    else { next[d] = { focus: 'auto', minutes: app.profile.sessionMinutes }; setEditing(d) }
    setWeek(next)
  }
  const setDay = (d: number, patch: Partial<{ focus: Focus; minutes: number }>) =>
    setWeek({ ...week, [d]: { ...week[d]!, ...patch } })

  const targets = scaledTargets(app.profile.volumePreset)

  return (
    <>
      <h1>Plan</h1>
      <p class="tiny" style="margin:4px 0 14px">
        {days.length} day{days.length === 1 ? '' : 's'} a week · {totalMin} min total. Today's proposal follows this.
      </p>

      <h2>Quick splits</h2>
      <div class="row wrap">
        {SPLIT_TEMPLATES.map((t) => (
          <button key={t.id} class="pill" style="min-height:36px" onClick={() => setWeek(t.week)}>{t.name}</button>
        ))}
      </div>

      <h2>Your week</h2>
      <div class="card">
        <div class="row" style="justify-content:space-between">
          {DAY_NAMES.map((name, d) => (
            <button key={d} class={week[d] ? 'pill on' : 'pill'} style="min-height:44px;flex:1;padding:4px 0"
                    onClick={() => (week[d] ? setEditing(editing === d ? null : d) : toggleDay(d))}>
              {name}
            </button>
          ))}
        </div>
        <div class="tiny" style="margin-top:8px">Tap a day to plan it. Tap a planned day to edit.</div>

        {editing !== null && week[editing] && (
          <div style="margin-top:14px">
            <div class="divider" style="margin:0 0 12px" />
            <div class="spread">
              <strong>{DAY_NAMES[editing]}</strong>
              <button class="ghost tiny" style="min-height:32px;padding:4px 8px;color:var(--bad)" onClick={() => toggleDay(editing)}>Make it a rest day</button>
            </div>
            <div class="field" style="margin-top:10px">
              <label>Focus</label>
              <div class="row wrap">
                {FOCUSES.map((f) => (
                  <button key={f} class={week[editing]?.focus === f ? 'pill on' : 'pill'} style="min-height:34px"
                          onClick={() => setDay(editing, { focus: f })}>{FOCUS_LABEL[f]}</button>
                ))}
              </div>
            </div>
            <div class="field">
              <label>Duration (minutes)</label>
              <div class="row">
                {[30, 45, 60, 75, 90].map((m) => (
                  <button key={m} class={week[editing]?.minutes === m ? 'pill on' : 'pill'} style="min-height:38px;flex:1"
                          onClick={() => setDay(editing, { minutes: m })}>{m}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <h2>Weekly volume</h2>
      <div class="card">
        <div class="row">
          {(['minimal', 'standard', 'high'] as VolumePreset[]).map((v) => (
            <button key={v} class={app.profile.volumePreset === v ? 'pill on' : 'pill'} style="flex:1;min-height:42px"
                    onClick={() => void saveProfile({ volumePreset: v })}>
              {v[0]!.toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <p class="tiny" style="margin:10px 0 0">
          ×{VOLUME_SCALE[app.profile.volumePreset]} of the baseline — e.g. mid chest {targets.pec_mid} sets, quads {targets.quads_vasti}, lats {targets.lats} per week. Rehab-tail muscles stay off unless you turn them on.
        </p>
      </div>
    </>
  )
}

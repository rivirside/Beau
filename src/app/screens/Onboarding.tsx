import { useMemo, useState } from 'preact/hooks'
import { EQUIPMENT_TYPES } from '../../core/equipment/catalog'
import { SPLIT_TEMPLATES, DAY_NAMES, FOCUS_LABEL, type WeekPlan } from '../../core/engine/plan'
import { resolveVariant } from '../../core/variants'
import { movementById } from '../../core/movements'
import { saveGym, saveProfile, seedProgression } from '../store'
import { fromDisplay } from '../format'
import { Group, Row, Segmented, ButtonRow, Custom } from '../ui'

const PRESETS = [
  { id: 'full', name: 'Commercial gym', detail: 'Barbells, dumbbells, cables, machines', equipment: EQUIPMENT_TYPES.map((e) => e.id) },
  { id: 'home', name: 'Home gym', detail: 'Dumbbells, a bench, a bar, bands',
    equipment: ['dumbbell', 'adjustable_bench', 'flat_bench', 'barbell', 'squat_rack', 'ez_bar', 'band', 'pull_up_bar', 'bodyweight', 'plate', 'kettlebell', 'box'] },
  { id: 'minimal', name: 'Bodyweight only', detail: 'A bar to hang from, and the floor',
    equipment: ['bodyweight', 'pull_up_bar', 'dip_station', 'band', 'box', 'ab_wheel'] },
]

/** Anchor lifts, first available per pattern. A known working weight on these
 *  seeds progression so the first session is not a cold start where it matters. */
const ANCHORS: { label: string; candidates: string[] }[] = [
  { label: 'Squat', candidates: ['back_squat', 'hack_squat', 'leg_press', 'bulgarian_split_squat'] },
  { label: 'Horizontal press', candidates: ['barbell_bench_press', 'db_bench_press', 'machine_chest_press', 'push_up'] },
  { label: 'Hinge', candidates: ['deadlift', 'romanian_deadlift', 'hip_thrust'] },
  { label: 'Row', candidates: ['barbell_row', 'seated_cable_row', 'single_arm_db_row', 'inverted_row'] },
  { label: 'Overhead press', candidates: ['overhead_press', 'db_shoulder_press', 'machine_shoulder_press'] },
]

type Exp = 'new' | 'intermediate' | 'advanced'
const STEPS = ['Welcome', 'You', 'Your week', 'Your gym', 'Your lifts'] as const

export function Onboarding() {
  const [step, setStep] = useState(0)
  const [unit, setUnit] = useState<'kg' | 'lb'>('lb')
  const [bodyweight, setBodyweight] = useState('175')
  const [experience, setExperience] = useState<Exp>('intermediate')
  const [split, setSplit] = useState(SPLIT_TEMPLATES[1]!.id)
  const [preset, setPreset] = useState('full')
  const [custom, setCustom] = useState<Set<string>>(new Set(PRESETS[0]!.equipment))
  const [lifts, setLifts] = useState<Record<string, { w: string; r: string }>>({})

  const equipment = useMemo(() => preset === 'custom' ? [...custom] : PRESETS.find((p) => p.id === preset)!.equipment, [preset, custom])
  const anchors = useMemo(() => {
    const have = new Set(equipment)
    return ANCHORS.map((a) => {
      const id = a.candidates.find((c) => movementById(c)?.equipmentTypeIds.every((e) => have.has(e)))
      return id ? { label: a.label, movement: movementById(id)! } : null
    }).filter((x): x is NonNullable<typeof x> => x !== null)
  }, [equipment])

  const finish = async () => {
    const week: WeekPlan = SPLIT_TEMPLATES.find((t) => t.id === split)!.week
    await saveGym({ id: 'default', name: 'My gym', equipmentTypeIds: equipment })
    const raw = parseFloat(bodyweight) || (unit === 'lb' ? 175 : 80)
    for (const a of anchors) {
      const l = lifts[a.movement.id]
      const w = parseFloat(l?.w ?? ''), r = parseInt(l?.r ?? '', 10)
      if (w > 0 && r > 0) await seedProgression(resolveVariant(a.movement, {}).id, fromDisplay(w, unit), r)
    }
    await saveProfile({
      onboarded: true, displayUnit: unit, defaultGymId: 'default', experience, week,
      volumePreset: experience === 'new' ? 'minimal' : experience === 'advanced' ? 'high' : 'standard',
      bodyweightKg: unit === 'lb' ? fromDisplay(raw, 'lb') : raw,
    })
  }

  const Nav = ({ next, last }: { next: () => void; last?: boolean }) => (
    <div style="padding:20px 16px 32px;display:flex;gap:10px">
      {step > 0 && <button class="btn" style="flex:1;margin:0" onClick={() => setStep(step - 1)}>Back</button>}
      <button class="btn primary" style="flex:2;margin:0" onClick={next}>{last ? 'Start training' : 'Continue'}</button>
    </div>
  )

  return (
    <main class="bare">
      <p class="tiny" style="padding:calc(env(safe-area-inset-top) + 18px) 16px 0">Step {step + 1} of {STEPS.length}</p>
      <h1 class="large-title">{step === 0 ? 'Beau' : STEPS[step]}</h1>

      {step === 0 && (
        <>
          <p class="subtitle">Adaptive strength training that stays on your phone.</p>
          <Group footer="Four commitments. Everything in the app follows from one of them.">
            <Row label="Beau proposes; you decide" sub="Every session is a proposal. Swap or reject anything — each reason teaches it." />
            <Row label="Everything stays on this device" sub="No account, no server. Export is the only way your data leaves." />
            <Row label="Every number explains itself" sub="A weight says why it is that weight. A recovery figure says which sets caused it." />
            <Row label="Train the body you can understand" sub="The anatomy that plans your training is the anatomy you can study." />
          </Group>
          <Nav next={() => setStep(1)} />
        </>
      )}

      {step === 1 && (
        <>
          <Group header="Units">
            <Custom><Segmented options={[{ id: 'lb', label: 'Pounds' }, { id: 'kg', label: 'Kilograms' }]} value={unit}
                               onChange={(u) => { setUnit(u); setBodyweight(u === 'lb' ? '175' : '80') }} /></Custom>
          </Group>
          <Group header="Bodyweight" footer="Used to score push-ups, dips and pull-ups, where your body is the load.">
            <Custom><input type="number" inputMode="decimal" value={bodyweight} onInput={(e) => setBodyweight((e.target as HTMLInputElement).value)}
                           style="width:100%;background:none;border:0;color:var(--label);font-size:22px;padding:0" /></Custom>
          </Group>
          <Group header="Experience" footer="Sets how much weekly volume Beau aims for. You can change it later.">
            {([['new', 'New to lifting', 'Under a year of consistent training'],
               ['intermediate', 'Intermediate', 'A year or more; you know your main lifts'],
               ['advanced', 'Advanced', 'Several years; progress comes slowly']] as const).map(([id, l, sub]) => (
              <Row key={id} label={l} sub={sub} onPress={() => setExperience(id)} chevron={false}
                   value={experience === id ? '✓' : ''} accentValue />
            ))}
          </Group>
          <Nav next={() => setStep(2)} />
        </>
      )}

      {step === 2 && (
        <>
          <p class="subtitle">Nothing can be proposed without a week to fit it into.</p>
          <Group header="Split" footer="Each day gets a focus and a length. Edit any day later under Settings → Training plan.">
            {SPLIT_TEMPLATES.map((t) => (
              <Row key={t.id} label={t.name} sub={Object.entries(t.week).map(([d, p]) => `${DAY_NAMES[Number(d)]} ${FOCUS_LABEL[p!.focus]}`).join(' · ')}
                   onPress={() => setSplit(t.id)} chevron={false} value={split === t.id ? '✓' : ''} accentValue />
            ))}
          </Group>
          <Nav next={() => setStep(3)} />
        </>
      )}

      {step === 3 && (
        <>
          <p class="subtitle">This decides what can be prescribed, and how weights round.</p>
          <Group>
            {PRESETS.map((p) => <Row key={p.id} label={p.name} sub={p.detail} onPress={() => setPreset(p.id)} chevron={false} value={preset === p.id ? '✓' : ''} accentValue />)}
            <Row label="Pick individually" sub={`${custom.size} selected`} onPress={() => setPreset('custom')} chevron={false} value={preset === 'custom' ? '✓' : ''} accentValue />
          </Group>
          {preset === 'custom' && (
            <Group header="Equipment">
              <Custom><div class="chips">{EQUIPMENT_TYPES.map((e) => (
                <button key={e.id} class={`chip${custom.has(e.id) ? ' on' : ''}`} onClick={() => { const n = new Set(custom); n.has(e.id) ? n.delete(e.id) : n.add(e.id); setCustom(n) }}>{e.name}</button>
              ))}</div></Custom>
            </Group>
          )}
          <Nav next={() => setStep(4)} />
        </>
      )}

      {step === 4 && (
        <>
          <p class="subtitle">Optional. A weight you can do for a few reps on each — Beau starts there instead of from an empty bar.</p>
          <Group footer="Leave blank anything you are not sure about. Beau will ask in your first session.">
            {anchors.map((a) => {
              const l = lifts[a.movement.id] ?? { w: '', r: '' }
              const set = (patch: Partial<typeof l>) => setLifts({ ...lifts, [a.movement.id]: { ...l, ...patch } })
              return (
                <div class="row" key={a.movement.id}>
                  <div class="label"><span>{a.movement.name}</span><span class="sub">{a.label}</span></div>
                  <div style="display:flex;gap:6px;align-items:center">
                    <input class="input" style="width:64px;text-align:right" type="number" inputMode="decimal" placeholder={unit} value={l.w} onInput={(e) => set({ w: (e.target as HTMLInputElement).value })} />
                    <span class="secondary">×</span>
                    <input class="input" style="width:44px;text-align:right" type="number" inputMode="numeric" placeholder="reps" value={l.r} onInput={(e) => set({ r: (e.target as HTMLInputElement).value })} />
                  </div>
                  <span />
                </div>
              )
            })}
          </Group>
          <Nav next={() => void finish()} last />
        </>
      )}
    </main>
  )
}

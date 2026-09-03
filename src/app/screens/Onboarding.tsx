import { useState } from 'preact/hooks'
import { EQUIPMENT_TYPES } from '../../core/equipment/catalog'
import { saveGym, saveProfile } from '../store'

const LB = 0.45359237

/** Presets cover the three gyms almost everybody actually trains in; Custom is
 *  there for the rest. */
const PRESETS: { id: string; name: string; detail: string; equipment: string[] }[] = [
  {
    id: 'full', name: 'Commercial gym', detail: 'Barbells, dumbbells, cables, machines',
    equipment: EQUIPMENT_TYPES.map((e) => e.id),
  },
  {
    id: 'home', name: 'Home gym', detail: 'Dumbbells, a bench, a bar, bands',
    equipment: ['dumbbell', 'adjustable_bench', 'flat_bench', 'barbell', 'squat_rack',
                'ez_bar', 'band', 'pull_up_bar', 'bodyweight', 'plate', 'kettlebell', 'box'],
  },
  {
    id: 'minimal', name: 'Bodyweight', detail: 'A bar to hang from, and the floor',
    equipment: ['bodyweight', 'pull_up_bar', 'dip_station', 'band', 'box', 'ab_wheel'],
  },
]

export function Onboarding() {
  const [step, setStep] = useState(0)
  const [unit, setUnit] = useState<'kg' | 'lb'>('lb')
  const [bodyweight, setBodyweight] = useState('175')
  const [preset, setPreset] = useState('full')
  const [custom, setCustom] = useState<Set<string>>(new Set(PRESETS[0]!.equipment))

  const finish = async () => {
    const equipment = preset === 'custom'
      ? [...custom]
      : PRESETS.find((p) => p.id === preset)!.equipment
    await saveGym({ id: 'default', name: 'My gym', equipmentTypeIds: equipment })
    const raw = parseFloat(bodyweight) || (unit === 'lb' ? 175 : 80)
    await saveProfile({
      onboarded: true, displayUnit: unit, defaultGymId: 'default',
      bodyweightKg: unit === 'lb' ? raw * LB : raw,
    })
  }

  return (
    <main>
      {step === 0 && (
        <>
          <h1>Beau</h1>
          <p class="muted">
            Adaptive strength training that stays on your phone. No account, no server,
            nothing leaves this device.
          </p>
          <div class="divider" />
          <div class="field">
            <label>Units</label>
            <div class="row">
              {(['lb', 'kg'] as const).map((u) => (
                <button key={u} class={unit === u ? 'pill on' : 'pill'}
                        style="flex:1;min-height:44px"
                        onClick={() => { setUnit(u); setBodyweight(u === 'lb' ? '175' : '80') }}>
                  {u === 'lb' ? 'Pounds' : 'Kilograms'}
                </button>
              ))}
            </div>
          </div>
          <div class="field">
            <label>Bodyweight ({unit}) — used to score push-ups, dips and pull-ups</label>
            <input type="number" inputMode="decimal" value={bodyweight}
                   onInput={(e) => setBodyweight((e.target as HTMLInputElement).value)} />
          </div>
          <button class="primary wide" onClick={() => setStep(1)}>Continue</button>
        </>
      )}

      {step === 1 && (
        <>
          <h1>What can you train with?</h1>
          <p class="muted">
            This decides what Beau is allowed to suggest, and how it rounds the weights.
          </p>
          <div class="stack" style="margin-top:16px">
            {PRESETS.map((p) => (
              <button key={p.id} class="card" style="text-align:left;display:block"
                      onClick={() => setPreset(p.id)}>
                <div class="spread">
                  <strong>{p.name}</strong>
                  <span class={preset === p.id ? 'pill on' : 'pill'}>
                    {preset === p.id ? 'Selected' : 'Choose'}
                  </span>
                </div>
                <div class="tiny" style="margin-top:4px">{p.detail}</div>
              </button>
            ))}
            <button class="card" style="text-align:left;display:block"
                    onClick={() => setPreset('custom')}>
              <div class="spread">
                <strong>Pick individually</strong>
                <span class={preset === 'custom' ? 'pill on' : 'pill'}>
                  {preset === 'custom' ? `${custom.size} selected` : 'Choose'}
                </span>
              </div>
              <div class="tiny" style="margin-top:4px">Every machine, one at a time</div>
            </button>
          </div>

          {preset === 'custom' && (
            <div class="card" style="margin-top:12px">
              <div class="row wrap">
                {EQUIPMENT_TYPES.map((e) => (
                  <button key={e.id} class={custom.has(e.id) ? 'pill on' : 'pill'}
                          style="min-height:34px"
                          onClick={() => {
                            const next = new Set(custom)
                            next.has(e.id) ? next.delete(e.id) : next.add(e.id)
                            setCustom(next)
                          }}>{e.name}</button>
                ))}
              </div>
            </div>
          )}

          <div class="row" style="margin-top:16px">
            <button class="ghost" onClick={() => setStep(0)}>Back</button>
            <button class="primary" style="flex:1" onClick={finish}>Start training</button>
          </div>
          <p class="tiny" style="margin-top:14px">
            You can change any of this later in Settings.
          </p>
        </>
      )}
    </main>
  )
}

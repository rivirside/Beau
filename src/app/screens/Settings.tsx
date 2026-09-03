import { useEffect, useRef, useState } from 'preact/hooks'
import { EQUIPMENT_TYPES } from '../../core/equipment/catalog'
import { useApp, saveProfile, saveGym, currentGym, reloadEverything } from '../store'
import { downloadExport, importExport } from '../export'
import { clearAll } from '../db'
import { onUpdateStatus, checkForUpdate, applyPendingUpdate, forceReload, APP_VERSION,
         type UpdateStatus } from '../update'
import { toDisplay, fromDisplay } from '../format'

export function Settings() {
  const app = useApp()
  const gym = currentGym()
  const unit = app.profile.displayUnit
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [message, setMessage] = useState<string | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => onUpdateStatus(setStatus), [])

  const onImport = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const result = await importExport(JSON.parse(await file.text()))
      await reloadEverything()
      setMessage(`Imported ${result.workouts} sessions and ${result.sets} sets.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not read that file.')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const updateLabel: Record<UpdateStatus['state'], string> = {
    idle: 'Check for updates',
    checking: 'Checking…',
    current: 'Check for updates',
    available: 'Downloading update…',
    ready: 'Install update and reload',
    error: 'Try again',
    unsupported: 'Updates unavailable',
  }

  return (
    <>
      <h1>Settings</h1>

      <h2>Updates</h2>
      <div class="card">
        <button class={status.state === 'ready' ? 'primary wide' : 'wide'}
                disabled={status.state === 'checking' || status.state === 'unsupported'}
                onClick={() => {
                  if (status.state === 'ready') void applyPendingUpdate()
                  else void checkForUpdate()
                }}>
          {updateLabel[status.state]}
        </button>
        <p class="tiny" style="margin:10px 0 0">
          {status.state === 'ready' &&
            `Version ${status.version ?? ''} is downloaded and waiting. Installing reloads the app — your data is untouched.`}
          {status.state === 'available' &&
            `Version ${status.version} is on the server; fetching it now. If this does not turn into an install button within a few seconds, use “Reload latest” below.`}
          {status.state === 'current' &&
            `You are on the latest version. Checked ${new Date(status.checkedAt).toLocaleTimeString()}.`}
          {status.state === 'error' &&
            (status.offlineHint
              ? `Could not reach the server and the browser reports no connection. (${status.message})`
              : `Could not check: ${status.message}`)}
          {status.state === 'unsupported' &&
            'This browser has no service worker, so the app cannot update itself here. Reload the page instead.'}
          {(status.state === 'idle' || status.state === 'checking') &&
            'Beau never updates itself mid-session. It only changes when you ask it to.'}
        </p>
        <p class="tiny" style="margin:8px 0 0">Running version {APP_VERSION}</p>
        {(status.state === 'available' || status.state === 'error') && (
          <button class="ghost wide" style="margin-top:10px" onClick={() => void forceReload()}>
            Reload latest (clears app cache, keeps your data)
          </button>
        )}
      </div>

      <h2>Your data</h2>
      <div class="card">
        <p class="tiny" style="margin:0 0 10px">
          Everything lives in this browser. Export is the only way it leaves — and the
          only way it survives a cleared cache or a move to another device.
        </p>
        <div class="row">
          <button style="flex:1" onClick={() => void downloadExport()}>Export JSON</button>
          <button style="flex:1" onClick={() => fileInput.current?.click()}>Import</button>
        </div>
        <input ref={fileInput} type="file" accept="application/json,.json"
               style="display:none" onChange={onImport} />
        {message && <p class="tiny" style="margin:10px 0 0">{message}</p>}
      </div>

      <h2>Training</h2>
      <div class="card">
        <div class="field">
          <label>Units</label>
          <div class="row">
            {(['lb', 'kg'] as const).map((u) => (
              <button key={u} class={unit === u ? 'pill on' : 'pill'}
                      style="flex:1;min-height:42px"
                      onClick={() => void saveProfile({ displayUnit: u })}>
                {u === 'lb' ? 'Pounds' : 'Kilograms'}
              </button>
            ))}
          </div>
        </div>
        <div class="field">
          <label>Bodyweight ({unit})</label>
          <input type="number" inputMode="decimal"
                 value={Math.round(toDisplay(app.profile.bodyweightKg, unit) * 10) / 10}
                 onChange={(e) => {
                   const v = parseFloat((e.target as HTMLInputElement).value)
                   if (Number.isFinite(v)) void saveProfile({ bodyweightKg: fromDisplay(v, unit) })
                 }} />
        </div>
        <div class="field">
          <label>Session length (minutes)</label>
          <input type="number" inputMode="numeric" value={app.profile.sessionMinutes}
                 onChange={(e) => {
                   const v = parseInt((e.target as HTMLInputElement).value, 10)
                   if (Number.isFinite(v)) void saveProfile({ sessionMinutes: v })
                 }} />
        </div>
        <div class="field">
          <label>Rest timer (seconds)</label>
          <input type="number" inputMode="numeric" value={app.profile.restSeconds}
                 onChange={(e) => {
                   const v = parseInt((e.target as HTMLInputElement).value, 10)
                   if (Number.isFinite(v)) void saveProfile({ restSeconds: v })
                 }} />
        </div>
        <div class="spread">
          <div>
            <strong style="font-size:15px">Anatomy cards while resting</strong>
            <div class="tiny">Quiz you on the muscles you just trained.</div>
          </div>
          <button class={app.profile.studyDuringRest ? 'pill on' : 'pill'}
                  style="min-height:36px"
                  onClick={() => void saveProfile({ studyDuringRest: !app.profile.studyDuringRest })}>
            {app.profile.studyDuringRest ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      <h2>Equipment</h2>
      <div class="card">
        <p class="tiny" style="margin:0 0 10px">
          Only what is selected can be prescribed, and weights round to what these can
          actually produce.
        </p>
        <div class="row wrap">
          {EQUIPMENT_TYPES.map((e) => {
            const on = gym?.equipmentTypeIds.includes(e.id) ?? false
            return (
              <button key={e.id} class={on ? 'pill on' : 'pill'} style="min-height:34px"
                      onClick={() => {
                        if (!gym) return
                        const next = on
                          ? gym.equipmentTypeIds.filter((x) => x !== e.id)
                          : [...gym.equipmentTypeIds, e.id]
                        void saveGym({ ...gym, equipmentTypeIds: next })
                      }}>{e.name}</button>
            )
          })}
        </div>
      </div>

      <h2>About</h2>
      <div class="card">
        <p class="tiny" style="margin:0">
          Beau is a prototype. The training engine is complete and tested; the anatomy
          library is unverified draft content and is marked as such on the cards — do
          not study from it for an exam yet.
        </p>
      </div>

      <div class="card" style="margin-top:10px">
        <button class="danger wide" onClick={() => setConfirmWipe(true)}>
          Delete everything
        </button>
      </div>

      {confirmWipe && (
        <div class="sheet" onClick={(e) => {
          if (e.target === e.currentTarget) setConfirmWipe(false)
        }}>
          <div>
            <strong>Delete all data?</strong>
            <p class="muted">
              Every session, every set, and all progression. There is no undo and no
              backup on a server — export first if you might want it back.
            </p>
            <div class="row" style="margin-top:12px">
              <button style="flex:1" onClick={() => setConfirmWipe(false)}>Cancel</button>
              <button class="danger" style="flex:1" onClick={async () => {
                setConfirmWipe(false)
                await clearAll()
                await reloadEverything()
              }}>Delete everything</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

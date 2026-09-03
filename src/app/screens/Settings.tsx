import { useEffect, useRef, useState } from 'preact/hooks'
import { EQUIPMENT_TYPES } from '../../core/equipment/catalog'
import { DAY_NAMES } from '../../core/engine/plan'
import { useApp, saveProfile, saveGym, currentGym, reloadEverything, rerunSetup, resetApp } from '../store'
import { downloadExport, importExport } from '../export'
import { clearAll } from '../db'
import { onUpdateStatus, checkForUpdate, applyPendingUpdate, forceReload, APP_VERSION, type UpdateStatus } from '../update'
import { toDisplay, fromDisplay } from '../format'
import { Page, Group, Row, ButtonRow, ToggleRow, InputRow, Custom, Segmented, ActionSheet } from '../ui'
import { push } from '../nav'
import { PlanPage } from './Plan'

export function Settings() {
  const app = useApp()
  const gym = currentGym()
  const days = Object.keys(app.profile.week).map(Number).sort()
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  useEffect(() => onUpdateStatus(setStatus), [])
  const go = (key: string, title: string, render: () => preact.JSX.Element) => () => push({ key, title, render })

  return (
    <Page title="Settings">
      <Group>
        <Row label="You" sub={`${app.profile.displayUnit === 'lb' ? 'Pounds' : 'Kilograms'} · ${Math.round(toDisplay(app.profile.bodyweightKg, app.profile.displayUnit))} ${app.profile.displayUnit} · ${app.profile.experience}`} onPress={go('you', 'You', () => <YouPage />)} />
      </Group>
      <Group header="Training">
        <Row label="Training plan" value={`${days.length} days`} onPress={go('plan', 'Training plan', () => <PlanPage />)} />
        <Row label="Gym & equipment" value={`${gym?.equipmentTypeIds.length ?? 0} items`} onPress={go('gym', 'Gym & equipment', () => <GymPage />)} />
        <Row label="Preferences" sub="Rest timer, anatomy cards, session length" onPress={go('prefs', 'Preferences', () => <PreferencesPage />)} />
      </Group>
      <StartOverGroup />
      <Group header="App">
        <Row label="Your data" sub="Export, import" onPress={go('data', 'Your data', () => <DataPage />)} />
        <Row label="Updates" value={status.state === 'ready' ? 'Update ready' : status.state === 'available' ? 'Downloading' : ''} accentValue onPress={go('updates', 'Updates', () => <UpdatesPage />)} />
        <Row label="About Beau" onPress={go('about', 'About', () => <AboutPage />)} />
      </Group>
      <div class="spacer" />
    </Page>
  )
}

function StartOverGroup() {
  const [confirm, setConfirm] = useState(false)
  return (
    <>
      <Group header="Start over" footer="Run setup again to choose every setting yourself, keeping your logged sessions. Reset erases everything and starts from scratch.">
        <ButtonRow label="Run setup again" onPress={() => void rerunSetup()} />
        <ButtonRow label="Reset app" destructive onPress={() => setConfirm(true)} />
      </Group>
      {confirm && (
        <ActionSheet title="Erase everything and start setup from scratch? Every session, set and lift history is deleted. There is no undo."
          onCancel={() => setConfirm(false)}
          actions={[{ label: 'Erase and start over', destructive: true, onPress: () => { setConfirm(false); void resetApp() } }]} />
      )}
    </>
  )
}

function YouPage() {
  const app = useApp()
  const unit = app.profile.displayUnit
  return (
    <Page title="You">
      <Group header="Units"><Custom><Segmented options={[{ id: 'lb', label: 'Pounds' }, { id: 'kg', label: 'Kilograms' }]} value={unit} onChange={(u) => void saveProfile({ displayUnit: u })} /></Custom></Group>
      <Group header="Body" footer="Used to score push-ups, dips and pull-ups.">
        <InputRow label="Bodyweight" unit={unit} value={Math.round(toDisplay(app.profile.bodyweightKg, unit) * 10) / 10}
                  onCommit={(v) => { const n = parseFloat(v); if (Number.isFinite(n)) void saveProfile({ bodyweightKg: fromDisplay(n, unit) }) }} />
      </Group>
      <Group header="Experience" footer="Changes the default weekly volume. Your plan's volume preset overrides it.">
        {([['new', 'New to lifting'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']] as const).map(([id, l]) => (
          <Row key={id} label={l} value={app.profile.experience === id ? '✓' : ''} accentValue chevron={false} onPress={() => void saveProfile({ experience: id })} />
        ))}
      </Group>
    </Page>
  )
}

function GymPage() {
  const app = useApp()
  const gym = currentGym()
  const cats = [...new Set(EQUIPMENT_TYPES.map((e) => e.category))]
  const labels: Record<string, string> = { free_weight: 'Free weights', cable: 'Cables', machine: 'Machines', bodyweight: 'Bodyweight', support: 'Benches & racks', accessory: 'Accessories' }
  return (
    <Page title="Gym & equipment" subtitle="Only what is on can be prescribed. Weights round to what these produce.">
      {cats.map((c) => (
        <Group key={c} header={labels[c] ?? c}>
          {EQUIPMENT_TYPES.filter((e) => e.category === c).map((e) => {
            const on = gym?.equipmentTypeIds.includes(e.id) ?? false
            return <ToggleRow key={e.id} label={e.name} on={on} onChange={(v) => { if (!gym) return; void saveGym({ ...gym, equipmentTypeIds: v ? [...gym.equipmentTypeIds, e.id] : gym.equipmentTypeIds.filter((x) => x !== e.id) }) }} />
          })}
        </Group>
      ))}
      <div class="spacer" />
      {app.profile.excludedMovementIds.length > 0 && (
        <Group header="Never show" footer="Exercises you rejected permanently. Tap to allow again.">
          {app.profile.excludedMovementIds.map((id) => <Row key={id} label={id.replace(/_/g, ' ')} chevron={false} onPress={() => void saveProfile({ excludedMovementIds: app.profile.excludedMovementIds.filter((x) => x !== id) })}><span class="value" style="color:var(--blue)">Allow</span></Row>)}
        </Group>
      )}
    </Page>
  )
}

function PreferencesPage() {
  const app = useApp()
  return (
    <Page title="Preferences">
      <Group header="Session">
        <InputRow label="Default length" unit="min" inputMode="numeric" value={app.profile.sessionMinutes} onCommit={(v) => { const n = parseInt(v, 10); if (n > 0) void saveProfile({ sessionMinutes: n }) }} />
        <InputRow label="Rest timer" unit="sec" inputMode="numeric" value={app.profile.restSeconds} onCommit={(v) => { const n = parseInt(v, 10); if (n > 0) void saveProfile({ restSeconds: n }) }} />
      </Group>
      <Group header="Learning" footer="Between sets, a card about the muscle you just trained. Ninety seconds with the phone already in hand.">
        <ToggleRow label="Anatomy cards while resting" on={app.profile.studyDuringRest} onChange={(v) => void saveProfile({ studyDuringRest: v })} />
      </Group>
    </Page>
  )
}

function DataPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const onImport = async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (!f) return
    try { const r = await importExport(JSON.parse(await f.text())); await reloadEverything(); setMessage(`Imported ${r.workouts} sessions and ${r.sets} sets.`) }
    catch (err) { setMessage(err instanceof Error ? err.message : 'Could not read that file.') }
    finally { if (file.current) file.current.value = '' }
  }
  return (
    <Page title="Your data">
      <Group footer={message ?? 'Everything lives in this browser. Export is the only way it leaves — and the only way it survives a cleared cache or a move to another device. Import replaces everything.'}>
        <ButtonRow label="Export JSON" onPress={() => void downloadExport()} />
        <ButtonRow label="Import…" onPress={() => file.current?.click()} />
        <input ref={file} type="file" accept="application/json,.json" style="display:none" onChange={onImport} />
      </Group>
      <Group footer="Every session, every set, all progression. No undo, no backup on a server.">
        <ButtonRow label="Delete everything" destructive onPress={() => setConfirm(true)} />
      </Group>
      {confirm && <ActionSheet title="Delete all data? Export first if you might want it back." onCancel={() => setConfirm(false)}
        actions={[{ label: 'Delete everything', destructive: true, onPress: async () => { setConfirm(false); await clearAll(); await reloadEverything(); history.go(-1) } }]} />}
    </Page>
  )
}

function UpdatesPage() {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  useEffect(() => onUpdateStatus(setStatus), [])
  const label: Record<UpdateStatus['state'], string> = { idle: 'Check for updates', checking: 'Checking…', current: 'Check again', available: 'Downloading update…', ready: 'Install update and reload', error: 'Try again', unsupported: 'Updates unavailable' }
  const note = status.state === 'ready' ? `Version ${status.version ?? ''} is downloaded and waiting. Installing reloads the app — your data is untouched.`
    : status.state === 'available' ? `Version ${status.version} is on the server; fetching it. If this does not become an install button within a few seconds, use Reload latest.`
    : status.state === 'current' ? `You are on the latest version. Checked ${new Date(status.checkedAt).toLocaleTimeString()}.`
    : status.state === 'error' ? (status.offlineHint ? `Could not reach the server and the browser reports no connection. (${status.message})` : `Could not check: ${status.message}`)
    : status.state === 'unsupported' ? 'This browser has no service worker, so the app cannot update itself here.'
    : 'Beau never updates itself mid-session. It only changes when you ask.'
  return (
    <Page title="Updates">
      <Group footer={note}>
        <Row label="Running version" value={APP_VERSION} accentValue />
        <ButtonRow label={label[status.state]} primary={status.state === 'ready'} disabled={status.state === 'checking' || status.state === 'unsupported'}
                   onPress={() => (status.state === 'ready' ? void applyPendingUpdate() : void checkForUpdate())} />
      </Group>
      <Group footer="Throws away the app's cached files and reloads from the server. Your training data is not a cache and is kept.">
        <ButtonRow label="Reload latest" onPress={() => void forceReload()} />
      </Group>
    </Page>
  )
}

function AboutPage() {
  return (
    <Page title="About" subtitle="Adaptive strength training that stays on your phone.">
      <Group header="Four commitments">
        <Row label="Beau proposes; you decide" sub="Every session is a proposal. Swap or reject anything; each reason teaches it." />
        <Row label="Everything stays on this device" sub="No account, no server, no telemetry." />
        <Row label="Every number explains itself" sub="A weight says why. A recovery figure says which sets caused it." />
        <Row label="Train the body you can understand" sub="The anatomy that plans your training is the anatomy you can study." />
      </Group>
      <Group header="Status" footer="The engine is complete and tested. The anatomy library is unverified draft content, marked as such wherever it appears. Do not study from it for an exam yet.">
        <Row label="Version" value={APP_VERSION} accentValue />
      </Group>
    </Page>
  )
}

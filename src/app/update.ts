/** Explicit update control.
 *
 *  The first version of this asked the service worker whether it had something
 *  new and read every failure as "offline". On a phone with a full 5G signal it
 *  said "No connection", because iOS Safari's navigator.onLine is unreliable
 *  and the catch block hid the real error. So:
 *
 *  - The check fetches version.json straight from the server, no cache, and
 *    compares it to the version compiled into this bundle. Deterministic.
 *  - Errors are surfaced with their message, never collapsed into a guess.
 *  - A stuck service worker has an escape hatch: unregister, clear caches,
 *    reload. Only ever from a button.
 *
 *  Registered with 'prompt', not 'autoUpdate': the app never reloads itself
 *  mid-set. Settings owns when a new version is applied. */

import { registerSW } from 'virtual:pwa-register'

export const APP_VERSION = __APP_VERSION__

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'current'; checkedAt: string }
  /** Server has a newer build; the service worker is fetching it. */
  | { state: 'available'; version: string }
  /** New build downloaded and waiting; one tap installs it. */
  | { state: 'ready'; version?: string }
  | { state: 'error'; message: string; offlineHint: boolean }
  | { state: 'unsupported' }

type Listener = (status: UpdateStatus) => void
let listeners: Listener[] = []
let status: UpdateStatus = { state: 'idle' }
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null
let registration: ServiceWorkerRegistration | undefined
let latestSeen: string | undefined

function emit(next: UpdateStatus) {
  status = next
  for (const l of listeners) l(next)
}

export function onUpdateStatus(l: Listener) {
  listeners.push(l)
  l(status)
  return () => { listeners = listeners.filter((x) => x !== l) }
}

export function initServiceWorker() {
  if (!('serviceWorker' in navigator)) { emit({ state: 'unsupported' }); return }
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() { emit({ state: 'ready', version: latestSeen }) },
    onRegisteredSW(_url, reg) { registration = reg },
  })
}

const base = import.meta.env.BASE_URL

async function fetchServerVersion(): Promise<string> {
  const res = await fetch(`${base}version.json?_=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`server answered ${res.status}`)
  const data = (await res.json()) as { version?: string }
  if (!data.version) throw new Error('version.json had no version field')
  return data.version
}

/** What the Settings button calls. */
export async function checkForUpdate(): Promise<UpdateStatus> {
  emit({ state: 'checking' })
  let server: string
  try {
    server = await fetchServerVersion()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    emit({ state: 'error', message, offlineHint: navigator.onLine === false })
    return status
  }

  if (server === APP_VERSION) {
    emit({ state: 'current', checkedAt: new Date().toISOString() })
    return status
  }

  latestSeen = server
  emit({ state: 'available', version: server })

  // Nudge the service worker to fetch the new bundle. If it lands, onNeedRefresh
  // flips us to 'ready'. If it does not within a few seconds, the button still
  // offers a force reload, so a stuck worker never blocks an update.
  try {
    const reg = registration ?? await navigator.serviceWorker?.getRegistration()
    await reg?.update()
  } catch { /* the force path covers this */ }
  return status
}

/** Activate the waiting worker and reload. Only ever called from a button. */
export async function applyPendingUpdate() {
  if (status.state === 'ready' && applyUpdate) { await applyUpdate(true); return }
  await forceReload()
}

/** Escape hatch: throw away every service worker and cache for this origin,
 *  then reload from the network. IndexedDB is untouched — training data is
 *  not a cache and is never cleared here. */
export async function forceReload() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations() ?? []
    await Promise.all(regs.map((r) => r.unregister()))
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } finally {
    location.replace(`${base}?reloaded=${Date.now()}`)
  }
}

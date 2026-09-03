/** Service worker registration and explicit update control.
 *
 *  Registered with `prompt` rather than `autoUpdate` on purpose: an app that
 *  reloads itself mid-set to install a new version is worse than one that waits
 *  to be asked. Settings owns the button. */

import { registerSW } from 'virtual:pwa-register'

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'ready' }        // a new version is downloaded and waiting
  | { state: 'current'; checkedAt: string }
  | { state: 'offline' }
  | { state: 'unsupported' }

type Listener = (status: UpdateStatus) => void

let listeners: Listener[] = []
let status: UpdateStatus = { state: 'idle' }
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null
let registration: ServiceWorkerRegistration | undefined

function emit(next: UpdateStatus) {
  status = next
  for (const l of listeners) l(next)
}

export function onUpdateStatus(l: Listener) {
  listeners.push(l)
  l(status)
  return () => { listeners = listeners.filter((x) => x !== l) }
}

export const updateStatus = () => status

export function initServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    emit({ state: 'unsupported' })
    return
  }
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() { emit({ state: 'ready' }) },
    onRegisteredSW(_url, reg) { registration = reg },
  })
}

/** What the Settings button calls. Asks the browser to re-fetch the service
 *  worker; if the bundle changed, onNeedRefresh fires and the state becomes
 *  'ready'. */
export async function checkForUpdate(): Promise<UpdateStatus> {
  if (!('serviceWorker' in navigator)) return status
  if (!navigator.onLine) { emit({ state: 'offline' }); return status }

  emit({ state: 'checking' })
  try {
    const reg = registration ?? await navigator.serviceWorker.getRegistration()
    if (!reg) { emit({ state: 'unsupported' }); return status }
    await reg.update()
    // update() resolves before onNeedRefresh necessarily fires; give the
    // install a moment before declaring the app current.
    await new Promise((r) => setTimeout(r, 1200))
    if (status.state === 'checking') {
      emit({ state: 'current', checkedAt: new Date().toISOString() })
    }
  } catch {
    emit({ state: 'offline' })
  }
  return status
}

/** Activate the waiting worker and reload. Only ever called from a button. */
export async function applyPendingUpdate() {
  if (applyUpdate) await applyUpdate(true)
  else location.reload()
}

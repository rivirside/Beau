import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import './styles.css'
import { useApp, load } from './store'
import { initServiceWorker } from './update'
import { Onboarding } from './screens/Onboarding'
import { Today } from './screens/Today'
import { Session } from './screens/Session'
import { History } from './screens/History'
import { Settings } from './screens/Settings'

export type Tab = 'today' | 'history' | 'settings'

function App() {
  const app = useApp()
  const [tab, setTab] = useState<Tab>('today')

  useEffect(() => { void load() }, [])

  if (!app.ready) {
    return <main><p class="muted" style="margin-top:40vh;text-align:center">Loading…</p></main>
  }
  if (!app.profile.onboarded) return <Onboarding />
  // A session in progress takes over the whole app: mid-workout there is
  // nothing else worth looking at.
  if (app.active) return <Session />

  return (
    <>
      <main>
        {tab === 'today' && <Today />}
        {tab === 'history' && <History />}
        {tab === 'settings' && <Settings />}
      </main>
      <nav>
        {([['today', '◎', 'Today'], ['history', '≡', 'History'],
           ['settings', '⚙', 'Settings']] as const).map(([id, glyph, label]) => (
          <button key={id} class={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            <span class="glyph">{glyph}</span>{label}
          </button>
        ))}
      </nav>
    </>
  )
}

initServiceWorker()
render(<App />, document.getElementById('app')!)

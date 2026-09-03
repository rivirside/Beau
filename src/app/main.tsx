import { render } from 'preact'
import { useEffect } from 'preact/hooks'
import './styles.css'
import { useApp, load } from './store'
import { initServiceWorker } from './update'
import { useNav, setTab, type Tab } from './nav'
import { Icons } from './ui'
import { Onboarding } from './screens/Onboarding'
import { Today } from './screens/Today'
import { Progress } from './screens/Progress'
import { Learn } from './screens/Learn'
import { Settings } from './screens/Settings'
import { Session } from './screens/Session'

const ROOTS: Record<Tab, () => preact.JSX.Element> = { today: Today, progress: Progress, learn: Learn, settings: Settings }
const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' }, { id: 'progress', label: 'Progress' },
  { id: 'learn', label: 'Learn' }, { id: 'settings', label: 'Settings' },
]

function App() {
  const app = useApp()
  const { tab, top } = useNav()
  useEffect(() => { void load() }, [])

  if (!app.ready) return <main class="bare"><p class="p" style="margin-top:40vh;text-align:center">Loading…</p></main>
  if (!app.profile.onboarded) return <Onboarding />
  // A session in progress takes over: mid-workout there is nothing else worth seeing.
  if (app.active) return <Session />

  const Root = ROOTS[tab]
  return (
    <>
      {top ? top.render() : <Root />}
      <nav class="tabbar">
        {TABS.map((t) => (
          <button key={t.id} class={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{Icons[t.id]}{t.label}</button>
        ))}
      </nav>
    </>
  )
}

initServiceWorker()
render(<App />, document.getElementById('app')!)

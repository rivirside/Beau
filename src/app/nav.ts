/** Per-tab navigation stacks, iOS-style: a tab keeps its pushed pages while you
 *  visit another tab. Integrated with browser history so the back gesture and
 *  hardware back pop a page instead of leaving the app. */

import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'

export type Tab = 'today' | 'progress' | 'learn' | 'settings'

export interface Page {
  key: string
  title: string
  render: () => ComponentChildren
}

let tab: Tab = 'today'
const stacks: Record<Tab, Page[]> = { today: [], progress: [], learn: [], settings: [] }
let listeners: (() => void)[] = []
const notify = () => { for (const l of listeners) l() }

export function useNav() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.push(l)
    return () => { listeners = listeners.filter((x) => x !== l) }
  }, [])
  return { tab, stack: stacks[tab], top: stacks[tab].at(-1) }
}

export function setTab(next: Tab) {
  if (tab === next) {
    // Tapping the active tab pops to its root, as iOS does.
    if (stacks[tab].length) history.go(-stacks[tab].length)
    return
  }
  tab = next
  notify()
}

export function push(page: Page) {
  stacks[tab].push(page)
  history.pushState({ beau: tab, depth: stacks[tab].length }, '')
  notify()
  scrollTo(0, 0)
}

export function pop() {
  if (stacks[tab].length) history.back()
}

export function popToRoot() {
  const n = stacks[tab].length
  if (n) history.go(-n)
}

window.addEventListener('popstate', (e: PopStateEvent) => {
  // One popstate can cover several entries (history.go(-2)), so reconcile the
  // stack to the depth recorded in the history entry rather than popping once.
  // A null state is the entry that existed before any push: depth 0.
  const state = e.state as { beau?: Tab; depth?: number } | null
  const depth = state?.beau === tab ? (state.depth ?? 0) : 0
  if (stacks[tab].length > depth) {
    stacks[tab].length = depth
    notify()
    scrollTo(0, 0)
  }
})

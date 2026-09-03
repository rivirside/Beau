/** Session-linked decks.
 *
 *  The point of the whole feature: a rest timer is 90–180 seconds of dead time,
 *  eight to twenty times a session, phone already in hand. Cards are drawn from
 *  what you are training right now, so you learn where a muscle attaches while
 *  you can still feel it working. See docs/anatomy-model.md §4 */

import type { Card } from './cards'
import type { ReviewState } from './scheduler'
import { isDue } from './scheduler'
import type { TrainableUnitId } from '../taxonomy/anatomy'

export interface DeckOptions {
  /** Muscles worked so far in this session, from the logged sets. */
  trainedUnits: TrainableUnitId[]
  /** Roughly one card per 30s of rest; a 2-minute rest fits about four. */
  limit?: number
  now?: Date
}

/** The subject a card is about — everything after the card kind. Used to spread
 *  a short deck across muscles instead of asking four questions about the
 *  deltoid in a row. */
const subjectOf = (c: Card): string => c.id.slice(c.id.indexOf(':') + 1)

/** Cards for the muscles currently under the bar, due ones first, with unseen
 *  cards behind them so a new user is not shown an empty deck, and spread
 *  across subjects so a two-minute rest covers more than one muscle. */
export function deckForRest(
  cards: Card[],
  states: Map<string, ReviewState>,
  { trainedUnits, limit = 4, now = new Date() }: DeckOptions,
): Card[] {
  const units = new Set<TrainableUnitId>(trainedUnits)
  const relevant = cards.filter((c) => c.trainableUnitIds.some((u) => units.has(u)))

  const score = (c: Card): number => {
    const state = states.get(c.id)
    if (!state) return 1                                  // unseen: worth showing
    if (!isDue(state, now)) return -1                     // not due: skip
    const overdueMs = now.getTime() - new Date(state.due).getTime()
    return 2 + overdueMs / 86_400_000                     // due, most overdue first
  }

  const ranked = relevant
    .map((c) => ({ card: c, score: score(c) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)

  // Round-robin over subjects: take each subject's best card before any
  // subject's second.
  const bySubject = new Map<string, Card[]>()
  for (const { card } of ranked) {
    const list = bySubject.get(subjectOf(card))
    if (list) list.push(card)
    else bySubject.set(subjectOf(card), [card])
  }

  const out: Card[] = []
  const queues = [...bySubject.values()]
  for (let round = 0; out.length < limit; round++) {
    let placed = false
    for (const q of queues) {
      const card = q[round]
      if (!card) continue
      out.push(card)
      placed = true
      if (out.length === limit) break
    }
    if (!placed) break
  }
  return out
}

/** Everything due right now, for a standalone study session away from the gym. */
export function dueDeck(
  cards: Card[],
  states: Map<string, ReviewState>,
  { limit = 50, now = new Date() }: { limit?: number; now?: Date } = {},
): Card[] {
  return cards
    .filter((c) => { const s = states.get(c.id); return s ? isDue(s, now) : true })
    .slice(0, limit)
}

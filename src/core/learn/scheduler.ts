/** Spaced repetition, over FSRS.
 *
 *  FSRS rather than SM-2: it is what Anki moved to, and it reaches the same
 *  retention in materially fewer reviews. Wrapped from `ts-fsrs` (MIT, no
 *  dependencies) rather than reimplemented — scheduling errors are silent, so
 *  hand-rolling the algorithm buys nothing and risks a deck that quietly
 *  schedules badly for months. See docs/anatomy-model.md §4 */

import { fsrs, generatorParameters, createEmptyCard, Rating, State } from 'ts-fsrs'
import type { Card as FsrsCard, Grade } from 'ts-fsrs'

export { Rating, State }

/** Per-card scheduling state. Small, local, and portable to Swift — the Swift
 *  side needs an FSRS implementation, not this wrapper. */
export interface ReviewState {
  cardId: string
  due: string
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  state: State
  lastReview?: string
}

export interface ReviewLog {
  cardId: string
  reviewedAt: string
  rating: Rating
  /** Milliseconds spent before answering — useful later for tuning. */
  durationMs?: number
}

const engine = fsrs(generatorParameters({ enable_fuzz: true }))

const toFsrs = (s: ReviewState): FsrsCard => ({
  due: new Date(s.due),
  stability: s.stability,
  difficulty: s.difficulty,
  elapsed_days: s.elapsedDays,
  scheduled_days: s.scheduledDays,
  reps: s.reps,
  lapses: s.lapses,
  state: s.state,
  learning_steps: 0,
  ...(s.lastReview ? { last_review: new Date(s.lastReview) } : {}),
})

const fromFsrs = (cardId: string, c: FsrsCard): ReviewState => ({
  cardId,
  due: c.due.toISOString(),
  stability: c.stability,
  difficulty: c.difficulty,
  elapsedDays: c.elapsed_days,
  scheduledDays: c.scheduled_days,
  reps: c.reps,
  lapses: c.lapses,
  state: c.state,
  lastReview: c.last_review?.toISOString(),
})

export function newReviewState(cardId: string, now = new Date()): ReviewState {
  return fromFsrs(cardId, createEmptyCard(now))
}

export function review(
  state: ReviewState,
  rating: Grade,
  now = new Date(),
): { state: ReviewState; log: ReviewLog } {
  const result = engine.next(toFsrs(state), now, rating)
  return {
    state: fromFsrs(state.cardId, result.card),
    log: { cardId: state.cardId, reviewedAt: now.toISOString(), rating },
  }
}

/** What the next interval would be for each button, so the UI can show them. */
export function previewIntervals(state: ReviewState, now = new Date()) {
  const scheduled = engine.repeat(toFsrs(state), now)
  return {
    again: scheduled[Rating.Again].card.due,
    hard: scheduled[Rating.Hard].card.due,
    good: scheduled[Rating.Good].card.due,
    easy: scheduled[Rating.Easy].card.due,
  }
}

export const isDue = (s: ReviewState, now = new Date()) => new Date(s.due) <= now

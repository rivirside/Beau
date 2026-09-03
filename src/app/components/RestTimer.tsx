import { useEffect, useMemo, useState } from 'preact/hooks'
import type { MuscleId } from '../../core/taxonomy/muscles'
import { generateCards, type Card } from '../../core/learn/cards'
import { deckForRest } from '../../core/learn/session'
import { newReviewState, review, Rating, type ReviewState } from '../../core/learn/scheduler'
import { useApp, saveReview } from '../store'
import { fmtClock } from '../format'

/** 1,497 cards from the anatomy graph. Built once, lazily — it is not free and
 *  nothing needs it until the first rest period. */
let CARDS: Card[] | null = null
const cards = () => (CARDS ??= generateCards())

export function RestTimer(props: {
  seconds: number
  trainedUnits: MuscleId[]
  study: boolean
  onDone: () => void
  onDismiss: () => void
}) {
  const app = useApp()
  const states: Map<string, ReviewState> = app.reviews
  const [left, setLeft] = useState(props.seconds)
  const [revealed, setRevealed] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const started = Date.now()
    const id = setInterval(() => {
      const remaining = props.seconds - (Date.now() - started) / 1000
      setLeft(remaining)
      if (remaining <= 0) {
        clearInterval(id)
        navigator.vibrate?.([160, 80, 160])
        props.onDone()
      }
    }, 250)
    return () => clearInterval(id)
  }, [props.seconds])

  const deck = useMemo(
    () => (props.study ? deckForRest(cards(), states, {
      trainedUnits: props.trainedUnits, limit: 6,
    }) : []),
    [props.study, props.trainedUnits.join(',')],
  )
  const card = deck[index % Math.max(1, deck.length)]

  const grade = async (rating: Rating.Again | Rating.Good) => {
    if (!card) return
    const prior = states.get(card.id) ?? newReviewState(card.id)
    await saveReview(review(prior, rating).state)
    setRevealed(false)
    setIndex(index + 1)
  }

  return (
    <div class="sheet" onClick={(e) => { if (e.target === e.currentTarget) props.onDismiss() }}>
      <div style="background:var(--group);border-radius:16px 16px 0 0;padding:16px 16px calc(20px + env(safe-area-inset-bottom))">
        <div class="timer">{fmtClock(left)}</div>
        <div class="grid2" style="padding:0">
          <button class="btn" onClick={() => setLeft((l) => l + 30)}>+30s</button>
          <button class="btn primary" onClick={props.onDismiss}>Skip rest</button>
        </div>

        {/* A rest period is 90–180 seconds with the phone already in hand: the
            best spaced-repetition slot anyone gets, and normally wasted. */}
        {card && (
          <>
            <div class="tiny" style="margin:18px 0 8px">
              While you rest — {card.reviewStatus !== 'verified' && 'unverified draft · '}
              anatomy of what you just trained
            </div>
            <div class="card-face" onClick={() => setRevealed(true)} style="margin:0;background:var(--group-2);min-height:110px;cursor:pointer">
              <div dangerouslySetInnerHTML={{
                __html: card.front.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
              }} />
              {revealed
                ? <ul style="margin:10px 0 0;padding-left:18px">
                    {card.back.map((b, i) => <li key={i} class="muted">{b}</li>)}
                  </ul>
                : <p class="tiny" style="margin-top:14px">Tap to reveal</p>}
            </div>
            {revealed && (
              <div class="grid2" style="padding:0;margin-top:8px">
                <button class="btn" style="background:var(--group-2)" onClick={() => void grade(Rating.Again)}>Again</button>
                <button class="btn" style="background:var(--group-2)" onClick={() => void grade(Rating.Good)}>Got it</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

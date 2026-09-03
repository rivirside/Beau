/** End-to-end check of the anatomy graph and the learning layer.
 *  Run with `npm run demo:learn`. */

import {
  MUSCLE_LIBRARY, TRAINABLE_MUSCLES, LANDMARKS, NERVES, JOINTS, BONES, TOTAL_BONE_COUNT,
} from '../anatomy'
import { antagonistsOf, synergistsOf, attachmentsAt, musclesForTrainableUnit } from '../anatomy/graph'
import { generateCards } from './cards'
import { newReviewState, review, Rating } from './scheduler'
import { deckForRest } from './session'
import { resolveVariant } from '../variants'
import { EXAMPLE_MOVEMENTS } from '../movements/examples'

const cards = generateCards()

console.log('\nLibrary')
console.log(`  ${MUSCLE_LIBRARY.length} muscles, ${TOTAL_BONE_COUNT} bones ` +
            `(${BONES.length} named entries), ${LANDMARKS.length} landmarks, ` +
            `${NERVES.length} nerves, ${JOINTS.length} joints`)
console.log(`  ${TRAINABLE_MUSCLES.length} visible to the engine, ` +
            `${MUSCLE_LIBRARY.length - TRAINABLE_MUSCLES.length} library-only ` +
            `(hand, foot, face, eye, pelvic floor)`)
console.log(`  ${cards.length} cards generated, none hand-authored`)
const byKind = new Map<string, number>()
for (const c of cards) byKind.set(c.kind, (byKind.get(c.kind) ?? 0) + 1)
for (const [k, n] of [...byKind].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(22)} ${n}`)
}

console.log('\nThe engine never sees the library-only muscles')
const libraryOnly = MUSCLE_LIBRARY.filter((m) => !TRAINABLE_MUSCLES.includes(m))
console.log('  e.g. ' + libraryOnly.slice(0, 6).map((m) => m.name).join(', ') + ' …')
console.log(`  every one has trainableUnitId undefined: ` +
            `${libraryOnly.every((m) => m.trainableUnitId === undefined)}`)

console.log('\nBones are a subject of their own now')
for (const id of ['scaphoid', 'patella', 'sphenoid']) {
  const bone = BONES.find((x) => x.id === id)!
  console.log(`  ${bone.name}: ${bone.division}, ${bone.class}, ` +
              `articulates with ${bone.articulatesWith?.length ?? 0}`)
  if (bone.notes) console.log(`    ${bone.notes}`)
}

console.log('\nDerived relationships (no lookup table)')
const biceps = MUSCLE_LIBRARY.find((m) => m.id === 'biceps_brachii')!
console.log(`  antagonists of ${biceps.name}: ` +
            antagonistsOf(biceps).map((m) => m.name).join(', '))
const glutemax = MUSCLE_LIBRARY.find((m) => m.id === 'gluteus_maximus')!
console.log(`  antagonists of ${glutemax.name}: ` +
            antagonistsOf(glutemax).map((m) => m.name).join(', '))
console.log(`  synergists of ${glutemax.name}: ` +
            synergistsOf(glutemax).map((m) => m.name).join(', '))

console.log('\nThe graph query no one wants to author by hand')
for (const id of ['coracoid_process', 'ischial_tuberosity', 'medial_epicondyle']) {
  const { origins, insertions } = attachmentsAt(id)
  const name = LANDMARKS.find((l) => l.id === id)!.name
  console.log(`  ${name}:`)
  for (const m of origins) console.log(`    ${m.name} (origin)`)
  for (const m of insertions) console.log(`    ${m.name} (insertion)`)
}

console.log('\nEngine → anatomy bridge')
const variant = resolveVariant(
  EXAMPLE_MOVEMENTS.find((m) => m.id === 'db_bench_press')!,
  { bench_angle: 'incline_high' },
)
const worked = Object.entries(variant.contributions)
  .filter(([, v]) => (v ?? 0) >= 0.5)
  .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
console.log(`  ${variant.displayName} works:`)
for (const [unit, weight] of worked) {
  const names = musclesForTrainableUnit(unit).map((m) => m.name).join(', ')
  console.log(`    ${unit.padEnd(16)} ${weight!.toFixed(2)}  → ${names}`)
}

console.log('\nRest-timer deck after that set')
const states = new Map<string, ReturnType<typeof newReviewState>>()
const deck = deckForRest(cards, states, {
  trainedUnits: worked.map(([u]) => u as never),
  limit: 4,
})
for (const c of deck) {
  console.log(`  Q: ${c.front.replace(/\*\*/g, '')}`)
  console.log(`  A: ${c.back.join(' · ')}`)
  console.log(`     [${c.reviewStatus}]`)
}

console.log('\nScheduling one of them')
let state = newReviewState(deck[0]!.id)
console.log(`  new card, due ${state.due.slice(0, 10)}`)
for (const rating of [Rating.Good, Rating.Good, Rating.Easy] as const) {
  const now = new Date(state.due)
  state = review(state, rating, now).state
  console.log(`  ${String(Rating[rating]).padEnd(5)} → next due ${state.due.slice(0, 10)}` +
              `  (stability ${state.stability.toFixed(1)}d, difficulty ${state.difficulty.toFixed(1)})`)
}
console.log()

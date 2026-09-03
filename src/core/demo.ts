/** Sanity check: does the model actually express the cases that motivated it?
 *  Run with `npm run demo`. */

import { EXAMPLE_MOVEMENTS } from './movements/examples'
import { resolveVariant, enumerateVariants, similarity } from './variants'
import type { MuscleId } from './taxonomy/muscles'

const by = (id: string) => EXAMPLE_MOVEMENTS.find((m) => m.id === id)!

const show = (label: string, v: ReturnType<typeof resolveVariant>, keys: MuscleId[]) => {
  const cells = keys.map((k) => `${k} ${(v.contributions[k] ?? 0).toFixed(2)}`).join('  ')
  console.log(`  ${label.padEnd(26)} ${v.id.padEnd(52)} ${cells}`)
}

console.log('\nCable fly — pulley height shifts chest emphasis:')
for (const h of ['low', 'mid', 'high']) {
  show(`${h} pulley`, resolveVariant(by('cable_fly'), { pulley_height: h }),
       ['pec_upper', 'pec_mid', 'pec_lower'])
}

console.log('\nDumbbell press — bench angle does the same thing:')
for (const a of ['decline', 'flat', 'incline_low', 'incline_high']) {
  show(a, resolveVariant(by('db_bench_press'), { bench_angle: a }),
       ['pec_upper', 'pec_mid', 'pec_lower', 'delt_front'])
}

console.log('\nCurl — shoulder position and grip pick the head:')
for (const c of [{}, { body_position: 'lying' }, { grip_orientation: 'neutral' }]) {
  show(JSON.stringify(c), resolveVariant(by('db_curl'), c),
       ['biceps_long', 'biceps_short', 'brachialis', 'brachioradialis'])
}

console.log('\nVariants generated per movement:')
for (const m of EXAMPLE_MOVEMENTS) {
  console.log(`  ${m.name.padEnd(24)} ${enumerateVariants(m).length}`)
}

console.log('\nSubstitution falls out of vector similarity (no lookup table):')
const lowFly = resolveVariant(by('cable_fly'), { pulley_height: 'low' })
const cands = [
  resolveVariant(by('db_bench_press'), { bench_angle: 'incline_high' }),
  resolveVariant(by('db_bench_press'), { bench_angle: 'decline' }),
  resolveVariant(by('pull_up'), {}),
]
console.log(`  target: ${lowFly.displayName} (${lowFly.id})`)
for (const c of cands) {
  console.log(`    ${similarity(lowFly.contributions, c.contributions).toFixed(3)}  ${c.displayName}`)
}
console.log()

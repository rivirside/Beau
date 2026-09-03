import { validateGraph, antagonistCollisions, ACCEPTED_COLLISIONS } from './graph'
import { MUSCLE_LIBRARY, TRAINABLE_MUSCLES } from './index'
import { BONES, TOTAL_BONE_COUNT, AXIAL_BONE_COUNT } from './bones'
import { LANDMARKS } from './skeleton'
import { NERVES } from './nerves'

const errors = validateGraph()
console.log(`${MUSCLE_LIBRARY.length} muscles ` +
            `(${TRAINABLE_MUSCLES.length} engine-visible, ` +
            `${MUSCLE_LIBRARY.length - TRAINABLE_MUSCLES.length} library-only)`)
console.log(`${TOTAL_BONE_COUNT} bones in ${BONES.length} named entries ` +
            `(${AXIAL_BONE_COUNT} axial, ${TOTAL_BONE_COUNT - AXIAL_BONE_COUNT} appendicular)`)
console.log(`${LANDMARKS.length} landmarks, ${NERVES.length} nerves`)
const collisions = antagonistCollisions()
const accepted = Object.keys(ACCEPTED_COLLISIONS).length
if (collisions.length === 0) {
  console.log(`no trainable unit mixes antagonist prime movers ` +
              `(${accepted} documented exception${accepted === 1 ? '' : 's'})`)
} else {
  console.error(`${collisions.length} unaccepted antagonist collisions:`)
  for (const c of collisions) console.error('  ' + c)
  process.exit(1)
}

if (errors.length === 0) {
  console.log('graph OK — every landmark, nerve, joint and action reference resolves')
} else {
  console.error(`${errors.length} problems:`)
  for (const e of errors) console.error('  ' + e)
  process.exit(1)
}

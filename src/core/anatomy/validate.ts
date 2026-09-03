import { validateGraph } from './graph'
import { MUSCLE_LIBRARY } from './index'

const errors = validateGraph()
console.log(`${MUSCLE_LIBRARY.length} muscles`)
if (errors.length === 0) {
  console.log('graph OK — every landmark, nerve, joint and action reference resolves')
} else {
  console.error(`${errors.length} problems:`)
  for (const e of errors) console.error('  ' + e)
  process.exit(1)
}

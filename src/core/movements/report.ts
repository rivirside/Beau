import { coverage, validateCatalog } from './coverage'
import { MOVEMENT_CATALOG } from './index'
import { enumerateVariants } from '../variants'

const errors = validateCatalog()
const variants = MOVEMENT_CATALOG.reduce((n, m) => n + enumerateVariants(m).length, 0)
console.log(`${MOVEMENT_CATALOG.length} curated movements, ${variants} variants`)

if (errors.length) {
  console.error(`\n${errors.length} catalog errors:`)
  for (const e of errors) console.error('  ' + e)
} else {
  console.log('catalog OK — equipment, axes and axis values all resolve')
}

const rows = coverage()
const orphans = rows.filter((r) => r.primeMovers.length === 0)
const thin = rows.filter((r) => r.primeMovers.length > 0 && r.primeMovers.length < 2)

console.log('\nUNIT COVERAGE')
let region = ''
for (const r of rows) {
  if (r.region !== region) { region = r.region; console.log(`  ${region}`) }
  const flag = r.primeMovers.length === 0 ? ' ORPHAN'
             : r.primeMovers.length === 1 ? ' thin' : ''
  console.log(`    ${r.unit.padEnd(20)} peak ${r.peak.toFixed(2)}` +
              `  prime ${String(r.primeMovers.length).padStart(2)}` +
              `  contrib ${String(r.contributors).padStart(2)}${flag}`)
}

console.log(`\n${orphans.length} orphaned units (no movement can target them):`)
for (const r of orphans) console.log(`  ${r.unit} — peak only ${r.peak.toFixed(2)}`)
console.log(`\n${thin.length} thin units (a single prime mover):`)
for (const r of thin) console.log(`  ${r.unit} — only ${r.primeMovers[0]}`)

if (errors.length || orphans.length) process.exit(1)

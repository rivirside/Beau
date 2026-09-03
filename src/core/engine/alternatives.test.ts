import { test } from 'node:test'
import assert from 'node:assert/strict'
import { alternativesFor } from './generate'
import { buildVariantIndex } from '../movements'
import { EQUIPMENT_TYPES } from '../equipment/catalog'

const INDEX = buildVariantIndex()
const FULL = new Set(EQUIPMENT_TYPES.map((e) => e.id))

test('alternatives for a chest press are other chest presses, not pull-ups', () => {
  const alts = alternativesFor('barbell_bench_press', { availableEquipment: FULL, variantIndex: INDEX })
  assert.ok(alts.length > 0)
  assert.ok(alts.every((a) => a.movement.id !== 'barbell_bench_press'))
  const top = alts[0]!.variant.contributions
  assert.ok((top.pec_mid ?? 0) >= 0.8, `top alternative should be a chest movement: ${alts[0]!.movement.id}`)
  assert.ok(!alts.slice(0, 3).some((a) => a.movement.id === 'pull_up'))
})

test('alternatives respect equipment on hand', () => {
  const bodyweight = new Set(['bodyweight', 'pull_up_bar', 'dip_station'])
  const alts = alternativesFor('barbell_bench_press', { availableEquipment: bodyweight, variantIndex: INDEX })
  for (const a of alts) {
    for (const e of a.movement.equipmentTypeIds) assert.ok(bodyweight.has(e))
  }
})

test('alternatives skip movements already in the session and excluded ones', () => {
  const alts = alternativesFor('barbell_bench_press', {
    availableEquipment: FULL, variantIndex: INDEX,
    excludeMovementIds: new Set(['db_bench_press']), excludedMovementIds: new Set(['machine_chest_press']),
  })
  assert.ok(!alts.some((a) => a.movement.id === 'db_bench_press'))
  assert.ok(!alts.some((a) => a.movement.id === 'machine_chest_press'))
})

test('each movement appears once, in its plainest configuration', () => {
  const alts = alternativesFor('cable_fly', { availableEquipment: FULL, variantIndex: INDEX, limit: 20 })
  const ids = alts.map((a) => a.movement.id)
  assert.equal(new Set(ids).size, ids.length)
})

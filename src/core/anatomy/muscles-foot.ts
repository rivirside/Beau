/** Intrinsic muscles of the foot, in the four classical plantar layers plus the
 *  dorsum. No trainableUnitId — the engine never programs these. */

import type { AnatomicalMuscle } from '../taxonomy/anatomy'
import { at, act, inn } from './helpers'

export const FOOT_MUSCLES: AnatomicalMuscle[] = [
  /* -------------------------------------------------------------- dorsum */
  {
    id: 'extensor_digitorum_brevis', name: 'Extensor digitorum brevis',
    latin: 'Musculus extensor digitorum brevis', region: 'foot', group: 'dorsum of the foot',
    origin: [at('calcaneus_dorsal')],
    insertion: [at('extensor_expansion_foot', 'digits 2–4')],
    innervation: [inn('deep_fibular', ['L5', 'S1'])],
    actions: [act('toes', 'extension', 'prime', 'digits 2–4')],
    reviewStatus: 'draft',
  },
  {
    id: 'extensor_hallucis_brevis', name: 'Extensor hallucis brevis',
    latin: 'Musculus extensor hallucis brevis', region: 'foot', group: 'dorsum of the foot',
    origin: [at('calcaneus_dorsal')], insertion: [at('hallux_proximal')],
    innervation: [inn('deep_fibular', ['L5', 'S1'])],
    actions: [act('toes', 'extension', 'prime', 'great toe')],
    reviewStatus: 'draft',
  },

  /* ------------------------------------------------------ plantar layer 1 */
  {
    id: 'abductor_hallucis', name: 'Abductor hallucis', latin: 'Musculus abductor hallucis',
    region: 'foot', group: 'plantar layer 1',
    origin: [at('calcaneal_tuberosity', 'medial process'), at('plantar_aponeurosis')],
    insertion: [at('hallux_proximal', 'medial side')],
    innervation: [inn('medial_plantar', ['L4', 'L5'])],
    actions: [act('toes', 'flexion', 'assist', 'great toe MTP joint')],
    reviewStatus: 'draft',
  },
  {
    id: 'flexor_digitorum_brevis', name: 'Flexor digitorum brevis',
    latin: 'Musculus flexor digitorum brevis', region: 'foot', group: 'plantar layer 1',
    origin: [at('calcaneal_tuberosity'), at('plantar_aponeurosis')],
    insertion: [at('phalanges_middle_foot', 'digits 2–5')],
    innervation: [inn('medial_plantar', ['L4', 'L5'])],
    actions: [act('toes', 'flexion', 'prime', 'PIP joints, digits 2–5')],
    reviewStatus: 'draft',
  },
  {
    id: 'abductor_digiti_minimi_pedis', name: 'Abductor digiti minimi (foot)',
    latin: 'Musculus abductor digiti minimi pedis', region: 'foot', group: 'plantar layer 1',
    origin: [at('calcaneal_tuberosity', 'lateral process'), at('plantar_aponeurosis')],
    insertion: [at('phalanges_proximal_foot', 'little toe, lateral side')],
    innervation: [inn('lateral_plantar', ['S1', 'S2'])],
    actions: [act('toes', 'flexion', 'assist', 'little toe')],
    reviewStatus: 'draft',
  },

  /* ------------------------------------------------------ plantar layer 2 */
  {
    id: 'quadratus_plantae', name: 'Quadratus plantae', latin: 'Musculus quadratus plantae',
    region: 'foot', group: 'plantar layer 2',
    origin: [at('calcaneal_tuberosity', 'medial and lateral borders')],
    insertion: [at('fdl_tendon')],
    innervation: [inn('lateral_plantar', ['S1', 'S2'])],
    actions: [act('toes', 'flexion', 'assist', 'corrects the oblique pull of FDL')],
    notes: 'Straightens the line of pull of flexor digitorum longus — it has no bony insertion.',
    reviewStatus: 'draft',
  },
  {
    id: 'lumbricals_foot', name: 'Lumbricals of the foot', latin: 'Musculi lumbricales pedis',
    region: 'foot', group: 'plantar layer 2',
    origin: [at('fdl_tendon')],
    insertion: [at('extensor_expansion_foot', 'digits 2–5, medial side')],
    innervation: [inn('medial_plantar', ['L4', 'L5'], '1st'),
                  inn('lateral_plantar', ['S1', 'S2'], '2nd–4th')],
    actions: [act('toes', 'flexion', 'prime', 'MTP joints'),
              act('toes', 'extension', 'prime', 'IP joints')],
    reviewStatus: 'draft',
  },

  /* ------------------------------------------------------ plantar layer 3 */
  {
    id: 'flexor_hallucis_brevis', name: 'Flexor hallucis brevis',
    latin: 'Musculus flexor hallucis brevis', region: 'foot', group: 'plantar layer 3',
    origin: [at('cuboid_plantar'), at('lateral_cuneiform')],
    insertion: [at('hallux_proximal', 'via two heads with sesamoids')],
    innervation: [inn('medial_plantar', ['L4', 'L5'])],
    actions: [act('toes', 'flexion', 'prime', 'great toe MTP joint')],
    reviewStatus: 'draft',
  },
  {
    id: 'adductor_hallucis', name: 'Adductor hallucis', latin: 'Musculus adductor hallucis',
    region: 'foot', group: 'plantar layer 3',
    origin: [at('metatarsals_2_4_base', 'oblique head'),
             at('plantar_mtp_ligaments', 'transverse head')],
    insertion: [at('hallux_proximal', 'lateral side')],
    innervation: [inn('lateral_plantar', ['S1', 'S2'])],
    actions: [act('toes', 'flexion', 'assist', 'great toe'),
              act('toes', 'flexion', 'stabilize', 'supports the transverse arch')],
    reviewStatus: 'draft',
  },
  {
    id: 'flexor_digiti_minimi_brevis_pedis', name: 'Flexor digiti minimi brevis (foot)',
    latin: 'Musculus flexor digiti minimi brevis pedis', region: 'foot', group: 'plantar layer 3',
    origin: [at('metatarsal_5_base')],
    insertion: [at('phalanges_proximal_foot', 'little toe')],
    innervation: [inn('lateral_plantar', ['S1', 'S2'])],
    actions: [act('toes', 'flexion', 'prime', 'little toe MTP joint')],
    reviewStatus: 'draft',
  },

  /* ------------------------------------------------------ plantar layer 4 */
  {
    id: 'dorsal_interossei_foot', name: 'Dorsal interossei of the foot',
    latin: 'Musculi interossei dorsales pedis', region: 'foot', group: 'plantar layer 4',
    origin: [at('metatarsal_shafts', 'adjacent sides, bipennate')],
    insertion: [at('phalanges_proximal_foot', 'digits 2–4')],
    innervation: [inn('lateral_plantar', ['S1', 'S2'])],
    actions: [act('toes', 'abduction')],
    notes: 'Four of them; abduction is referenced to the second toe, not the midline.',
    reviewStatus: 'draft',
  },
  {
    id: 'plantar_interossei', name: 'Plantar interossei', latin: 'Musculi interossei plantares',
    region: 'foot', group: 'plantar layer 4',
    origin: [at('metatarsal_shafts', 'digits 3–5, unipennate')],
    insertion: [at('phalanges_proximal_foot', 'digits 3–5, medial side')],
    innervation: [inn('lateral_plantar', ['S1', 'S2'])],
    actions: [act('toes', 'adduction')],
    notes: 'Three of them.',
    reviewStatus: 'draft',
  },
]

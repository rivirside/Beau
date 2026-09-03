/** The complete adult skeleton. Paired bones are stored once with count 2, so
 *  these ~90 named entries add up to the standard 206.
 *
 *  Split out from landmarks because bones are now a subject in their own right:
 *  a medical student needs to name them, classify them, and know what each
 *  articulates with. See docs/anatomy-model.md §2 */

import type { Bone } from '../taxonomy/anatomy'

const b = (
  id: string, name: string, region: Bone['region'], division: Bone['division'],
  cls: Bone['class'], paired: boolean,
  extra: Partial<Pick<Bone, 'latin' | 'articulatesWith' | 'notes' | 'count'>> = {},
): Bone => ({
  id, name, region, division, class: cls, paired,
  count: extra.count ?? (paired ? 2 : 1),
  ...(extra.latin ? { latin: extra.latin } : {}),
  ...(extra.articulatesWith ? { articulatesWith: extra.articulatesWith } : {}),
  ...(extra.notes ? { notes: extra.notes } : {}),
})

export const BONES: Bone[] = [
  /* ------------------------------------------------- cranium (8) */
  b('frontal', 'Frontal bone', 'head', 'axial', 'flat', false,
    { latin: 'Os frontale', articulatesWith: ['parietal', 'sphenoid', 'ethmoid', 'nasal', 'maxilla', 'lacrimal', 'zygomatic'] }),
  b('parietal', 'Parietal bone', 'head', 'axial', 'flat', true,
    { latin: 'Os parietale', articulatesWith: ['frontal', 'occipital', 'temporal', 'sphenoid', 'parietal'] }),
  b('temporal', 'Temporal bone', 'head', 'axial', 'irregular', true,
    { latin: 'Os temporale', articulatesWith: ['parietal', 'occipital', 'sphenoid', 'zygomatic', 'mandible'],
      notes: 'Houses the middle and inner ear; the mandible articulates here at the TMJ.' }),
  b('occipital', 'Occipital bone', 'head', 'axial', 'flat', false,
    { latin: 'Os occipitale', articulatesWith: ['parietal', 'temporal', 'sphenoid', 'atlas'],
      notes: 'Contains the foramen magnum.' }),
  b('sphenoid', 'Sphenoid bone', 'head', 'axial', 'irregular', false,
    { latin: 'Os sphenoidale', articulatesWith: ['frontal', 'parietal', 'temporal', 'occipital', 'ethmoid', 'vomer', 'zygomatic', 'palatine', 'maxilla'],
      notes: 'Articulates with every other cranial bone; the sella turcica holds the pituitary.' }),
  b('ethmoid', 'Ethmoid bone', 'head', 'axial', 'irregular', false,
    { latin: 'Os ethmoidale', articulatesWith: ['frontal', 'sphenoid', 'nasal', 'lacrimal', 'maxilla', 'palatine', 'vomer', 'inferior_nasal_concha'] }),

  /* --------------------------------------------- facial bones (14) */
  b('maxilla', 'Maxilla', 'head', 'axial', 'irregular', true,
    { latin: 'Maxilla', articulatesWith: ['frontal', 'ethmoid', 'nasal', 'lacrimal', 'zygomatic', 'palatine', 'vomer', 'inferior_nasal_concha', 'maxilla'] }),
  b('zygomatic', 'Zygomatic bone', 'head', 'axial', 'irregular', true,
    { latin: 'Os zygomaticum', articulatesWith: ['frontal', 'temporal', 'sphenoid', 'maxilla'] }),
  b('nasal', 'Nasal bone', 'head', 'axial', 'flat', true,
    { latin: 'Os nasale', articulatesWith: ['frontal', 'ethmoid', 'maxilla', 'nasal'] }),
  b('lacrimal', 'Lacrimal bone', 'head', 'axial', 'flat', true,
    { latin: 'Os lacrimale', articulatesWith: ['frontal', 'ethmoid', 'maxilla', 'inferior_nasal_concha'],
      notes: 'The smallest bone of the face.' }),
  b('palatine', 'Palatine bone', 'head', 'axial', 'irregular', true,
    { latin: 'Os palatinum', articulatesWith: ['sphenoid', 'ethmoid', 'maxilla', 'vomer', 'inferior_nasal_concha', 'palatine'] }),
  b('inferior_nasal_concha', 'Inferior nasal concha', 'head', 'axial', 'irregular', true,
    { latin: 'Concha nasalis inferior', articulatesWith: ['ethmoid', 'maxilla', 'lacrimal', 'palatine'] }),
  b('vomer', 'Vomer', 'head', 'axial', 'flat', false,
    { latin: 'Vomer', articulatesWith: ['sphenoid', 'ethmoid', 'maxilla', 'palatine'] }),
  b('mandible', 'Mandible', 'head', 'axial', 'irregular', false,
    { latin: 'Mandibula', articulatesWith: ['temporal'],
      notes: 'The only freely movable bone of the skull.' }),

  /* --------------------------------------- ossicles (6) and hyoid (1) */
  b('malleus', 'Malleus', 'head', 'axial', 'irregular', true,
    { latin: 'Malleus', articulatesWith: ['incus'] }),
  b('incus', 'Incus', 'head', 'axial', 'irregular', true,
    { latin: 'Incus', articulatesWith: ['malleus', 'stapes'] }),
  b('stapes', 'Stapes', 'head', 'axial', 'irregular', true,
    { latin: 'Stapes', articulatesWith: ['incus'], notes: 'The smallest bone in the body.' }),
  b('hyoid', 'Hyoid bone', 'neck', 'axial', 'irregular', false,
    { latin: 'Os hyoideum', notes: 'The only bone articulating with no other bone.' }),

  /* ------------------------------------------- vertebral column (26) */
  b('atlas', 'Atlas (C1)', 'neck', 'axial', 'irregular', false,
    { latin: 'Atlas', articulatesWith: ['occipital', 'axis'], notes: 'No vertebral body; carries the skull.' }),
  b('axis', 'Axis (C2)', 'neck', 'axial', 'irregular', false,
    { latin: 'Axis', articulatesWith: ['atlas', 'cervical_vertebra'], notes: 'Bears the dens, the pivot for head rotation.' }),
  b('cervical_vertebra', 'Cervical vertebrae (C3–C7)', 'neck', 'axial', 'irregular', false,
    { latin: 'Vertebrae cervicales', count: 5, articulatesWith: ['axis', 'thoracic_vertebra'],
      notes: 'Identified by transverse foramina; C7 is the vertebra prominens.' }),
  b('thoracic_vertebra', 'Thoracic vertebrae (T1–T12)', 'back', 'axial', 'irregular', false,
    { latin: 'Vertebrae thoracicae', count: 12, articulatesWith: ['cervical_vertebra', 'lumbar_vertebra', 'rib'],
      notes: 'The only vertebrae articulating with ribs.' }),
  b('lumbar_vertebra', 'Lumbar vertebrae (L1–L5)', 'back', 'axial', 'irregular', false,
    { latin: 'Vertebrae lumbales', count: 5, articulatesWith: ['thoracic_vertebra', 'sacrum'],
      notes: 'Largest vertebral bodies; no transverse foramina, no costal facets.' }),
  b('sacrum', 'Sacrum', 'pelvis', 'axial', 'irregular', false,
    { latin: 'Os sacrum', articulatesWith: ['lumbar_vertebra', 'coccyx', 'hip_bone'],
      notes: 'Five fused vertebrae.' }),
  b('coccyx', 'Coccyx', 'pelvis', 'axial', 'irregular', false,
    { latin: 'Os coccygis', articulatesWith: ['sacrum'], notes: 'Three to five fused vertebrae.' }),

  /* ------------------------------------------------ thoracic cage (25) */
  b('rib', 'Ribs', 'thorax', 'axial', 'flat', false,
    { latin: 'Costae', count: 24, articulatesWith: ['thoracic_vertebra', 'sternum'],
      notes: '1–7 true, 8–10 false, 11–12 floating.' }),
  b('sternum', 'Sternum', 'thorax', 'axial', 'flat', false,
    { latin: 'Sternum', articulatesWith: ['clavicle', 'rib'],
      notes: 'Manubrium, body and xiphoid process.' }),

  /* --------------------------------------------- pectoral girdle (4) */
  b('clavicle', 'Clavicle', 'shoulder', 'appendicular', 'long', true,
    { latin: 'Clavicula', articulatesWith: ['sternum', 'scapula'],
      notes: 'The most commonly fractured bone; the only bony link between arm and axial skeleton.' }),
  b('scapula', 'Scapula', 'shoulder', 'appendicular', 'flat', true,
    { latin: 'Scapula', articulatesWith: ['clavicle', 'humerus'] }),

  /* -------------------------------------------------- upper limb (60) */
  b('humerus', 'Humerus', 'arm', 'appendicular', 'long', true,
    { latin: 'Humerus', articulatesWith: ['scapula', 'radius', 'ulna'] }),
  b('radius', 'Radius', 'forearm', 'appendicular', 'long', true,
    { latin: 'Radius', articulatesWith: ['humerus', 'ulna', 'scaphoid', 'lunate'],
      notes: 'The lateral forearm bone; rotates over the ulna in pronation.' }),
  b('ulna', 'Ulna', 'forearm', 'appendicular', 'long', true,
    { latin: 'Ulna', articulatesWith: ['humerus', 'radius'],
      notes: 'The medial forearm bone; forms the elbow hinge via the olecranon.' }),
  // carpals (16)
  b('scaphoid', 'Scaphoid', 'hand', 'appendicular', 'short', true,
    { latin: 'Os scaphoideum', articulatesWith: ['radius', 'lunate', 'capitate', 'trapezium', 'trapezoid'],
      notes: 'Most commonly fractured carpal; retrograde blood supply risks avascular necrosis.' }),
  b('lunate', 'Lunate', 'hand', 'appendicular', 'short', true,
    { latin: 'Os lunatum', articulatesWith: ['radius', 'scaphoid', 'triquetrum', 'capitate', 'hamate'],
      notes: 'Most commonly dislocated carpal.' }),
  b('triquetrum', 'Triquetrum', 'hand', 'appendicular', 'short', true,
    { latin: 'Os triquetrum', articulatesWith: ['lunate', 'pisiform', 'hamate'] }),
  b('pisiform', 'Pisiform', 'hand', 'appendicular', 'sesamoid', true,
    { latin: 'Os pisiforme', articulatesWith: ['triquetrum'],
      notes: 'A sesamoid in the flexor carpi ulnaris tendon.' }),
  b('trapezium', 'Trapezium', 'hand', 'appendicular', 'short', true,
    { latin: 'Os trapezium', articulatesWith: ['scaphoid', 'trapezoid', 'metacarpal'],
      notes: 'Its saddle joint with the first metacarpal gives the thumb its opposition.' }),
  b('trapezoid', 'Trapezoid', 'hand', 'appendicular', 'short', true,
    { latin: 'Os trapezoideum', articulatesWith: ['scaphoid', 'trapezium', 'capitate', 'metacarpal'] }),
  b('capitate', 'Capitate', 'hand', 'appendicular', 'short', true,
    { latin: 'Os capitatum', articulatesWith: ['scaphoid', 'lunate', 'trapezoid', 'hamate', 'metacarpal'],
      notes: 'The largest carpal bone.' }),
  b('hamate', 'Hamate', 'hand', 'appendicular', 'short', true,
    { latin: 'Os hamatum', articulatesWith: ['lunate', 'triquetrum', 'capitate', 'metacarpal'],
      notes: 'Its hook forms the ulnar side of the carpal tunnel and Guyon\'s canal.' }),
  b('metacarpal', 'Metacarpals', 'hand', 'appendicular', 'long', false,
    { latin: 'Ossa metacarpi', count: 10, articulatesWith: ['trapezium', 'trapezoid', 'capitate', 'hamate', 'phalanx_hand'] }),
  b('phalanx_hand', 'Phalanges of the hand', 'hand', 'appendicular', 'long', false,
    { latin: 'Phalanges manus', count: 28, articulatesWith: ['metacarpal'],
      notes: 'Three per finger, two in the thumb.' }),

  /* ---------------------------------------------- pelvic girdle (2) */
  b('hip_bone', 'Hip bone (os coxae)', 'pelvis', 'appendicular', 'irregular', true,
    { latin: 'Os coxae', articulatesWith: ['sacrum', 'femur', 'hip_bone'],
      notes: 'Ilium, ischium and pubis, fused at the acetabulum.' }),

  /* -------------------------------------------------- lower limb (60) */
  b('femur', 'Femur', 'thigh', 'appendicular', 'long', true,
    { latin: 'Femur', articulatesWith: ['hip_bone', 'patella', 'tibia'],
      notes: 'The longest and strongest bone in the body.' }),
  b('patella', 'Patella', 'thigh', 'appendicular', 'sesamoid', true,
    { latin: 'Patella', articulatesWith: ['femur'],
      notes: 'The largest sesamoid; increases the quadriceps\' moment arm.' }),
  b('tibia', 'Tibia', 'leg', 'appendicular', 'long', true,
    { latin: 'Tibia', articulatesWith: ['femur', 'patella', 'fibula', 'talus'],
      notes: 'The weight-bearing bone of the leg.' }),
  b('fibula', 'Fibula', 'leg', 'appendicular', 'long', true,
    { latin: 'Fibula', articulatesWith: ['tibia', 'talus'],
      notes: 'Bears almost no weight; largely a muscle attachment and ankle stabiliser.' }),
  // tarsals (14)
  b('talus', 'Talus', 'foot', 'appendicular', 'short', true,
    { latin: 'Talus', articulatesWith: ['tibia', 'fibula', 'calcaneus', 'navicular'],
      notes: 'No muscle attaches to it; transmits body weight to the foot.' }),
  b('calcaneus', 'Calcaneus', 'foot', 'appendicular', 'short', true,
    { latin: 'Calcaneus', articulatesWith: ['talus', 'cuboid'],
      notes: 'The largest tarsal; receives the calcaneal tendon.' }),
  b('navicular', 'Navicular', 'foot', 'appendicular', 'short', true,
    { latin: 'Os naviculare', articulatesWith: ['talus', 'cuneiform', 'cuboid'] }),
  b('cuboid', 'Cuboid', 'foot', 'appendicular', 'short', true,
    { latin: 'Os cuboideum', articulatesWith: ['calcaneus', 'navicular', 'cuneiform', 'metatarsal'] }),
  b('cuneiform', 'Cuneiforms (medial, intermediate, lateral)', 'foot', 'appendicular', 'short', false,
    { latin: 'Ossa cuneiformia', count: 6, articulatesWith: ['navicular', 'cuboid', 'metatarsal'] }),
  b('metatarsal', 'Metatarsals', 'foot', 'appendicular', 'long', false,
    { latin: 'Ossa metatarsi', count: 10, articulatesWith: ['cuneiform', 'cuboid', 'phalanx_foot'],
      notes: 'The fifth metatarsal tuberosity is a common avulsion fracture site.' }),
  b('phalanx_foot', 'Phalanges of the foot', 'foot', 'appendicular', 'long', false,
    { latin: 'Phalanges pedis', count: 28, articulatesWith: ['metatarsal'] }),
]

/** Should be 206 in a standard adult skeleton. Asserted in validateGraph. */
export const TOTAL_BONE_COUNT = BONES.reduce((n, bone) => n + bone.count, 0)

export const AXIAL_BONE_COUNT = BONES
  .filter((x) => x.division === 'axial').reduce((n, bone) => n + bone.count, 0)

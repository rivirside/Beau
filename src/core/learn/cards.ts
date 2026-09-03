/** Card generation. Every card is a traversal of the anatomy graph, so adding a
 *  muscle adds its cards automatically and nothing is hand-authored.
 *  See docs/anatomy-model.md §4 */

import type { AnatomicalMuscle, TrainableUnitId } from '../taxonomy/anatomy'
import { MUSCLE_LIBRARY, LANDMARKS, NERVES, JOINTS, BONES } from '../anatomy'
import {
  attachmentsAt, musclesForAction, musclesInnervatedBy, antagonistsOf, landmarkById, nerveById,
  boneById, landmarksOnBone, musclesOnBone,
} from '../anatomy/graph'

export const CARD_KINDS = [
  'muscle_origin', 'muscle_insertion', 'muscle_innervation', 'muscle_actions',
  'muscle_function', 'action_muscles', 'landmark_attachments', 'nerve_muscles',
  'muscle_antagonist', 'muscle_latin',
  'bone_articulations', 'bone_landmarks', 'bone_class', 'landmark_bone',
] as const
export type CardKind = (typeof CARD_KINDS)[number]

export interface Card {
  /** Deterministic, e.g. `muscle_origin:biceps_brachii`, so review history
   *  survives regenerating the entire deck. Same reasoning as variant IDs. */
  id: string
  kind: CardKind
  front: string
  back: string[]
  /** Engine muscles this card relates to, for session-linked decks. */
  trainableUnitIds: TrainableUnitId[]
  /** Anything below 'verified' should be visibly marked in the UI. §5 */
  reviewStatus: AnatomicalMuscle['reviewStatus']
  tags: string[]
}

const describe = (a: { landmarkId: string; detail?: string }) => {
  const name = landmarkById(a.landmarkId)?.name ?? a.landmarkId
  return a.detail ? `${name} (${a.detail})` : name
}

const unitsOf = (m: AnatomicalMuscle): TrainableUnitId[] => {
  const ids = [m.trainableUnitId, ...(m.heads ?? []).map((h) => h.trainableUnitId)]
  return [...new Set(ids.filter((x): x is TrainableUnitId => x !== undefined))]
}

const actionText = (a: { action: string; joint: string; role: string; qualifier?: string }) => {
  const joint = JOINTS.find((j) => j.id === a.joint)?.name ?? a.joint
  const action = a.action.replace(/_/g, ' ')
  const role = a.role === 'prime' ? '' : ` [${a.role}]`
  return `${action} at the ${joint}${role}${a.qualifier ? ` — ${a.qualifier}` : ''}`
}

export function generateCards(library = MUSCLE_LIBRARY): Card[] {
  const cards: Card[] = []

  for (const m of library) {
    const base = { trainableUnitIds: unitsOf(m), reviewStatus: m.reviewStatus }
    const tags = [m.region, ...(m.group ? [m.group] : [])]

    cards.push({
      ...base, tags, id: `muscle_origin:${m.id}`, kind: 'muscle_origin',
      front: `Origin of **${m.name}**?`, back: m.origin.map(describe),
    })
    cards.push({
      ...base, tags, id: `muscle_insertion:${m.id}`, kind: 'muscle_insertion',
      front: `Insertion of **${m.name}**?`, back: m.insertion.map(describe),
    })
    cards.push({
      ...base, tags, id: `muscle_innervation:${m.id}`, kind: 'muscle_innervation',
      front: `Innervation of **${m.name}**?`,
      back: m.innervation.map((i) => {
        const nerve = nerveById(i.nerveId)?.name ?? i.nerveId
        return `${nerve} (${i.roots.join(', ')})${i.note ? ` — ${i.note}` : ''}`
      }),
    })
    cards.push({
      ...base, tags, id: `muscle_actions:${m.id}`, kind: 'muscle_actions',
      front: `Actions of **${m.name}**?`, back: m.actions.map(actionText),
    })
    cards.push({
      ...base, tags, id: `muscle_latin:${m.id}`, kind: 'muscle_latin',
      front: `Anatomical name for **${m.name}**?`, back: [m.latin],
    })

    // Muscles whose work is not a joint movement — facial expression, the
    // diaphragm, the pelvic floor — are asked about differently.
    if (m.functions?.length) {
      cards.push({
        ...base, tags, id: `muscle_function:${m.id}`, kind: 'muscle_function',
        front: `What does **${m.name}** do?`, back: m.functions,
      })
    }

    const antagonists = antagonistsOf(m, library)
    if (antagonists.length > 0) {
      cards.push({
        ...base, tags, id: `muscle_antagonist:${m.id}`, kind: 'muscle_antagonist',
        front: `Name an antagonist of **${m.name}**.`,
        back: antagonists.map((a) => a.name),
      })
    }
  }

  // (joint, action) → muscles. Only where at least two prime movers exist,
  // otherwise the card is just the insertion card in reverse.
  for (const joint of JOINTS) {
    for (const action of joint.actions) {
      const movers = musclesForAction(joint.id, action, {}, library)
      if (movers.length < 2) continue
      cards.push({
        id: `action_muscles:${joint.id}:${action}`, kind: 'action_muscles',
        front: `Which muscles produce **${action.replace(/_/g, ' ')}** at the ${joint.name}?`,
        back: movers.map((m) => m.name),
        trainableUnitIds: [...new Set(movers.flatMap(unitsOf))],
        reviewStatus: 'draft', tags: [joint.id],
      })
    }
  }

  // Landmark → everything attaching there. The card type that is genuinely hard
  // and that nobody wants to author by hand.
  for (const landmark of LANDMARKS) {
    const { origins, insertions } = attachmentsAt(landmark.id, library)
    const all = [...origins, ...insertions]
    if (all.length < 2) continue
    cards.push({
      id: `landmark_attachments:${landmark.id}`, kind: 'landmark_attachments',
      front: `Which muscles attach to the **${landmark.name}**?`,
      back: [
        ...origins.map((m) => `${m.name} (origin)`),
        ...insertions.map((m) => `${m.name} (insertion)`),
      ],
      trainableUnitIds: [...new Set(all.flatMap(unitsOf))],
      reviewStatus: 'draft', tags: ['attachments'],
    })
  }

  // Bones became a subject of their own once the full skeleton went in.
  for (const bone of BONES) {
    const units = [...new Set(musclesOnBone(bone.id, library).flatMap(unitsOf))]

    if (bone.articulatesWith?.length) {
      cards.push({
        id: `bone_articulations:${bone.id}`, kind: 'bone_articulations',
        front: `What does the **${bone.name}** articulate with?`,
        back: bone.articulatesWith.map((id) => boneById(id)?.name ?? id),
        trainableUnitIds: units, reviewStatus: 'draft', tags: ['skeleton', bone.region],
      })
    }

    const features = landmarksOnBone(bone.id)
    if (features.length >= 3) {
      cards.push({
        id: `bone_landmarks:${bone.id}`, kind: 'bone_landmarks',
        front: `Name the bony landmarks of the **${bone.name}**.`,
        back: features.map((l) => l.name),
        trainableUnitIds: units, reviewStatus: 'draft', tags: ['skeleton', bone.region],
      })
    }

    cards.push({
      id: `bone_class:${bone.id}`, kind: 'bone_class',
      front: `Classify the **${bone.name}**: division and bone class?`,
      back: [`${bone.division}, ${bone.class} bone`,
             bone.paired ? 'Paired' : `${bone.count === 1 ? 'Single' : `${bone.count} in total`}`],
      trainableUnitIds: units, reviewStatus: 'draft', tags: ['skeleton', bone.region],
    })
  }

  // Landmark → its bone. The reverse of the attachment card, and the one that
  // actually gets asked in a practical exam with a dry skeleton on the bench.
  for (const landmark of LANDMARKS) {
    if (!landmark.boneId) continue
    cards.push({
      id: `landmark_bone:${landmark.id}`, kind: 'landmark_bone',
      front: `Which bone bears the **${landmark.name}**?`,
      back: [boneById(landmark.boneId)?.name ?? landmark.boneId],
      trainableUnitIds: [], reviewStatus: 'draft', tags: ['skeleton'],
    })
  }

  for (const nerve of NERVES) {
    const supplied = musclesInnervatedBy(nerve.id, {}, library)
    if (supplied.length < 2) continue
    cards.push({
      id: `nerve_muscles:${nerve.id}`, kind: 'nerve_muscles',
      front: `Which muscles are innervated by the **${nerve.name}**?`,
      back: supplied.map((m) => m.name),
      trainableUnitIds: [...new Set(supplied.flatMap(unitsOf))],
      reviewStatus: 'draft', tags: ['innervation', nerve.plexus],
    })
  }

  return cards
}

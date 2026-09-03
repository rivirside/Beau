# Anatomy model and learning mode

Two features share one data structure: the engine needs to know what a set
worked, and the learning mode needs to teach what that muscle is. Built as one
graph, they reinforce each other. Built separately, they rot apart.

The library is scoped for a medical or allied-health student, not just a lifter:
the complete 206-bone skeleton, and muscles down to the third palmar
interosseous and the superior oblique. That scope costs the engine nothing,
because of the layering below.

## 1. The layering problem

The instinct to "add way more muscles" is right for the library and wrong for
the engine, so these have to be different layers.

There are roughly 600 skeletal muscles. An engine that iterates over 600 of them
produces noise: fatigue math on the flexor pollicis brevis is meaningless, weekly
volume targets per lumbrical are absurd, and no exercise can be honestly
attributed at that resolution. Meanwhile a learning mode capped at 30 muscles is
not worth opening twice.

So:

```
Bone · Landmark · Joint · Nerve      the reference skeleton and wiring
      ▲
      │ attachments, innervation, actions
      │
AnatomicalMuscle   the real anatomy. 167 seeded, room for ~600.
      │            origin, insertion, innervation, actions, heads, functions
      │ trainableUnitId  (optional — this is the important part)
      ▼
TrainableUnit      what the engine reasons about. ~34.
                   fatigue, recovery, volume targets, exercise contributions
```

**`trainableUnitId` is optional, and that is what lets the library grow without
limit.** 76 of the 167 muscles have none: the intrinsic muscles of the hand and
foot, the muscles of facial expression, the extraocular muscles, the pelvic
floor. They are fully modelled, fully quizzable, and completely invisible to the
engine — `TRAINABLE_MUSCLES` filters them out, and no fatigue or generation code
ever touches them. Adding the muscles of the pharynx tomorrow changes nothing
downstream.

Many-to-one, and both directions are useful:

- **Engine → anatomy**: "you trained `pec_upper` today" resolves to the
  clavicular head of pectoralis major, which is what the learning mode quizzes.
- **Anatomy → engine**: the vastus lateralis, medialis and intermedius all map to
  `quads_vasti`, because no exercise selectively trains one and no recovery model
  should pretend otherwise.

Regions follow the same split. The library uses anatomical regions — `forearm`
and `hand` are different places, as they are in a dissection course — while the
engine keeps its gym vocabulary of `arms`. Neither has to compromise.

`TrainableUnit` is exactly the muscle vocabulary already in `taxonomy/muscles.ts`
— unchanged, and deliberately so. The anatomy layer is additive: it can grow to
600 muscles without touching a line of engine code.

## 2. The skeleton

`bones.ts` holds the complete adult skeleton: 54 named entries which, with
paired bones carrying `count: 2`, total exactly **206** — 80 axial and 126
appendicular, asserted in `validateGraph()` so the count cannot silently drift.

Each bone carries its division, its class (long, short, flat, irregular,
sesamoid), and what it articulates with. Articulations are what make bones a
subject rather than a lookup table: *"what does the scaphoid articulate with?"*
is a real exam question, and it is now a graph edge rather than a paragraph.

Landmarks hang off bones and carry a `type` — process, tuberosity, fossa,
foramen, and so on — because anatomy courses drill that vocabulary directly.
Soft-tissue attachment sites (the thoracolumbar fascia, the iliotibial band, the
interosseous membranes) have no `boneId` at all, which is honest: they are real
attachment points that belong to no bone.

## 3. Attachments as a graph, not as prose

Storing origin and insertion as free text ("supraglenoid tubercle of the
scapula") makes them printable and nothing else. Attachments instead reference
**landmark** entities on **bones**:

```ts
{ landmarkId: 'supraglenoid_tubercle', detail: 'via the long head tendon' }
```

The prose survives in `detail`. What the reference unlocks is traversal, and
traversal is what makes the learning mode good:

- *"Which muscles attach to the coracoid process?"* — short head of biceps,
  coracobrachialis, pectoralis minor. A genuinely hard, genuinely useful card
  that no one has to write by hand.
- *"Everything innervated by the musculocutaneous nerve"* — one edge walk.
- Attachment overlap explains why exercises feel related, in the same way muscle
  vector similarity explains substitution.

## 4. Actions, and why synergists are derived

A muscle's actions are `(joint, action)` pairs with a role:

```ts
actions: [
  { joint: 'glenohumeral', action: 'flexion',           role: 'prime' },
  { joint: 'glenohumeral', action: 'internal_rotation', role: 'assist' },
]
```

Muscles whose work is not a movement at a joint — facial expression, the
diaphragm, the pelvic floor, levator palpebrae — carry `functions: string[]`
instead. Keeping those out of `actions` is deliberate: the derived synergist and
antagonist logic below is defined over joints, and letting "wrinkles the
forehead" into it would quietly corrupt the derivation.

Given a table of opposing actions (flexion ↔ extension, abduction ↔ adduction,
internal ↔ external rotation), **synergists and antagonists are computed, not
stored**:

- synergists of M = muscles sharing a prime `(joint, action)` with M
- antagonists of M = muscles whose prime action is the opposite one at that joint

Same reasoning as exercise substitution earlier: a hand-maintained relationship
table is a hand-maintained lie the moment anything changes. Deriving it means the
graph cannot contradict itself, and it generates a card type — *"name an
antagonist of psoas major"* — for free.

## 5. Learning mode

### Cards are generated, not authored

Every card comes from a traversal of the graph. Ten generators over ~90 muscles
yield well over a thousand cards with no hand authoring, and adding a muscle adds
its cards automatically:

| Generator | Front → Back |
| --- | --- |
| `muscle_origin` | Muscle → its origin(s) |
| `muscle_insertion` | Muscle → its insertion(s) |
| `muscle_innervation` | Muscle → nerve and root levels |
| `muscle_actions` | Muscle → what it does, at which joints |
| `action_muscles` | (Joint, action) → the muscles that produce it |
| `landmark_attachments` | Landmark → everything attaching to it |
| `nerve_muscles` | Nerve → everything it innervates |
| `muscle_antagonist` | Muscle → an antagonist (derived) |
| `muscle_function` | Muscle → what it does, where that is not a joint action |
| `muscle_latin` | Common name ↔ Terminologia Anatomica name |
| `bone_articulations` | Bone → what it articulates with |
| `bone_landmarks` | Bone → name its features |
| `bone_class` | Bone → division and class |
| `landmark_bone` | Landmark → which bone bears it |

Fourteen generators over the current library produce **1,497 cards**, none of
them hand-authored. Bone cards inherit the trainable units of the muscles
attaching to that bone, so they can still surface in a rest-timer deck.

Card IDs are deterministic (`muscle_origin:biceps_brachii`), so review history
survives regenerating the whole deck — the same reasoning as variant IDs.

### Scheduling: FSRS, not SM-2

Use FSRS. It is what Anki itself moved to, it is open, it has a clean pure
implementation, and it needs materially fewer reviews for the same retention.
SM-2 is easier to write and worse at the only job it has. Scheduler state per
card is small and local:

```ts
{ stability, difficulty, due, reps, lapses, state, lastReview }
```

### The integration that justifies the whole thing

A rest timer is 90 to 180 seconds of dead time, eight to twenty times a session,
with the phone already in hand. That is the best spaced-repetition slot anyone
has ever been offered, and it is wasted today.

So the deck is **driven by the session**: while resting after incline dumbbell
press, you get cards about the clavicular head of pectoralis major, the anterior
deltoid, the long head of triceps. You just felt the muscle work; now you learn
where it attaches and what else it does. Encoding while the referent is
physically salient is the whole pitch.

This is the feature that makes this app not "FitBod, but private". It is a
strength app for people who want to understand what they are training —
kinesiology and PT students, coaches, and the large population of lifters who
would like to be that person. Nobody else is building it, and it costs one extra
data layer over what the engine already needed.

## 6. Accuracy

This is educational medical content, and someone may study for an exam on it.
Two guardrails in the schema:

- Every muscle carries `reviewStatus: 'draft' | 'reviewed' | 'verified'`, and the
  learning mode should visibly mark anything below `verified`.
- Every muscle carries `sources[]`, so a claim can be traced.

**The seeded data is `draft`.** It covers 167 muscles and the full skeleton at a
level standard across anatomy references, but it has not been checked against
one, and it should be before anyone studies from it. This matters more now than
it did at 86 muscles: a lifter misremembering an insertion loses nothing, and a
medical student does. Verifying the library against a standard reference
(Gray's, Moore, Kenhub) is a prerequisite for shipping the learning mode, not a
nice-to-have — and at this size it is a real piece of work, best done region by
region, promoting each from `draft` to `verified` as it is checked.

### Deferred

- **Blood supply.** `Artery` and `BloodSupply` types are declared, and arterial
  supply is a standard fourth column alongside origin, insertion and
  innervation. Not populated: partially populated data would generate cards for
  an arbitrary subset of muscles.
- **Deeper head and neck.** The tongue, pharynx, larynx and middle ear muscles
  are absent. They fit the schema unchanged.
- **Images.** The exercise photos say nothing about the pelvic floor. A muscle
  identification card type needs anatomical illustrations, and the licensing
  question there is the same one as for the data.

### On sourcing

There is no permissively licensed structured anatomy dataset. Wikipedia's muscle
infoboxes are the most complete structured source and are CC BY-SA — copyleft,
which plausibly extends share-alike to a derived database bundled in a commercial
app. Avoided deliberately. Gray's Anatomy (1918) is public domain and a fine
verification reference, but its terminology is a century stale.

Authoring the data ourselves and verifying against references keeps it
unencumbered. It is also the only option that produces the graph structure above
rather than a wall of prose.

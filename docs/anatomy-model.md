# Anatomy model and learning mode

Two features share one data structure: the engine needs to know what a set
worked, and the learning mode needs to teach what that muscle is. Built as one
graph, they reinforce each other. Built separately, they rot apart.

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
AnatomicalMuscle   the real anatomy. ~90 seeded, room for ~600.
      │            origin, insertion, innervation, actions, heads
      │ trainableUnitId
      ▼
TrainableUnit      what the engine reasons about. ~34.
                   fatigue, recovery, volume targets, exercise contributions
```

Many-to-one, and both directions are useful:

- **Engine → anatomy**: "you trained `pec_upper` today" resolves to the
  clavicular head of pectoralis major, which is what the learning mode quizzes.
- **Anatomy → engine**: the vastus lateralis, medialis and intermedius all map to
  `quads_vasti`, because no exercise selectively trains one and no recovery model
  should pretend otherwise.

`TrainableUnit` is exactly the muscle vocabulary already in `taxonomy/muscles.ts`
— unchanged, and deliberately so. The anatomy layer is additive: it can grow to
600 muscles without touching a line of engine code.

## 2. Attachments as a graph, not as prose

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

## 3. Actions, and why synergists are derived

A muscle's actions are `(joint, action)` pairs with a role:

```ts
actions: [
  { joint: 'glenohumeral', action: 'flexion',           role: 'prime' },
  { joint: 'glenohumeral', action: 'internal_rotation', role: 'assist' },
]
```

Given a table of opposing actions (flexion ↔ extension, abduction ↔ adduction,
internal ↔ external rotation), **synergists and antagonists are computed, not
stored**:

- synergists of M = muscles sharing a prime `(joint, action)` with M
- antagonists of M = muscles whose prime action is the opposite one at that joint

Same reasoning as exercise substitution earlier: a hand-maintained relationship
table is a hand-maintained lie the moment anything changes. Deriving it means the
graph cannot contradict itself, and it generates a card type — *"name an
antagonist of psoas major"* — for free.

## 4. Learning mode

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
| `muscle_locate` | Photo → name the muscle under load |
| `muscle_latin` | Common name ↔ Terminologia Anatomica name |

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

## 5. Accuracy

This is educational medical content, and someone may study for an exam on it.
Two guardrails in the schema:

- Every muscle carries `reviewStatus: 'draft' | 'reviewed' | 'verified'`, and the
  learning mode should visibly mark anything below `verified`.
- Every muscle carries `sources[]`, so a claim can be traced.

**The seeded data is `draft`.** It covers the ~90 muscles of the limbs, trunk and
neck at a level standard across anatomy references, but it has not been checked
against one, and it should be before anyone studies from it. Checking 90 entries
against a standard reference (Gray's, Moore, Kenhub) is an afternoon of work and
is a prerequisite for shipping the learning mode, not a nice-to-have.

### On sourcing

There is no permissively licensed structured anatomy dataset. Wikipedia's muscle
infoboxes are the most complete structured source and are CC BY-SA — copyleft,
which plausibly extends share-alike to a derived database bundled in a commercial
app. Avoided deliberately. Gray's Anatomy (1918) is public domain and a fine
verification reference, but its terminology is a century stale.

Authoring the data ourselves and verifying against references keeps it
unencumbered. It is also the only option that produces the graph structure above
rather than a wall of prose.

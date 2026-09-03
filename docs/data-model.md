# Data model

Working design for the training app. Everything here is on-device: no accounts,
no server, no telemetry. The prototype is a PWA (IndexedDB); the target is a
native iOS app (Core Data + CloudKit private database). The models below are
written to survive that port, so they avoid anything web-specific.

## 1. The central idea

Most exercise datasets are a flat list of strings: `"Cable Crossover"`,
`"Low Cable Crossover"`, `"Incline Cable Fly"` are three unrelated rows with
duplicated instructions. That loses the thing a recommendation engine most needs
to know: these are *the same movement at different machine settings*, and the
setting shifts which muscle does the work in a systematic, predictable way.

So we split what other datasets fuse:

```
Movement          the biomechanical pattern, and its baseline muscle contributions
  + Equipment     what applies the resistance, and how it can be loaded
  + Configuration concrete values on a set of axes (pulley height, bench angle, grip…)
  = Variant       a resolved, loggable, prescribable exercise
```

A `Variant` is what you log against and what progression tracks. It is derived,
not hand-authored: one `Movement` plus its axes generates every sensible variant.

### Why this is worth the extra layer

- **Muscle emphasis becomes computable.** A cable fly from a high pulley biases
  the lower/sternal pec; from a low pulley it biases the clavicular (upper) pec.
  Expressed as multipliers on the movement's base contributions, the engine can
  answer "I need upper chest today" by *searching configurations*, not by hoping
  someone named an exercise well.
- **Equipment gating is honest.** You can only be prescribed a rope pushdown if
  you own a rope. Attachments, bench angle ranges, and pulley positions are
  properties of your gym, not of the exercise.
- **Load suggestions can be achievable.** Loading is a property of the equipment
  instance (5 lb dumbbell jumps, a 10 lb machine stack with a 5 lb add-on,
  plate math off a 45 lb bar), so a suggested weight is always one you can
  actually set.
- **Substitution falls out for free.** Two variants are interchangeable when
  their resolved contribution vectors are close. No hand-maintained "similar
  exercises" table.

## 2. Muscles

Coarse tags (`chest`, `shoulders`, `back`) are too blunt to program against —
bench press already hammers the front delt, so "shoulders are fresh" is a lie
that a 17-muscle vocabulary cannot catch. We resolve at the head level, but only
where a *commonly programmed* choice actually changes the ratio.

| Region | Muscles |
| --- | --- |
| chest | `pec_upper`, `pec_mid`, `pec_lower` |
| back | `lats`, `teres_major`, `traps_upper`, `traps_mid`, `traps_lower`, `rhomboids`, `erectors` |
| shoulders | `delt_front`, `delt_lateral`, `delt_rear`, `rotator_cuff` |
| arms | `biceps_long`, `biceps_short`, `brachialis`, `brachioradialis`, `triceps_long`, `triceps_lateral`, `triceps_medial`, `forearm_flexors`, `forearm_extensors` |
| legs | `quads_rf`, `quads_vasti`, `hamstrings`, `glute_max`, `glute_med_min`, `adductors`, `hip_flexors`, `calves_gastroc`, `calves_soleus`, `tibialis_ant` |
| core | `rectus_abdominis`, `obliques` |
| neck | `neck` |

Splits we deliberately **kept** (each is driven by an everyday programming choice):
pec by incline angle; delts by press vs. raise vs. rear fly; biceps long/short by
shoulder position (incline curl vs. preacher); triceps long head by overhead
position; quads rectus femoris by hip angle; calves by knee angle; traps by
scapular vector; glutes by abduction.

Splits we deliberately **collapsed**: hamstring heads (the meaningful distinction
is knee-flexion vs. hip-hinge, which the *movement pattern* already captures, not
the muscle); the three vasti (never selectively trained).

The UI and weekly volume targets aggregate back up to `region`. The engine works
at muscle resolution.

## 3. Configuration axes

An axis is a dimension along which a movement's setup can vary. The axis
vocabulary is global; which axes apply, which values are legal, and what each
value *does* are properties of the movement.

| Axis | Values |
| --- | --- |
| `pulley_height` | `floor`, `low`, `mid`, `chest`, `high`, `overhead` |
| `bench_angle` | `decline`, `flat`, `incline_low` (15–30°), `incline_high` (45–60°), `upright` (75–90°) |
| `grip_width` | `narrow`, `shoulder`, `wide` |
| `grip_orientation` | `pronated`, `supinated`, `neutral`, `mixed`, `rotating` |
| `attachment` | `rope`, `straight_bar`, `ez_bar`, `lat_bar`, `v_bar`, `d_handle`, `single_d`, `ankle_strap`, `belt`, `none` |
| `stance` | `narrow`, `hip`, `shoulder`, `wide`, `staggered`, `split` |
| `body_position` | `standing`, `seated`, `lying`, `prone`, `bent_over`, `kneeling`, `half_kneeling` |
| `laterality` | `bilateral`, `unilateral`, `alternating` |
| `rom_bias` | `full`, `lengthened_partial`, `shortened_partial` |

**Modifiers are movement-scoped, never global.** `pulley_height: high` means
something completely different for a cable fly than for a triceps pushdown, so
the multiplier table lives on the movement:

```ts
// cable_fly
baseContributions: { pec_mid: 1.0, pec_lower: 0.6, pec_upper: 0.45, delt_front: 0.3, biceps_short: 0.1 }
axes: [{
  axis: 'pulley_height',
  values: ['low', 'mid', 'high'],
  default: 'mid',
  modifiers: {
    high: { pec_lower: 1.5, pec_upper: 0.5 },   // high-to-low fly → lower pec
    low:  { pec_upper: 1.6, pec_lower: 0.5 },   // low-to-high fly → upper pec
  },
}]
```

Resolution multiplies the base vector by every selected axis value's modifiers.
The result is **not renormalized** — total magnitude carries real information
about how much work the movement does.

## 4. Equipment

Two layers, and keeping them apart is what makes the gym profile work.

**`EquipmentType`** — catalog data, ships in the bundle. What a cable tower *is*,
which axes it exposes, how it is loaded in general.

**`GymEquipment`** — the user's instance. Which gym, whether they have it, the
*actual* increments on it, which attachments they own, the bench's real angle
range. This is what gates prescription and quantizes load.

### Loading models

The detail that decides whether suggested weights feel right or stupid:

```ts
type LoadingModel =
  | { kind: 'plate_loaded'; barKg: number; platePairsKg: number[]; collarsKg?: number }
  | { kind: 'selectorized'; stopsKg: number[]; addOnKg?: number[] }   // pin stack + half-plate
  | { kind: 'fixed_set'; weightsKg: number[] }                        // dumbbell / kettlebell rack
  | { kind: 'bodyweight'; canAddLoad: boolean; canAssist: boolean }
  | { kind: 'band'; levels: { id: string; label: string; approxKg: number }[] }
  | { kind: 'none' }
```

`resolveLoad(model, targetKg)` returns the nearest achievable weight plus a
human display ("2×45 + 1×10 per side", "pin 7 + 5 lb add-on"). Progression always
proposes an achievable number, never `47.5 lb` on a rack that jumps by 5.

## 5. Variants and identity

A variant's ID is **deterministic and human-readable**, derived from its movement
and its non-default axis values:

```
cable_fly@pulley_height:high|attachment:d_handle
db_press@bench_angle:incline_low|grip_orientation:neutral
```

This matters more than it looks. History keys on variant ID, so the ID must
survive a catalog rebuild, be diffable in an export file, and be recognizable
when you are reading your own JSON in two years. A hash would satisfy the first
requirement and fail the other two.

## 6. Logging

```ts
interface SetLog {
  id: string
  variantId: string
  performedAt: string          // ISO 8601, always with offset
  setIndex: number
  kind: 'warmup' | 'working' | 'backoff' | 'amrap' | 'drop' | 'myorep'
  weightKg: number | null      // null for unloaded bodyweight
  addedWeightKg?: number       // weighted dips/pull-ups; negative = assisted
  reps: number
  rir?: number                 // reps in reserve; the effort signal the engine needs
  restSecBefore?: number
  equipmentInstanceId?: string // which gym, so load quantization stays truthful
  notes?: string
}
```

Weight is stored canonically in **kilograms** with the entered unit recorded
alongside, so an lb→kg→lb round trip displays `135`, not `134.9`.

`rir` is optional but it is the single highest-value field in the schema — a set
taken to failure and a set with four reps left produce very different fatigue
and should not look identical. The logging UI should make it one tap.

## 7. Fatigue and recovery

Per muscle, stimulus accumulates from each set and decays exponentially:

```
stimulus(set, m) = contribution(variant, m) × reps × effectiveLoadKg × effort(rir)
F(m, t)          = Σ stimulus(set, m) · exp(-ln2 · (t − t_set) / halfLife(m))
freshness(m, t)  = clamp01(1 − F(m, t) / capacity(m))
```

- `halfLife(m)` is per-muscle: ~36 h for calves and forearms, ~60–72 h for
  quads, glutes, lats.
- `capacity(m)` is **personal and rolling** — a trailing 28-day baseline of that
  muscle's stimulus — so the numbers are unitless and self-calibrating rather
  than depending on absolute strength.

Deliberately a transparent rules model, not ML. It is testable, it behaves the
same for the same inputs, and it can *explain itself* — "chest is 62% recovered,
18 hard sets two days ago" — which is exactly the kind of legibility the privacy
positioning implies. All constants live in one tunable file.

## 8. Progression

Per variant, tracked independently (incline dumbbell press at 30° is not flat
dumbbell press):

- **e1RM** from the best set, RIR-adjusted: treat `reps + rir` as reps-to-failure,
  then Epley. Smoothed across sessions so one good day does not spike the target.
- **Double progression**: hit the top of the rep range on every working set at or
  below target RIR → add the smallest increment the equipment allows. Otherwise
  hold.
- **Stall → deload**: two or three sessions without progress → drop ~10% and
  build back.

## 9. Generation

Greedy scoring, deterministic, fully offline:

1. Compute today's **need** per muscle: weekly volume debt against target,
   weighted by current freshness.
2. Filter candidate variants by available equipment, owned attachments, and any
   user exclusions (injuries, dislikes).
3. Score each: `Σ need(m) × contribution(m)`, minus penalties for repeating
   recent movements, for loading already-fatigued non-target muscles, and for
   exceeding the session's systemic/axial load budget.
4. Pick the best, subtract the need it satisfies, repeat until the time or
   volume budget is met.
5. Fill in sets, reps and load from each variant's progression state.

## 10. Storage, versioning and export

- **Prototype**: IndexedDB, one store per entity, `schemaVersion` on the database
  with an explicit migration chain from version 1.
- **Native**: Core Data with `NSPersistentCloudKitContainer` (private database).
  More mature migration story than SwiftData, and the UI can still be SwiftUI.
- **Export is the canonical interchange format** — a single versioned JSON
  document containing profile, gyms, custom movements, and every set ever logged.
  Because this prototype is a real training log that has to survive the port to
  Swift, the exporter is not a nice-to-have; it is the migration path. It ships
  in the first build and is covered by round-trip tests.

## 11. Seed data

`data/vendor/free-exercise-db/` — 876 exercises with instructions and 1,746
photos, Unlicense (public domain), so it is safe to use and to ship commercially.
Images are converted to 400 px WebP in `data/exercise-images/` (17 MB total,
down from 105 MB), lazy-loaded rather than precached by the service worker.

Its limits are exactly the ones this model exists to fix: 17 coarse muscles, one
flat equipment string, and configuration baked into names (`"Low Cable
Crossover"`) rather than expressed as data.

**Recommended approach — curate, don't convert.** Hand-author ~120–150 movements
with real contribution vectors and axis modifiers: that covers essentially
everything anyone programs. Import the remaining ~700 as loggable-only entries
with coarse muscle mappings — searchable, logged, counted toward volume, but not
auto-prescribed. Trying to author axis modifiers for all 876 is weeks of work for
the long tail of "Bosu Ball Cable Crunch With Side Bends."

## 12. Open questions

1. **Muscle granularity.** ~30 muscles is a bet that head-level resolution is
   what makes recommendations feel smart. It can be collapsed to ~17 later far
   more easily than it can be expanded.
2. **Bodyweight load.** Push-ups and dips need a per-movement leverage factor
   (fraction of bodyweight actually moved) for volume math to mean anything.
3. **Cardio and mobility.** Out of scope for now. The schema should not preclude
   them, but the engine should not try to program them.
4. **Multi-gym.** Modeled from day one (`GymEquipment` is per-gym) because
   retrofitting it after months of logs is painful.

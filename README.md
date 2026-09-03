# Beau

An adaptive strength training app for people who want to understand what they
are training: FitBod's recommendation engine, FoodNoms's philosophy, and a
spaced-repetition anatomy course built from the same data. Everything runs on
device — no account, no server, no telemetry.

Prototyping as a PWA (works from any machine, deploys as a static site), with
the engine written as pure, dependency-free TypeScript so the port to Swift is
mechanical. Native iOS is the target: HealthKit, CloudKit private database, and
a watchOS companion are the reasons this belongs on the platform.

## Where things are

| Path | |
| --- | --- |
| `docs/data-model.md` | The training model. Start here. |
| `docs/anatomy-model.md` | The anatomy library and learning mode |
| `src/core/` | Pure engine types and logic — no DOM, no storage, no framework |
| `src/core/anatomy/` | 86 muscles, 147 landmarks, 41 nerves, 13 joints |
| `src/core/learn/` | Card generation and FSRS scheduling |
| `data/` | Vendored exercise dataset and images ([provenance](data/README.md)) |
| `archive/old-site/` | The previous personal site that used to live here |

## Status

Design and data groundwork. No app yet.

- [x] Muscle, equipment and configuration taxonomy
- [x] Movement → variant resolution, with worked examples
- [x] Seed dataset: 876 exercises, 1,746 photos (public domain)
- [x] Anatomy graph: attachments, innervation, actions, derived antagonists
- [x] Card generation (630 cards) and FSRS scheduling
- [ ] Verify anatomy data against a reference — it is `draft`, see anatomy-model.md §5
- [ ] Curated movement catalog (~120–150)
- [ ] Fatigue and progression engine
- [ ] Workout generation
- [ ] Logging UI, service worker, export

```sh
npm install
npm run typecheck
npm run validate    # referential integrity of the anatomy graph
npm run demo        # configuration actually shifting muscle emphasis
npm run demo:learn  # anatomy graph, generated cards, rest-timer deck
```

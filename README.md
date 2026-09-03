# Beau

An adaptive strength training app for people who want to understand what they
are training: FitBod's recommendation engine, FoodNoms's philosophy, and a
spaced-repetition anatomy course built from the same data. The anatomy library
is scoped for a medical student, not just a lifter — the full 206-bone skeleton
and muscles down to the third palmar interosseous. Everything runs on device —
no account, no server, no telemetry.

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
| `src/core/movements/` | 93 curated movements → 547 variants, plus the coverage report |
| `src/core/equipment/` | Equipment catalog and load quantisation |
| `src/core/engine/` | Fatigue, progression, generation — 45 tests and an 8-week simulation |
| `src/app/` | The PWA: IndexedDB, screens, service worker, export |
| `src/core/anatomy/` | 167 muscles, all 206 bones, 222 landmarks, 59 nerves, 19 joints |
| `src/core/learn/` | Card generation and FSRS scheduling |
| `data/` | Vendored exercise dataset and images ([provenance](data/README.md)) |
| `archive/old-site/` | The previous personal site that used to live here |

## Status

Design and data groundwork. No app yet.

- [x] Muscle, equipment and configuration taxonomy (46 trainable units)
- [x] Movement → variant resolution, with worked examples
- [x] Seed dataset: 876 exercises, 1,746 photos (public domain)
- [x] Anatomy graph: attachments, innervation, actions, derived antagonists
- [x] Complete 206-bone skeleton with articulations and landmark types
- [x] Card generation (1,497 cards from 14 generators) and FSRS scheduling
- [ ] Verify anatomy data against a reference — it is `draft`, see anatomy-model.md §6
- [x] Curated movement catalog (93 movements, every unit covered)
- [x] Equipment catalog with plate maths and stack quantisation
- [x] Fatigue and progression engine
- [x] Workout generation
- [x] Logging UI, rest timer with anatomy cards, service worker, export/import
- [ ] Ask for a starting weight at onboarding instead of calibrating for weeks
- [ ] Charts, exercise swapping, multi-gym

## Running it

```sh
npm install
npm run dev         # the app, at http://localhost:5173/Beau/
```

Deployed to GitHub Pages on every push: **https://rivirside.github.io/Beau/**
Open it on your phone and add it to the home screen — it installs as a
full-screen app and works entirely offline.

Updates never install themselves mid-session. Settings has a
**Check for updates** button that fetches a new version and applies it only when
you say so.

```sh
npm run check       # typecheck + tests + anatomy graph + movement catalog
npm run simulate    # 8 weeks of synthetic training, end to end
npm run catalog     # per-unit coverage: can every unit actually be trained?
npm run demo        # configuration actually shifting muscle emphasis
npm run demo:learn  # anatomy graph, generated cards, rest-timer deck
```

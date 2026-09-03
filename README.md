# Beau

An adaptive strength training app: FitBod's recommendation engine, FoodNoms's
philosophy. Everything runs on device — no account, no server, no telemetry.

Prototyping as a PWA (works from any machine, deploys as a static site), with
the engine written as pure, dependency-free TypeScript so the port to Swift is
mechanical. Native iOS is the target: HealthKit, CloudKit private database, and
a watchOS companion are the reasons this belongs on the platform.

## Where things are

| Path | |
| --- | --- |
| `docs/data-model.md` | The design. Start here. |
| `src/core/` | Pure engine types and logic — no DOM, no storage, no framework |
| `data/` | Vendored exercise dataset and images ([provenance](data/README.md)) |
| `archive/old-site/` | The previous personal site that used to live here |

## Status

Design and data groundwork. No app yet.

- [x] Muscle, equipment and configuration taxonomy
- [x] Movement → variant resolution, with worked examples
- [x] Seed dataset: 876 exercises, 1,746 photos (public domain)
- [ ] Curated movement catalog (~120–150)
- [ ] Fatigue and progression engine
- [ ] Workout generation
- [ ] Logging UI, service worker, export

```sh
npm install
npm run typecheck
npm run demo      # shows configuration actually shifting muscle emphasis
```

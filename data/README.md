# Data

## `vendor/free-exercise-db/`

Source: https://github.com/yuhonas/free-exercise-db (Unlicense — public domain,
safe for commercial use). Vendored unmodified so the import is reproducible.

- `exercises.json` — 876 exercises with instructions, coarse muscle tags and equipment strings
- `LICENSE.md` — upstream license

Shape of the source data:

| Field | Values |
| --- | --- |
| equipment | barbell 170, dumbbell 123, other 122, body only 111, cable 81, *(none)* 77, machine 67, kettlebells 56, bands 20, medicine ball 17, exercise ball 12, foam roll 11, e-z curl bar 9 |
| category | strength 584, stretching 123, plyometrics 61, powerlifting 38, olympic 35, strongman 21, cardio 14 |
| muscles | 17 coarse tags (shoulders, chest, lats, quadriceps, …) |

It is a starting point for instructions and photos, not a model. Its three
limitations are the ones `docs/data-model.md` exists to fix: coarse muscle tags,
a single flat equipment string, and configuration baked into names (`"Low Cable
Crossover"`) instead of expressed as data.

## `exercise-images/`

1,746 photos (2 per exercise: start and end position), converted from the
upstream JPEGs to 400 px WebP — 105 MB → 17 MB. Paths mirror the vendor
`images` field with a `.webp` extension, e.g. `Cable_Crossover/0.webp`.

Lazy-loaded, not precached by the service worker: 17 MB is too much to force on
first install, and photos are not needed to log a set.

## Curation plan

Hand-author ~120–150 movements with real contribution vectors and axis
modifiers — that covers essentially everything anyone programs. Import the
remaining ~700 as `source: 'imported'`, loggable and searchable and counted
toward volume, but not auto-prescribed. Authoring axis modifiers for all 876 is
weeks of work spent on the long tail of "Bosu Ball Cable Crunch With Side Bends".

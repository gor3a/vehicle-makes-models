# vehicle-makes-models

A free, open dataset of car **makes**, **models**, **generations**, and **engine specs** —
global coverage with extra Egypt-market nameplates (e.g. Speranza, El Nasr) that
most datasets miss. Shipped as **JSON**, **CSV**, and **SQLite** so you can use it
from anything.

> **Dataset status:** The full tier-3 schema (generations + engines + raw specs) is
> currently populated for Toyota. Coverage for all makes is being added progressively
> — the tier-1 make/model/year data (164 makes, 2,697 models) remains available on
> `main` while the tier-3 crawl is in progress.

## What's inside

```
data/
  json/
    <make>.json        # one file per make group (e.g. toyota.json) — tier-3 nested shape
    all.json           # every make merged into a single array
  csv/
    engines.csv        # flat table, one row per engine variant
    makes-models.csv   # convenience table, one row per model (make/model/year only)
  vehicles.sqlite      # normalized SQLite database (see schema below)
```

## Schema

### Tier-3 nested JSON shape

Each per-make JSON file follows this hierarchy:
**make group → makes → models → generations → engines**

```json
{
  "group": "toyota",
  "makes": [
    {
      "name": "Toyota",
      "models": [
        {
          "name": "Corolla",
          "yearStart": 1966,
          "yearEnd": null,
          "generations": [
            {
              "name": "Corolla Sedan (2022)",
              "yearStart": 2022,
              "yearEnd": null,
              "bodyType": null,
              "engines": [
                {
                  "label": "1.8L CVT FWD (140 HP)",
                  "fuelType": "Hybrid Gasoline",
                  "cylinders": 4,
                  "displacementCc": null,
                  "powerHp": 140,
                  "torqueNm": null,
                  "transmission": null,
                  "drivetrain": "Front Wheel Drive",
                  "zeroToHundredKmhS": 9.2,
                  "topSpeedKmh": 180,
                  "fuelEconomyCombinedL100": null,
                  "lengthMm": null,
                  "widthMm": null,
                  "heightMm": null,
                  "wheelbaseMm": null,
                  "curbWeightKg": null,
                  "specs": {
                    "ENGINE SPECS / Cylinders": "4",
                    "ENGINE SPECS / Total maximum power": "103 kw (140 hp, 138 bhp)"
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

Each engine has **typed core columns** (fuel type, power, torque, dimensions, etc.) plus a
lossless `specs` map that preserves every raw key/value from the source — nothing is dropped.

### Flat engine CSV (`data/csv/engines.csv`)

One row per engine variant, 23 columns:

```
make_group, make, model, generation, gen_year_start, gen_year_end, body_type,
engine_label, fuel_type, cylinders, displacement_cc, power_hp, torque_nm,
transmission, drivetrain, zero_to_100_s, top_speed_kmh,
fuel_economy_combined_l100, length_mm, width_mm, height_mm, wheelbase_mm,
curb_weight_kg
```

Null values are empty fields. The raw `specs` map is intentionally omitted from this CSV
(it lives in the JSON files and in the SQLite `engine_specs` table).

### Convenience CSV (`data/csv/makes-models.csv`)

Five columns — `make_group, make, model, year_start, year_end` — one row per model.
Useful for quick lookups that don't need generation or engine detail.

### SQLite (`data/vehicles.sqlite`)

Normalized tables with foreign-key relationships, plus an EAV table for the raw specs:

```sql
-- core hierarchy
makes        (id, "group", name, country)
models       (id, make_id, name, year_start, year_end)
generations  (id, model_id, name, year_start, year_end, body_type)
engines      (id, generation_id, label, fuel_type, cylinders, displacement_cc,
              power_hp, torque_nm, transmission, drivetrain, zero_to_100_s,
              top_speed_kmh, fuel_economy_combined_l100, length_mm, width_mm,
              height_mm, wheelbase_mm, curb_weight_kg)

-- lossless raw specs (EAV — one row per spec key per engine)
engine_specs (id, engine_id, key, value)
```

Indexes: `models.make_id`, `generations.model_id`, `engines.generation_id`,
`engine_specs.engine_id`.

Example queries:

```sql
-- all engine variants for a model
SELECT g.name AS generation, e.label, e.power_hp, e.fuel_type
FROM engines e
JOIN generations g ON g.id = e.generation_id
JOIN models mo ON mo.id = g.model_id
JOIN makes m ON m.id = mo.make_id
WHERE m."group" = 'toyota' AND mo.name = 'Corolla'
ORDER BY g.year_start DESC, e.power_hp DESC;

-- raw specs for a specific engine
SELECT key, value FROM engine_specs WHERE engine_id = 42;
```

## Usage

**JSON**

```js
import all from './data/json/all.json' with { type: 'json' }
const toyota = all.find((g) => g.group === 'toyota')
```

**CSV** — open in Excel/Sheets, or:

```python
import csv
with open('data/csv/engines.csv') as f:
    rows = list(csv.DictReader(f))
```

**SQLite** — any SQLite client (`sqlite3`, `better-sqlite3`, Python `sqlite3`, DBeaver, etc.)

## Building from source

The per-make JSON files under `data/json/` are the source of truth. The CSV outputs
and SQLite are generated from them:

```bash
pnpm install
pnpm build      # regenerates all.json, engines.csv, makes-models.csv, vehicles.sqlite
pnpm test       # unit tests for the transforms
```

The build asserts engine-grain parity: engines in JSON == rows in `engines.csv` ==
rows in SQLite `engines`. It fails loudly on any mismatch.

## Contributing

Corrections welcome. Edit the relevant file under `data/json/`, run `pnpm build`,
and open a pull request — the regenerated CSV/SQLite should be included in the same PR.

## License & sources

- **Code** (everything outside `data/`): [MIT](LICENSE).
- **Data** (everything under `data/`): [ODbL 1.0](LICENSE-DATA).

Make/model/generation/engine facts were compiled and normalized from publicly available
information on autoevolution.com; Egypt-market additions (Speranza, El Nasr) are
original curation. See [LICENSE-DATA](LICENSE-DATA) for full attribution requirements,
share-alike obligations, and details.

# vehicle-makes-models

A free, open dataset of car **makes**, **models**, and **production year ranges** —
global coverage with extra Egypt-market nameplates (e.g. Speranza, El Nasr) that
most datasets miss. Shipped as **JSON**, **CSV**, and **SQLite** so you can use it
from anything.

- **164** makes
- **2,697** models
- One row per nameplate, with the years it was produced

## What's inside

```
data/
  json/
    <make>.json        # one file per make group (e.g. toyota.json)
    all.json           # every make in a single array
  csv/
    makes-models.csv   # flat table, one row per model
  vehicles.sqlite      # normalized SQLite database
```

## Schema

Every model has the same five fields:

| Field         | Type            | Notes                                            |
| ------------- | --------------- | ------------------------------------------------ |
| `make_group`  | string          | Lowercase group/brand slug (e.g. `toyota`)       |
| `make`        | string          | Display make name (e.g. `Toyota`)                |
| `model`       | string          | Model / nameplate (e.g. `Corolla`)               |
| `year_start`  | integer \| null | First production year; `null`/empty if unknown   |
| `year_end`    | integer \| null | Last production year; `null`/empty = still made  |

In the JSON files the year fields are `yearStart` / `yearEnd` (camelCase). In the
CSV and SQLite they are `year_start` / `year_end`. An empty/`null` `year_end` means
the model is still in production.

### JSON shape

```json
{
  "group": "toyota",
  "makes": [
    {
      "name": "Toyota",
      "models": [{ "name": "Corolla", "yearStart": 1987, "yearEnd": null }]
    }
  ]
}
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
with open('data/csv/makes-models.csv') as f:
    rows = list(csv.DictReader(f))
```

**SQLite**

```sql
SELECT m.name AS make, mo.name AS model, mo.year_start, mo.year_end
FROM models mo
JOIN makes m ON m.id = mo.make_id
WHERE m.name = 'Toyota'
ORDER BY mo.name;
```

Tables: `makes(id, "group", name)` and
`models(id, make_id, name, year_start, year_end)`, with indexes on
`models.make_id` and `models.name`.

## Building from source

The JSON files under `data/json/` are the source of truth. The CSV and SQLite are
generated from them:

```bash
pnpm install
pnpm build      # regenerates all.json, makes-models.csv, vehicles.sqlite
pnpm test       # unit tests for the transforms
```

The build validates every JSON file and asserts the row counts match across all
three output formats.

## Contributing

Corrections welcome. Edit the relevant file under `data/json/`, run `pnpm build`,
and open a pull request — the regenerated CSV/SQLite should be included in the same
PR.

## License & sources

- **Code** (everything outside `data/`): [MIT](LICENSE).
- **Data** (everything under `data/`): [CC BY 4.0](LICENSE-DATA).

Make/model/year facts were compiled and normalized from publicly available
information on autoevolution.com; Egypt-market additions are original curation.
See [LICENSE-DATA](LICENSE-DATA) for attribution requirements and details.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadFullMakeFiles, engineFlatRows, engineRowsToCsv, makesModelsCsv } from './transform-full.js'
import { writeFullSqlite } from './sqlite-full.js'

function parseArgs(): { root: string } {
  const rootArg = process.argv.slice(2).find((a) => a.startsWith('--root='))
  const root = rootArg
    ? rootArg.slice('--root='.length)
    : join(dirname(fileURLToPath(import.meta.url)), '..')
  return { root }
}

function main(): void {
  const { root } = parseArgs()
  const jsonDir = join(root, 'data', 'json')
  const csvDir = join(root, 'data', 'csv')
  const allJsonPath = join(jsonDir, 'all.json')
  const enginesCsvPath = join(csvDir, 'engines.csv')
  const makesModelsCsvPath = join(csvDir, 'makes-models.csv')
  const sqlitePath = join(root, 'data', 'vehicles.sqlite')

  const files = loadFullMakeFiles(jsonDir)

  mkdirSync(csvDir, { recursive: true })

  // 1. Write all.json (full nested structure)
  writeFileSync(allJsonPath, JSON.stringify(files, null, 2) + '\n')

  // 2. Flat engine rows
  const rows = engineFlatRows(files)

  // 3. Write engines.csv
  const enginesCsv = engineRowsToCsv(rows)
  writeFileSync(enginesCsvPath, enginesCsv)

  // 4. Write SQLite
  const counts = writeFullSqlite(files, sqlitePath)

  // Count totals for summary
  let totalModels = 0
  let totalGenerations = 0
  for (const file of files) {
    for (const make of file.makes) {
      totalModels += make.models.length
      for (const model of make.models) {
        totalGenerations += model.generations.length
      }
    }
  }

  // 5. Engine-grain parity assertion
  // Use rows.length (one entry per engine data row) rather than counting physical CSV lines —
  // physical-line-counting over-counts when any field contains an embedded newline (RFC-4180).
  if (rows.length !== counts.engines) {
    throw new Error(
      `Engine-grain parity mismatch: json flat rows=${rows.length}, sqlite engines=${counts.engines}`,
    )
  }

  // 6. Makes-models.csv — build, assert model-row count, then write
  // NOTE: M2 (scientific notation in numField) and M4 (REAL vs INTEGER column types) are deferred.
  // modelRowsFromData is computed from the same source as makesModelsCsv iterates,
  // without splitting the CSV string (avoids RFC-4180 embedded-newline over-count).
  let modelRowsFromData = 0
  for (const file of files) {
    for (const make of file.makes) {
      modelRowsFromData += make.models.length
    }
  }
  if (modelRowsFromData !== totalModels) {
    throw new Error(
      `Makes-models.csv parity mismatch: model rows from data=${modelRowsFromData}, expected=${totalModels}`,
    )
  }
  writeFileSync(makesModelsCsvPath, makesModelsCsv(files))

  // 7. Soft warn for any make group that produced 0 engines (possible crawl gap)
  for (const file of files) {
    const groupEngines = rows.filter((r) => r.makeGroup === file.group).length
    if (groupEngines === 0) {
      console.warn(`⚠ ${file.group}: 0 engines (possible crawl gap)`)
    }
  }

  console.log(`Built ${files.length} make file(s)`)
  console.log(`  makes:       ${counts.makes}`)
  console.log(`  models:      ${totalModels}`)
  console.log(`  generations: ${totalGenerations}`)
  console.log(`  engines:     ${counts.engines}`)
  console.log(`  specs:       ${counts.specs}`)
  console.log(`  json:        ${allJsonPath}`)
  console.log(`  csv engines: ${enginesCsvPath} (${rows.length} rows)`)
  console.log(`  csv makes:   ${makesModelsCsvPath}`)
  console.log(`  db:          ${sqlitePath}`)
}

main()

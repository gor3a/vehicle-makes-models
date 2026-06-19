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

  // 4. Write makes-models.csv
  writeFileSync(makesModelsCsvPath, makesModelsCsv(files))

  // 5. Write SQLite
  const counts = writeFullSqlite(files, sqlitePath)

  // 6. Engine-grain parity assertion
  // CSV data rows = total lines minus header line (trailing newline means trimEnd before split)
  const csvEngineRows = enginesCsv.trimEnd().split('\n').length - 1
  if (rows.length !== csvEngineRows || rows.length !== counts.engines) {
    throw new Error(
      `Engine-grain parity mismatch: json flat rows=${rows.length}, csv data rows=${csvEngineRows}, sqlite engines=${counts.engines}`,
    )
  }

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

  console.log(`Built ${files.length} make file(s)`)
  console.log(`  makes:       ${counts.makes}`)
  console.log(`  models:      ${totalModels}`)
  console.log(`  generations: ${totalGenerations}`)
  console.log(`  engines:     ${counts.engines}`)
  console.log(`  specs:       ${counts.specs}`)
  console.log(`  json:        ${allJsonPath}`)
  console.log(`  csv engines: ${enginesCsvPath} (${csvEngineRows} rows)`)
  console.log(`  csv makes:   ${makesModelsCsvPath}`)
  console.log(`  db:          ${sqlitePath}`)
}

main()

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadMakeFiles, flattenRows, rowsToCsv } from './transform.js'
import { writeSqlite } from './sqlite.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const jsonDir = join(root, 'data', 'json')
const csvDir = join(root, 'data', 'csv')
const allJsonPath = join(jsonDir, 'all.json')
const csvPath = join(csvDir, 'makes-models.csv')
const sqlitePath = join(root, 'data', 'vehicles.sqlite')

function main(): void {
  const files = loadMakeFiles(jsonDir)
  const rows = flattenRows(files)

  mkdirSync(csvDir, { recursive: true })

  writeFileSync(allJsonPath, JSON.stringify(files, null, 2) + '\n')
  const csv = rowsToCsv(rows)
  writeFileSync(csvPath, csv)
  const counts = writeSqlite(files, sqlitePath)

  const csvRows = csv.trimEnd().split('\n').length - 1 // minus header
  if (rows.length !== csvRows || rows.length !== counts.models) {
    throw new Error(
      `Row-count mismatch: json=${rows.length} csv=${csvRows} sqlite=${counts.models}`,
    )
  }

  console.log(`Built ${files.length} make files → ${counts.makes} makes, ${counts.models} models`)
  console.log(`  json: ${allJsonPath}`)
  console.log(`  csv:  ${csvPath} (${csvRows} rows)`)
  console.log(`  db:   ${sqlitePath}`)
}

main()

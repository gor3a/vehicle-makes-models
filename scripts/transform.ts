import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { makeFileSchema, type MakeFile, type FlatRow } from './schema.js'

export function loadMakeFiles(jsonDir: string): MakeFile[] {
  const files = readdirSync(jsonDir)
    .filter((f) => f.endsWith('.json') && f !== 'all.json')
    .sort()
  return files.map((file) => {
    const raw: unknown = JSON.parse(readFileSync(join(jsonDir, file), 'utf8'))
    const parsed = makeFileSchema.safeParse(raw)
    if (!parsed.success) {
      throw new Error(`Invalid make file ${file}: ${parsed.error.message}`)
    }
    return parsed.data
  })
}

export function flattenRows(files: readonly MakeFile[]): FlatRow[] {
  const rows: FlatRow[] = []
  for (const file of files) {
    for (const make of file.makes) {
      for (const model of make.models) {
        rows.push({
          makeGroup: file.group,
          make: make.name,
          model: model.name,
          yearStart: model.yearStart,
          yearEnd: model.yearEnd,
        })
      }
    }
  }
  return rows
}

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function rowsToCsv(rows: readonly FlatRow[]): string {
  const header = 'make_group,make,model,year_start,year_end'
  const lines = rows.map((r) =>
    [
      csvField(r.makeGroup),
      csvField(r.make),
      csvField(r.model),
      r.yearStart === null ? '' : String(r.yearStart),
      r.yearEnd === null ? '' : String(r.yearEnd),
    ].join(','),
  )
  return [header, ...lines].join('\n') + '\n'
}

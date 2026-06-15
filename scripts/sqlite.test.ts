import { describe, it, expect } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { writeSqlite } from './sqlite.js'
import type { MakeFile } from './schema.js'

const sample: MakeFile[] = [
  {
    group: 'toyota',
    makes: [
      {
        name: 'Toyota',
        models: [
          { name: 'Corolla', yearStart: 1966, yearEnd: null },
          { name: 'Supra', yearStart: 1978, yearEnd: 2002 },
        ],
      },
    ],
  },
]

describe('writeSqlite', () => {
  it('creates makes + models rows and returns counts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vmm-'))
    const dbPath = join(dir, 'test.sqlite')
    try {
      const counts = writeSqlite(sample, dbPath)
      expect(counts).toEqual({ makes: 1, models: 2 })

      const db = new Database(dbPath, { readonly: true })
      const models = db
        .prepare('SELECT name, year_start, year_end FROM models ORDER BY name')
        .all()
      db.close()
      expect(models).toEqual([
        { name: 'Corolla', year_start: 1966, year_end: null },
        { name: 'Supra', year_start: 1978, year_end: 2002 },
      ])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

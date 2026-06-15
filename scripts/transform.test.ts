import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadMakeFiles, flattenRows, rowsToCsv } from './transform.js'
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
  {
    group: 'acme',
    makes: [
      { name: 'Acme, Inc', models: [{ name: 'Rocket "X"', yearStart: null, yearEnd: null }] },
    ],
  },
]

describe('flattenRows', () => {
  it('flattens nested makes/models into one row per model', () => {
    const rows = flattenRows(sample)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({
      makeGroup: 'toyota',
      make: 'Toyota',
      model: 'Corolla',
      yearStart: 1966,
      yearEnd: null,
    })
  })
})

describe('rowsToCsv', () => {
  it('emits header + one line per row; null yearEnd is empty', () => {
    const lines = rowsToCsv(flattenRows(sample)).trimEnd().split('\n')
    expect(lines[0]).toBe('make_group,make,model,year_start,year_end')
    expect(lines[1]).toBe('toyota,Toyota,Corolla,1966,')
    expect(lines[2]).toBe('toyota,Toyota,Supra,1978,2002')
  })

  it('escapes commas/quotes and leaves a null yearStart empty', () => {
    const lines = rowsToCsv(flattenRows(sample)).trimEnd().split('\n')
    expect(lines[3]).toBe('acme,"Acme, Inc","Rocket ""X""",,')
  })
})

describe('loadMakeFiles', () => {
  it('throws on a malformed file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vmm-'))
    try {
      writeFileSync(
        join(dir, 'bad.json'),
        JSON.stringify({
          group: 'x',
          makes: [{ name: 'Y', models: [{ name: 'Z', yearStart: 'oops' }] }],
        }),
      )
      expect(() => loadMakeFiles(dir)).toThrow(/Invalid make file bad\.json/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

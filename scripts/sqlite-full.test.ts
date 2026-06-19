import { describe, it, expect, afterEach } from 'vitest'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rmSync, existsSync } from 'node:fs'
import Database from 'better-sqlite3'
import { writeFullSqlite } from './sqlite-full.js'
import type { FullMakeFile } from './schema.js'

const TMP_DB = join(tmpdir(), `sqlite-full-test-${Date.now()}.sqlite`)

const FIXTURE: FullMakeFile[] = [
  {
    group: 'toyota',
    makes: [
      {
        name: 'Toyota',
        country: 'Japan',
        models: [
          {
            name: 'Corolla',
            yearStart: 1966,
            yearEnd: null,
            generations: [
              {
                name: 'Corolla Sedan (2022)',
                yearStart: 2022,
                yearEnd: null,
                bodyType: 'Sedan',
                engines: [
                  {
                    label: '1.8L CVT FWD (140 HP)',
                    fuelType: 'Hybrid Gasoline',
                    cylinders: 4,
                    displacementCc: 1798,
                    powerHp: 140,
                    torqueNm: 142.0,
                    transmission: 'CVT',
                    drivetrain: 'Front Wheel Drive',
                    zeroToHundredKmhS: 9.2,
                    topSpeedKmh: 180,
                    fuelEconomyCombinedL100: 4.5,
                    lengthMm: 4630,
                    widthMm: 1780,
                    heightMm: 1435,
                    wheelbaseMm: 2700,
                    curbWeightKg: 1370,
                    specs: {
                      'ENGINE SPECS / Cylinders': '4',
                      'ENGINE SPECS / Total maximum power': '103 kw (140 hp, 138 bhp)',
                    },
                  },
                  {
                    label: '2.0L CVT FWD (170 HP)',
                    fuelType: 'Gasoline',
                    cylinders: 4,
                    displacementCc: 1987,
                    powerHp: 133.8,
                    torqueNm: 188.0,
                    transmission: 'CVT',
                    drivetrain: 'Front Wheel Drive',
                    zeroToHundredKmhS: 8.1,
                    topSpeedKmh: 190,
                    fuelEconomyCombinedL100: null,
                    lengthMm: null,
                    widthMm: null,
                    heightMm: null,
                    wheelbaseMm: null,
                    curbWeightKg: null,
                    specs: {
                      'ENGINE SPECS / Cylinders': '4',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

afterEach(() => {
  if (existsSync(TMP_DB)) rmSync(TMP_DB)
})

describe('writeFullSqlite', () => {
  it('returns correct counts for a single make/model/gen/2 engines', () => {
    const counts = writeFullSqlite(FIXTURE, TMP_DB)
    expect(counts.makes).toBe(1)
    expect(counts.models).toBe(1)
    expect(counts.generations).toBe(1)
    expect(counts.engines).toBe(2)
    expect(counts.specs).toBe(3) // 2 specs for engine 1, 1 spec for engine 2
  })

  it('writes a readable db with correct engine power_hp (REAL)', () => {
    writeFullSqlite(FIXTURE, TMP_DB)
    const db = new Database(TMP_DB, { readonly: true })
    try {
      const engine = db
        .prepare<[string], { power_hp: number; label: string }>(
          'SELECT label, power_hp FROM engines WHERE label = ?',
        )
        .get('2.0L CVT FWD (170 HP)')
      expect(engine).toBeDefined()
      expect(engine!.power_hp).toBe(133.8)

      const engine1 = db
        .prepare<[string], { power_hp: number }>('SELECT power_hp FROM engines WHERE label = ?')
        .get('1.8L CVT FWD (140 HP)')
      expect(engine1!.power_hp).toBe(140)
    } finally {
      db.close()
    }
  })

  it('engine_specs EAV table has all raw spec keys for both engines', () => {
    writeFullSqlite(FIXTURE, TMP_DB)
    const db = new Database(TMP_DB, { readonly: true })
    try {
      const specRows = db
        .prepare<[], { key: string; value: string }>('SELECT key, value FROM engine_specs ORDER BY id')
        .all()
      // engine 1 has 2 specs, engine 2 has 1 spec → total 3
      expect(specRows).toHaveLength(3)
      expect(specRows[0]!.key).toBe('ENGINE SPECS / Cylinders')
      expect(specRows[0]!.value).toBe('4')
      expect(specRows[1]!.key).toBe('ENGINE SPECS / Total maximum power')
      expect(specRows[2]!.key).toBe('ENGINE SPECS / Cylinders')
    } finally {
      db.close()
    }
  })

  it('table counts match SELECT COUNT(*)', () => {
    writeFullSqlite(FIXTURE, TMP_DB)
    const db = new Database(TMP_DB, { readonly: true })
    try {
      const makesCount = (db.prepare('SELECT COUNT(*) as c FROM makes').get() as { c: number }).c
      const modelsCount = (db.prepare('SELECT COUNT(*) as c FROM models').get() as { c: number }).c
      const gensCount = (
        db.prepare('SELECT COUNT(*) as c FROM generations').get() as { c: number }
      ).c
      const enginesCount = (db.prepare('SELECT COUNT(*) as c FROM engines').get() as { c: number })
        .c
      const specsCount = (
        db.prepare('SELECT COUNT(*) as c FROM engine_specs').get() as { c: number }
      ).c
      expect(makesCount).toBe(1)
      expect(modelsCount).toBe(1)
      expect(gensCount).toBe(1)
      expect(enginesCount).toBe(2)
      expect(specsCount).toBe(3)
    } finally {
      db.close()
    }
  })

  it('drops and recreates db if it already exists', () => {
    writeFullSqlite(FIXTURE, TMP_DB)
    // Call again — should not throw and should reset counts
    const counts = writeFullSqlite(FIXTURE, TMP_DB)
    expect(counts.engines).toBe(2)
    expect(counts.specs).toBe(3)
  })
})

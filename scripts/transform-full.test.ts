import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { engineFlatRows, engineRowsToCsv, makesModelsCsv, loadFullMakeFiles } from './transform-full.js'
import type { FullMakeFile } from './schema.js'

const sample: FullMakeFile[] = [
  {
    group: 'toyota',
    makes: [
      {
        name: 'Toyota',
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
                bodyType: null,
                engines: [
                  {
                    label: '1.8L CVT FWD (140 HP)',
                    fuelType: 'Hybrid Gasoline',
                    cylinders: 4,
                    displacementCc: null,
                    powerHp: 140,
                    torqueNm: null,
                    transmission: null,
                    drivetrain: 'Front Wheel Drive',
                    zeroToHundredKmhS: 9.2,
                    topSpeedKmh: 180,
                    fuelEconomyCombinedL100: null,
                    lengthMm: null,
                    widthMm: null,
                    heightMm: null,
                    wheelbaseMm: null,
                    curbWeightKg: null,
                    specs: {
                      'ENGINE SPECS / Cylinders': '4',
                      'ENGINE SPECS / Total maximum power': '103 kw (140 hp, 138 bhp)',
                    },
                  },
                  {
                    label: '2.0L MT RWD (133.8 HP)',
                    fuelType: 'Gasoline',
                    cylinders: 4,
                    displacementCc: 1998,
                    powerHp: 133.8,
                    torqueNm: 200,
                    transmission: 'Manual, 6-speed',
                    drivetrain: 'Rear Wheel Drive',
                    zeroToHundredKmhS: null,
                    topSpeedKmh: null,
                    fuelEconomyCombinedL100: 7.5,
                    lengthMm: 4630,
                    widthMm: 1780,
                    heightMm: 1435,
                    wheelbaseMm: 2700,
                    curbWeightKg: 1400,
                    specs: {},
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

// A second file with a make whose name contains a comma, to test CSV escaping
const sampleWithComma: FullMakeFile[] = [
  {
    group: 'acme',
    makes: [
      {
        name: 'Acme, Corp',
        models: [
          {
            name: 'Rocket',
            yearStart: 2000,
            yearEnd: 2010,
            generations: [
              {
                name: 'Rocket Gen 1',
                yearStart: 2000,
                yearEnd: 2005,
                bodyType: 'Coupe',
                engines: [
                  {
                    label: '5.0L V8 (300 HP)',
                    fuelType: null,
                    cylinders: 8,
                    displacementCc: 5000,
                    powerHp: 300,
                    torqueNm: 450,
                    transmission: null,
                    drivetrain: null,
                    zeroToHundredKmhS: null,
                    topSpeedKmh: null,
                    fuelEconomyCombinedL100: null,
                    lengthMm: null,
                    widthMm: null,
                    heightMm: null,
                    wheelbaseMm: null,
                    curbWeightKg: null,
                    specs: {},
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

describe('engineFlatRows', () => {
  it('returns one row per engine with correct nested values flattened', () => {
    const rows = engineFlatRows(sample)
    expect(rows).toHaveLength(2)

    const first = rows[0]
    expect(first).toBeDefined()
    if (!first) return

    expect(first.makeGroup).toBe('toyota')
    expect(first.make).toBe('Toyota')
    expect(first.model).toBe('Corolla')
    expect(first.generation).toBe('Corolla Sedan (2022)')
    expect(first.genYearStart).toBe(2022)
    expect(first.genYearEnd).toBeNull()
    expect(first.bodyType).toBeNull()
    expect(first.engineLabel).toBe('1.8L CVT FWD (140 HP)')
    expect(first.fuelType).toBe('Hybrid Gasoline')
    expect(first.cylinders).toBe(4)
    expect(first.powerHp).toBe(140)
    expect(first.drivetrain).toBe('Front Wheel Drive')
    expect(first.zeroToHundredKmhS).toBe(9.2)
    expect(first.displacementCc).toBeNull()
  })

  it('preserves decimal powerHp', () => {
    const rows = engineFlatRows(sample)
    const second = rows[1]
    expect(second).toBeDefined()
    if (!second) return
    expect(second.powerHp).toBe(133.8)
    expect(second.displacementCc).toBe(1998)
    expect(second.curbWeightKg).toBe(1400)
  })
})

describe('engineRowsToCsv', () => {
  it('has the correct 23-column header', () => {
    const rows = engineFlatRows(sample)
    const csv = engineRowsToCsv(rows)
    const lines = csv.trimEnd().split('\n')
    expect(lines[0]).toBe(
      'make_group,make,model,generation,gen_year_start,gen_year_end,body_type,engine_label,fuel_type,cylinders,displacement_cc,power_hp,torque_nm,transmission,drivetrain,zero_to_100_s,top_speed_kmh,fuel_economy_combined_l100,length_mm,width_mm,height_mm,wheelbase_mm,curb_weight_kg',
    )
  })

  it('null fields become empty strings', () => {
    const rows = engineFlatRows(sample)
    const csv = engineRowsToCsv(rows)
    const lines = csv.trimEnd().split('\n')
    // First engine: displacementCc is null → field is empty
    const line1 = lines[1]
    expect(line1).toBeDefined()
    if (!line1) return
    const fields = line1.split(',')
    // displacement_cc is column index 10 (0-based)
    expect(fields[10]).toBe('')
  })

  it('preserves decimal powerHp in CSV', () => {
    const rows = engineFlatRows(sample)
    const csv = engineRowsToCsv(rows)
    const lines = csv.trimEnd().split('\n')
    const line2 = lines[2]
    expect(line2).toBeDefined()
    if (!line2) return
    // power_hp is column 11 (0-based); second engine has 133.8
    // The line is: toyota,Toyota,Corolla,Corolla Sedan (2022),2022,,,,Gasoline,4,1998,133.8,...
    expect(line2).toContain('133.8')
  })

  it('quotes values containing commas', () => {
    const allFiles = [...sample, ...sampleWithComma]
    const rows = engineFlatRows(allFiles)
    const csv = engineRowsToCsv(rows)
    const lines = csv.trimEnd().split('\n')
    // The acme make line should have "Acme, Corp" quoted
    const acmeLine = lines.find((l) => l.startsWith('acme'))
    expect(acmeLine).toBeDefined()
    expect(acmeLine).toContain('"Acme, Corp"')
  })

  it('ends with a newline', () => {
    const rows = engineFlatRows(sample)
    const csv = engineRowsToCsv(rows)
    expect(csv.endsWith('\n')).toBe(true)
  })
})

describe('makesModelsCsv', () => {
  it('has the correct header', () => {
    const csv = makesModelsCsv(sample)
    const lines = csv.trimEnd().split('\n')
    expect(lines[0]).toBe('make_group,make,model,year_start,year_end')
  })

  it('emits one row per model', () => {
    const csv = makesModelsCsv(sample)
    const lines = csv.trimEnd().split('\n')
    expect(lines).toHaveLength(2) // header + 1 model (Corolla)
    expect(lines[1]).toBe('toyota,Toyota,Corolla,1966,')
  })
})

describe('loadFullMakeFiles', () => {
  it('throws on a malformed file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vmm-full-'))
    try {
      writeFileSync(
        join(dir, 'bad.json'),
        JSON.stringify({
          group: 'x',
          makes: [
            {
              name: 'Y',
              models: [
                {
                  name: 'Z',
                  yearStart: 2020,
                  yearEnd: null,
                  generations: [{ name: 'G', yearStart: null, yearEnd: null, bodyType: null, engines: 'wrong' }],
                },
              ],
            },
          ],
        }),
      )
      expect(() => loadFullMakeFiles(dir)).toThrow(/Invalid make file bad\.json/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('loads a valid file and returns parsed FullMakeFile', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vmm-full-'))
    try {
      writeFileSync(join(dir, 'toyota.json'), JSON.stringify(sample[0]))
      const files = loadFullMakeFiles(dir)
      expect(files).toHaveLength(1)
      expect(files[0]?.group).toBe('toyota')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

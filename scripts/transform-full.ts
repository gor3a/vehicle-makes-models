import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fullMakeFileSchema, type FullMakeFile, type EngineRow } from './schema.js'

export function loadFullMakeFiles(jsonDir: string): FullMakeFile[] {
  const files = readdirSync(jsonDir)
    .filter((f) => f.endsWith('.json') && f !== 'all.json')
    .sort()
  return files.map((file) => {
    const raw: unknown = JSON.parse(readFileSync(join(jsonDir, file), 'utf8'))
    const parsed = fullMakeFileSchema.safeParse(raw)
    if (!parsed.success) {
      throw new Error(`Invalid make file ${file}: ${parsed.error.message}`)
    }
    return parsed.data
  })
}

export function engineFlatRows(files: readonly FullMakeFile[]): EngineRow[] {
  const rows: EngineRow[] = []
  for (const file of files) {
    for (const make of file.makes) {
      for (const model of make.models) {
        for (const gen of model.generations) {
          for (const engine of gen.engines) {
            rows.push({
              makeGroup: file.group,
              make: make.name,
              model: model.name,
              generation: gen.name,
              genYearStart: gen.yearStart,
              genYearEnd: gen.yearEnd,
              bodyType: gen.bodyType,
              engineLabel: engine.label,
              fuelType: engine.fuelType,
              cylinders: engine.cylinders,
              displacementCc: engine.displacementCc,
              powerHp: engine.powerHp,
              torqueNm: engine.torqueNm,
              transmission: engine.transmission,
              drivetrain: engine.drivetrain,
              zeroToHundredKmhS: engine.zeroToHundredKmhS,
              topSpeedKmh: engine.topSpeedKmh,
              fuelEconomyCombinedL100: engine.fuelEconomyCombinedL100,
              lengthMm: engine.lengthMm,
              widthMm: engine.widthMm,
              heightMm: engine.heightMm,
              wheelbaseMm: engine.wheelbaseMm,
              curbWeightKg: engine.curbWeightKg,
            })
          }
        }
      }
    }
  }
  return rows
}

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function numField(value: number | null): string {
  return value === null ? '' : String(value)
}

const ENGINE_CSV_HEADER =
  'make_group,make,model,generation,gen_year_start,gen_year_end,body_type,engine_label,fuel_type,cylinders,displacement_cc,power_hp,torque_nm,transmission,drivetrain,zero_to_100_s,top_speed_kmh,fuel_economy_combined_l100,length_mm,width_mm,height_mm,wheelbase_mm,curb_weight_kg'

export function engineRowsToCsv(rows: readonly EngineRow[]): string {
  const lines = rows.map((r) =>
    [
      csvField(r.makeGroup),
      csvField(r.make),
      csvField(r.model),
      csvField(r.generation),
      numField(r.genYearStart),
      numField(r.genYearEnd),
      r.bodyType === null ? '' : csvField(r.bodyType),
      csvField(r.engineLabel),
      r.fuelType === null ? '' : csvField(r.fuelType),
      numField(r.cylinders),
      numField(r.displacementCc),
      numField(r.powerHp),
      numField(r.torqueNm),
      r.transmission === null ? '' : csvField(r.transmission),
      r.drivetrain === null ? '' : csvField(r.drivetrain),
      numField(r.zeroToHundredKmhS),
      numField(r.topSpeedKmh),
      numField(r.fuelEconomyCombinedL100),
      numField(r.lengthMm),
      numField(r.widthMm),
      numField(r.heightMm),
      numField(r.wheelbaseMm),
      numField(r.curbWeightKg),
    ].join(','),
  )
  return [ENGINE_CSV_HEADER, ...lines].join('\n') + '\n'
}

export function makesModelsCsv(files: readonly FullMakeFile[]): string {
  const header = 'make_group,make,model,year_start,year_end'
  const lines: string[] = []
  for (const file of files) {
    for (const make of file.makes) {
      for (const model of make.models) {
        lines.push(
          [
            csvField(file.group),
            csvField(make.name),
            csvField(model.name),
            model.yearStart === null ? '' : String(model.yearStart),
            model.yearEnd === null ? '' : String(model.yearEnd),
          ].join(','),
        )
      }
    }
  }
  return [header, ...lines].join('\n') + '\n'
}

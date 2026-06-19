import { existsSync, rmSync } from 'node:fs'
import Database from 'better-sqlite3'
import type { FullMakeFile } from './schema.js'

export function writeFullSqlite(
  files: readonly FullMakeFile[],
  dbPath: string,
): { makes: number; models: number; generations: number; engines: number; specs: number } {
  if (existsSync(dbPath)) rmSync(dbPath)
  const db = new Database(dbPath)
  try {
    db.exec(`
      CREATE TABLE makes (
        id INTEGER PRIMARY KEY,
        "group" TEXT NOT NULL,
        name TEXT NOT NULL,
        country TEXT
      );
      CREATE TABLE models (
        id INTEGER PRIMARY KEY,
        make_id INTEGER NOT NULL REFERENCES makes(id),
        name TEXT NOT NULL,
        year_start INTEGER,
        year_end INTEGER
      );
      CREATE TABLE generations (
        id INTEGER PRIMARY KEY,
        model_id INTEGER NOT NULL REFERENCES models(id),
        name TEXT NOT NULL,
        year_start INTEGER,
        year_end INTEGER,
        body_type TEXT
      );
      CREATE TABLE engines (
        id INTEGER PRIMARY KEY,
        generation_id INTEGER NOT NULL REFERENCES generations(id),
        label TEXT NOT NULL,
        fuel_type TEXT,
        cylinders INTEGER,
        displacement_cc INTEGER,
        power_hp REAL,
        torque_nm REAL,
        transmission TEXT,
        drivetrain TEXT,
        zero_to_100_s REAL,
        top_speed_kmh REAL,
        fuel_economy_combined_l100 REAL,
        length_mm INTEGER,
        width_mm INTEGER,
        height_mm INTEGER,
        wheelbase_mm INTEGER,
        curb_weight_kg INTEGER
      );
      CREATE TABLE engine_specs (
        id INTEGER PRIMARY KEY,
        engine_id INTEGER NOT NULL REFERENCES engines(id),
        key TEXT NOT NULL,
        value TEXT NOT NULL
      );
      CREATE INDEX idx_models_make ON models(make_id);
      CREATE INDEX idx_generations_model ON generations(model_id);
      CREATE INDEX idx_engines_generation ON engines(generation_id);
      CREATE INDEX idx_engine_specs_engine ON engine_specs(engine_id);
    `)

    const insertMake = db.prepare<[string, string, string | null], { lastInsertRowid: number }>(
      'INSERT INTO makes ("group", name, country) VALUES (?, ?, ?)',
    )
    const insertModel = db.prepare(
      'INSERT INTO models (make_id, name, year_start, year_end) VALUES (?, ?, ?, ?)',
    )
    const insertGeneration = db.prepare(
      'INSERT INTO generations (model_id, name, year_start, year_end, body_type) VALUES (?, ?, ?, ?, ?)',
    )
    const insertEngine = db.prepare(
      `INSERT INTO engines (
        generation_id, label, fuel_type, cylinders, displacement_cc,
        power_hp, torque_nm, transmission, drivetrain, zero_to_100_s,
        top_speed_kmh, fuel_economy_combined_l100, length_mm, width_mm,
        height_mm, wheelbase_mm, curb_weight_kg
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    const insertSpec = db.prepare(
      'INSERT INTO engine_specs (engine_id, key, value) VALUES (?, ?, ?)',
    )

    let makes = 0
    let models = 0
    let generations = 0
    let engines = 0
    let specs = 0

    const run = db.transaction(() => {
      for (const file of files) {
        for (const make of file.makes) {
          const makeInfo = insertMake.run(file.group, make.name, make.country ?? null)
          makes += 1
          const makeId = Number(makeInfo.lastInsertRowid)

          for (const model of make.models) {
            const modelInfo = insertModel.run(makeId, model.name, model.yearStart, model.yearEnd)
            models += 1
            const modelId = Number(modelInfo.lastInsertRowid)

            for (const gen of model.generations) {
              const genInfo = insertGeneration.run(
                modelId,
                gen.name,
                gen.yearStart,
                gen.yearEnd,
                gen.bodyType,
              )
              generations += 1
              const genId = Number(genInfo.lastInsertRowid)

              for (const engine of gen.engines) {
                const engineInfo = insertEngine.run(
                  genId,
                  engine.label,
                  engine.fuelType,
                  engine.cylinders,
                  engine.displacementCc,
                  engine.powerHp,
                  engine.torqueNm,
                  engine.transmission,
                  engine.drivetrain,
                  engine.zeroToHundredKmhS,
                  engine.topSpeedKmh,
                  engine.fuelEconomyCombinedL100,
                  engine.lengthMm,
                  engine.widthMm,
                  engine.heightMm,
                  engine.wheelbaseMm,
                  engine.curbWeightKg,
                )
                engines += 1
                const engineId = Number(engineInfo.lastInsertRowid)

                for (const [key, value] of Object.entries(engine.specs)) {
                  insertSpec.run(engineId, key, value)
                  specs += 1
                }
              }
            }
          }
        }
      }
    })

    run()
    return { makes, models, generations, engines, specs }
  } finally {
    db.close()
  }
}

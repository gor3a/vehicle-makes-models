import { existsSync, rmSync } from 'node:fs'
import Database from 'better-sqlite3'
import type { MakeFile } from './schema.js'

export function writeSqlite(
  files: readonly MakeFile[],
  dbPath: string,
): { makes: number; models: number } {
  if (existsSync(dbPath)) rmSync(dbPath)
  const db = new Database(dbPath)
  try {
    db.exec(`
      CREATE TABLE makes (
        id INTEGER PRIMARY KEY,
        "group" TEXT NOT NULL,
        name TEXT NOT NULL
      );
      CREATE TABLE models (
        id INTEGER PRIMARY KEY,
        make_id INTEGER NOT NULL REFERENCES makes(id),
        name TEXT NOT NULL,
        year_start INTEGER,
        year_end INTEGER
      );
      CREATE INDEX idx_models_make_id ON models(make_id);
      CREATE INDEX idx_models_name ON models(name);
    `)
    const insertMake = db.prepare('INSERT INTO makes ("group", name) VALUES (?, ?)')
    const insertModel = db.prepare(
      'INSERT INTO models (make_id, name, year_start, year_end) VALUES (?, ?, ?, ?)',
    )
    let makes = 0
    let models = 0
    const run = db.transaction(() => {
      for (const file of files) {
        for (const make of file.makes) {
          const info = insertMake.run(file.group, make.name)
          makes += 1
          const makeId = Number(info.lastInsertRowid)
          for (const model of make.models) {
            insertModel.run(makeId, model.name, model.yearStart, model.yearEnd)
            models += 1
          }
        }
      }
    })
    run()
    return { makes, models }
  } finally {
    db.close()
  }
}

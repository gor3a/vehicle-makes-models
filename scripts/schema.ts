import { z } from 'zod'

export const modelSchema = z.object({
  name: z.string().min(1),
  yearStart: z.number().int().nullable(),
  yearEnd: z.number().int().nullable(),
})

export const makeSchema = z.object({
  name: z.string().min(1),
  models: z.array(modelSchema),
})

export const makeFileSchema = z.object({
  group: z.string().min(1),
  makes: z.array(makeSchema),
})

export type Model = z.infer<typeof modelSchema>
export type Make = z.infer<typeof makeSchema>
export type MakeFile = z.infer<typeof makeFileSchema>

export type FlatRow = {
  readonly makeGroup: string
  readonly make: string
  readonly model: string
  readonly yearStart: number | null
  readonly yearEnd: number | null
}

// --- Tier-3 nested schemas ---

export const engineSchema = z.object({
  label: z.string(),
  fuelType: z.string().nullable(),
  cylinders: z.number().nullable(),
  displacementCc: z.number().nullable(),
  powerHp: z.number().nullable(),
  torqueNm: z.number().nullable(),
  transmission: z.string().nullable(),
  drivetrain: z.string().nullable(),
  zeroToHundredKmhS: z.number().nullable(),
  topSpeedKmh: z.number().nullable(),
  fuelEconomyCombinedL100: z.number().nullable(),
  lengthMm: z.number().nullable(),
  widthMm: z.number().nullable(),
  heightMm: z.number().nullable(),
  wheelbaseMm: z.number().nullable(),
  curbWeightKg: z.number().nullable(),
  specs: z.record(z.string(), z.string()),
})

export const generationSchema = z.object({
  name: z.string(),
  yearStart: z.number().nullable(),
  yearEnd: z.number().nullable(),
  bodyType: z.string().nullable(),
  engines: z.array(engineSchema),
})

export const fullModelSchema = z.object({
  name: z.string(),
  yearStart: z.number().nullable(),
  yearEnd: z.number().nullable(),
  generations: z.array(generationSchema),
})

export const fullMakeSchema = z.object({
  name: z.string(),
  country: z.string().optional(),
  models: z.array(fullModelSchema),
})

export const fullMakeFileSchema = z.object({
  group: z.string(),
  makes: z.array(fullMakeSchema),
})

export type Engine = z.infer<typeof engineSchema>
export type Generation = z.infer<typeof generationSchema>
export type FullMakeFile = z.infer<typeof fullMakeFileSchema>

export type EngineRow = {
  readonly makeGroup: string
  readonly make: string
  readonly model: string
  readonly generation: string
  readonly genYearStart: number | null
  readonly genYearEnd: number | null
  readonly bodyType: string | null
  readonly engineLabel: string
  readonly fuelType: string | null
  readonly cylinders: number | null
  readonly displacementCc: number | null
  readonly powerHp: number | null
  readonly torqueNm: number | null
  readonly transmission: string | null
  readonly drivetrain: string | null
  readonly zeroToHundredKmhS: number | null
  readonly topSpeedKmh: number | null
  readonly fuelEconomyCombinedL100: number | null
  readonly lengthMm: number | null
  readonly widthMm: number | null
  readonly heightMm: number | null
  readonly wheelbaseMm: number | null
  readonly curbWeightKg: number | null
}

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

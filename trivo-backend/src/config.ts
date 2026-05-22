import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().default('postgres://localhost:5432/trivo'),
  PRIVY_APP_ID: z.string(),
  PRIVY_APP_SECRET: z.string(),
  ARC_RPC_URL: z.string(),
  ARC_CHAIN_ID: z.string().default('5042002'),
  SIMPLE_ORACLE: z.string(),
  COPY_TRADING: z.string(),
  MOCK_PERP: z.string(),
  MOCK_POLYMARKET: z.string(),
  MOCK_LPV3: z.string(),
  FEE_MANAGER: z.string(),
  DEPLOYER_PRIVATE_KEY: z.string().optional(),
  CIRCLE_API_KEY: z.string().optional(),
  CIRCLE_ENTITY_SECRET: z.string().optional(),
})

let _config: z.infer<typeof envSchema> | null = null

function getConfig(): z.infer<typeof envSchema> {
  if (_config) return _config

  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors
    const msg = Object.entries(errors)
      .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
      .join('; ')
    throw new Error(`Config validation failed: ${msg}`)
  }

  _config = result.data
  return _config
}

// Lazy proxy — parses env only on first access
export const config = new Proxy({} as z.infer<typeof envSchema>, {
  get(_, prop: string) {
    return getConfig()[prop as keyof z.infer<typeof envSchema>]
  },
})

export function validateConfig() {
  getConfig()
  console.log('✅ Environment variables validated')
}

export type Config = z.infer<typeof envSchema>

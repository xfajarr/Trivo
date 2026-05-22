import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().default('postgres://localhost:5432/trivo'),

  // Privy Auth
  PRIVY_APP_ID: z.string(),
  PRIVY_APP_SECRET: z.string(),

  // Arc Chain
  ARC_RPC_URL: z.string(),
  ARC_CHAIN_ID: z.string().default('5042002'),

  // Deployed Contracts
  SIMPLE_ORACLE: z.string(),
  COPY_TRADING: z.string(),
  MOCK_PERP: z.string(),
  MOCK_POLYMARKET: z.string(),
  MOCK_LPV3: z.string(),
  FEE_MANAGER: z.string(),

  // Deployer
  DEPLOYER_PRIVATE_KEY: z.string().optional(),

  // Circle (optional)
  CIRCLE_API_KEY: z.string().optional(),
  CIRCLE_ENTITY_SECRET: z.string().optional(),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;

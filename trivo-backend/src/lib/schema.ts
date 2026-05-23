import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  walletAddress: text('wallet_address'),
  email: text('email'),
  displayName: text('display_name'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const agents = pgTable('agents', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  erc8004TokenId: text('erc8004_token_id'),
  erc8004TxHash: text('erc8004_tx_hash'),
  metadataUri: text('metadata_uri'),
  name: text('name').notNull(),
  handle: text('handle').notNull().unique(),
  avatar: text('avatar'),
  hostingType: text('hosting_type'),
  endpoint: text('endpoint'),
  modelProvider: text('model_provider'),
  modelConfig: text('model_config'),
  skills: text('skills'),
  strategy: text('strategy'),
  spendLimit: text('spend_limit'),
  maxLeverage: text('max_leverage'),
  stopLossPct: text('stop_loss_pct'),
  copyTradingAgentId: text('copy_trading_agent_id'),
  circleWalletId: text('circle_wallet_id'),
  circleWalletAddress: text('circle_wallet_address'),
  status: text('status').default('inactive'),
  totalPnl: text('total_pnl').default('0'),
  aum: text('aum').default('0'),
  tradeCount: text('trade_count').default('0'),
  winRate: text('win_rate').default('0'),
  copiers: text('copiers').default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const agentSessions = pgTable('agent_sessions', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  sessionData: text('session_data'),
  systemPrompt: text('system_prompt'),
  modelProvider: text('model_provider'),
  modelConfig: text('model_config'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const agentMemory = pgTable('agent_memory', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  type: text('type'),
  content: text('content'),
  reasoning: text('reasoning'),
  metadata: text('metadata'),
  txHash: text('tx_hash'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const userMemory = pgTable('user_memory', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type'),
  content: text('content'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const positions = pgTable('positions', {
  id: text('id').primaryKey(),
  copyTradingPositionId: text('copy_trading_position_id'),
  agentId: text('agent_id').notNull(),
  venue: text('venue'),
  market: text('market').notNull(),
  side: text('side').notNull(),
  size: text('size').notNull(),
  entryPrice: text('entry_price').notNull(),
  markPrice: text('mark_price'),
  leverage: text('leverage'),
  pnl: text('pnl').default('0'),
  pnlPct: text('pnl_pct').default('0'),
  copies: text('copies').default('0'),
  status: text('status').default('open'),
  txHash: text('tx_hash'),
  reasoning: text('reasoning'),
  openedAt: timestamp('opened_at').defaultNow(),
  closedAt: timestamp('closed_at'),
})

export const copyRelations = pgTable('copy_relations', {
  id: text('id').primaryKey(),
  followerAgentId: text('follower_agent_id').notNull(),
  targetAgentId: text('target_agent_id').notNull(),
  allocationBps: text('allocation_bps').notNull(),
  active: text('active').default('true'),
  startedAt: timestamp('started_at').defaultNow(),
  totalCopied: text('total_copied').default('0'),
  totalPnl: text('total_pnl').default('0'),
})

export const feedEvents = pgTable('feed_events', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  type: text('type'),
  data: text('data'),
  venue: text('venue'),
  pair: text('pair'),
  side: text('side'),
  size: text('size'),
  txHash: text('tx_hash'),
  reasoning: text('reasoning'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const skills = pgTable('skills', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  venue: text('venue'),
  icon: text('icon'),
  skillMdCid: text('skill_md_cid'),
  config: text('config'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const agentTools = pgTable('agent_tools', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  toolName: text('tool_name').notNull(),
  enabled: text('enabled').default('true'),
  config: text('config'),
  createdAt: timestamp('created_at').defaultNow(),
})

# Project Learnings

> Managed by `/learn`. Append-only — latest entry wins on conflicts.

## Patterns

### hono-typescript-backend
- **Insight:** Hono + TypeScript + tsx for backend API with Drizzle ORM for PostgreSQL. Clean route organization with 14 route files under routes/ and 12 service files under services/. Config validated with zod.
- **Confidence:** 9/10
- **Source:** manual
- **Files:** trivo-backend/src/index.ts, trivo-backend/src/config.ts, trivo-backend/src/lib/schema.ts
- **Date:** 2026-05-23

### viem-arc-integration
- **Insight:** Use viem for Arc Testnet (chain 5042002) contract interactions. Create wallet client from private key, writeContract for state changes, readContract for views. Always waitForTransactionReceipt after writes.
- **Confidence:** 9/10
- **Source:** manual
- **Files:** trivo-backend/src/services/contract.service.ts
- **Date:** 2026-05-23

### agent-engine-v2-loop
- **Insight:** 10-second AI agent loop: THINK → DECIDE → EXECUTE. Load market data + memory, call LLM for analysis, get structured JSON decision, execute via tool system, save to DB, broadcast via WebSocket.
- **Confidence:** 9/10
- **Source:** manual
- **Files:** trivo-backend/src/services/agent-engine-v2.ts
- **Date:** 2026-05-23

### tool-system-pattern
- **Insight:** Tool registry with JSON Schema parameter validation. Tools (get_price, open_trade, close_trade) registered in tools/registry.ts. Each tool has execute(agentId, args) returning {success, txHash, error}.
- **Confidence:** 8/10
- **Source:** manual
- **Files:** trivo-backend/src/services/tools/registry.ts, trivo-backend/src/services/tools/*.tool.ts
- **Date:** 2026-05-23

### tanstack-query-hooks
- **Insight:** Frontend uses TanStack Query with 7 custom hooks (useAuth, useAgents, useFeed, usePositions, useWallet, useMemory, useWebSocket). Axios client with auth interceptor. 30s refetch for agents, 15s for feed.
- **Confidence:** 9/10
- **Source:** manual
- **Files:** trivo-frontend/src/hooks/*.ts, trivo-frontend/src/lib/api.ts
- **Date:** 2026-05-23

## Pitfalls

### frontend-mock-data-usage
- **Insight:** 6 frontend files still import from mock-data.ts (launch.tsx, agent.$id.tsx, discover.tsx, my-agents.tsx, PositionsTimeline.tsx, CopyTradeModal.tsx). Need to migrate to real API hooks.
- **Confidence:** 9/10
- **Source:** manual
- **Files:** trivo-frontend/src/routes/launch.tsx, trivo-frontend/src/routes/discover.tsx, trivo-frontend/src/routes/my-agents.tsx, trivo-frontend/src/routes/agent.$id.tsx
- **Date:** 2026-05-23

### missing-privy-react-auth
- **Insight:** Frontend AuthProvider exists but @privy-io/react-auth not installed yet. Need to install and configure for wallet connect flow.
- **Confidence:** 8/10
- **Source:** manual
- **Files:** trivo-frontend/src/providers/AuthProvider.tsx
- **Date:** 2026-05-23

### custom-errors-no-require
- **Insight:** All Solidity contracts use custom errors, never require(). Pattern: if (condition) revert ErrorName(). Access control via onlyOwner modifier with custom NotAuthorized error.
- **Confidence:** 10/10
- **Source:** manual
- **Files:** trivo-contracts/src/*.sol
- **Date:** 2026-05-23

## Preferences

### openai-compatible-ai-sdk
- **Insight:** Use OpenAI-compatible SDK for AI models. Env vars AI_PROVIDER, AI_BASE_URL, AI_MODEL, AI_API_KEY support any provider (OpenRouter, TokenRouter, DeepSeek, Claude, OpenAI, Qwen, BYOK).
- **Confidence:** 9/10
- **Source:** manual
- **Files:** trivo-backend/src/services/models/provider.ts, trivo-backend/.env
- **Date:** 2026-05-23

### circle-dev-controlled-wallets
- **Insight:** Use Circle Developer-Controlled Wallets for non-custodial agent wallet creation. MPC-based, spending policies, entity secret registration required.
- **Confidence:** 8/10
- **Source:** manual
- **Files:** trivo-backend/src/services/wallet.service.ts
- **Date:** 2026-05-23

## Architecture

### contract-dependency-graph
- **Insight:** SimpleOracle is the price source for all venue contracts (MockPerp, MockPolymarket, MockLPV3). CopyTrading aggregates positions from all venues. FeeManager handles fee distribution from CopyTrading.
- **Confidence:** 10/10
- **Source:** manual
- **Files:** trivo-contracts/src/*.sol
- **Date:** 2026-05-23

### cron-job-architecture
- **Insight:** 4 cron jobs: market-data (60s, CoinGecko → Oracle), agent-processing (30s, rule-based), pnl-watcher (60s, auto-close >2%), agent-engine-v2 (10s, AI loop). Started after 1s delay in index.ts.
- **Confidence:** 9/10
- **Source:** manual
- **Files:** trivo-backend/src/services/cron.ts, trivo-backend/src/index.ts
- **Date:** 2026-05-23

### websocket-streaming
- **Insight:** WebSocket for real-time agent event streaming. broadcastAgentEvent() called at each stage of agent loop (THINK, DECIDE, EXECUTE). Frontend useWebSocket hook connects per agent.
- **Confidence:** 8/10
- **Source:** manual
- **Files:** trivo-backend/src/services/ws.ts, trivo-frontend/src/hooks/useWebSocket.ts
- **Date:** 2026-05-23

## Tools

### foundry-solidity-development
- **Insight:** Use Foundry for Solidity 0.8.28 contracts on Arc Testnet. forge build, forge test (89 tests), forge script for deployment. All contracts verified on Arcscan.
- **Confidence:** 10/10
- **Source:** manual
- **Files:** trivo-contracts/
- **Date:** 2026-05-23

### scalar-api-docs
- **Insight:** OpenAPI 3.1 spec at /api/docs.json, Scalar UI at /api/docs. setupDocs(app) in lib/openapi.ts.
- **Confidence:** 8/10
- **Source:** manual
- **Files:** trivo-backend/src/lib/openapi.ts
- **Date:** 2026-05-23

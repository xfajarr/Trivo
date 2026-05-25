# End-to-End Real Flow Tickets

Source plan: `docs/superpowers/plans/2026-05-24-end-to-end-real-flow.md`

> Draft tickets only. Not published to GitHub/issues tracker yet.

---

## Ticket 1 — Fix agent provisioning so Circle wallet is always created

**Type:** AFK  
**Blocked by:** None - can start immediately

### What to build

When a user creates a Trivo-hosted agent, backend provisioning must independently attempt ERC-8004 registration and Circle wallet creation. Circle wallet creation must not depend on ERC-8004 failure. A successful agent creation should return wallet metadata when Circle config is valid, while ERC-8004 failure remains non-blocking.

### Acceptance criteria

- [ ] Creating an agent attempts ERC-8004 registration once.
- [ ] Creating an agent attempts Circle wallet creation once when ERC-8004 succeeds.
- [ ] Creating an agent attempts Circle wallet creation once when ERC-8004 fails.
- [ ] Agent creation still returns `201` if ERC-8004 registration fails but DB insert succeeds.
- [ ] Created agent record includes `circleWalletId` and `circleWalletAddress` when Circle wallet creation succeeds.
- [ ] Backend test covers both ERC-8004 success and failure paths.
- [ ] `pnpm run typecheck` passes in `trivo-backend/`.

---

## Ticket 2 — Backend wallet transfer is out of scope for this pass

**Type:** AFK  
**Blocked by:** None - deferred

### What to build

This slice is deferred. No backend wallet transfer/deposit work will be done in this pass.

### Acceptance criteria

- [ ] Ticket intentionally deferred.
- [ ] No implementation changes are made for this slice in the current pass.

---

## Ticket 3 — Frontend wallet funding UI is out of scope for this pass

**Type:** AFK  
**Blocked by:** None - deferred

### What to build

This slice is deferred. No frontend wallet funding/transfer wiring will be done in this pass.

### Acceptance criteria

- [ ] Ticket intentionally deferred.
- [ ] No implementation changes are made for this slice in the current pass.

---

## Ticket 4 — Add backend market candle endpoint for chart data

**Type:** AFK  
**Blocked by:** None - can start immediately

### What to build

Add a backend market data endpoint that returns OHLC candles for a symbol/timeframe/limit. It should prefer real market-derived prices and provide deterministic fallback candles when historical provider data is unavailable. This enables chart rendering without frontend-randomized candles.

### Acceptance criteria

- [ ] `GET /api/market/candles?symbol=BTC/USD&timeframe=1m&limit=120` returns symbol, timeframe, and candle array.
- [ ] Candle objects include `time`, `open`, `high`, `low`, `close`, and `volume`.
- [ ] Supported timeframes include `1m`, `5m`, `15m`, `1h`, `4h`, and `1d`.
- [ ] Unsupported timeframe returns `400`.
- [ ] Limit is bounded between 10 and 500.
- [ ] Candles are deterministic/market-derived, not random per render.
- [ ] Backend tests cover valid request and invalid timeframe.
- [ ] Route is mounted under `/api/market`.
- [ ] `pnpm run typecheck` passes in `trivo-backend/`.

---

## Ticket 5 — Replace frontend random chart candles with backend candles and trade markers

**Type:** AFK  
**Blocked by:** Ticket 4

### What to build

Update the agent detail chart to fetch candles from backend and render them through `lightweight-charts`. The chart should overlay actual trade markers from position history and stop generating random OHLC values on the client.

### Acceptance criteria

- [ ] Frontend API client includes typed `marketApi.candles` method.
- [ ] New hook fetches candles with symbol, timeframe, and limit.
- [ ] Agent detail page calls backend candle endpoint.
- [ ] `AgentChart` renders backend candles only.
- [ ] Random/local OHLC generation is removed from `AgentChart`.
- [ ] Trade markers are derived from position history/opened trades.
- [ ] Empty/loading chart states are handled cleanly.
- [ ] `bun run build` passes in `trivo-frontend/`.

---

## Ticket 6 — Remove or quarantine legacy backend engine stack

**Type:** AFK  
**Blocked by:** None - can start immediately

### What to build

Make `src/engine/*` the canonical trading engine. Remove legacy engine code if unused, or mark it clearly deprecated if tests/imports still require migration. Runtime code should not import or start `src/services/agent-engine-v2.ts` or old `src/services/tools/*`.

### Acceptance criteria

- [ ] Search confirms runtime entrypoint starts only the new `src/engine/*` engine.
- [ ] No runtime import depends on `agent-engine-v2`.
- [ ] No runtime import depends on old `src/services/tools/*` stack.
- [ ] Legacy files are either deleted or marked `@deprecated` with explicit canonical replacement guidance.
- [ ] Any tests importing legacy tools are migrated or intentionally documented.
- [ ] `pnpm run check` passes in `trivo-backend/`.

---

## Ticket 7 — Refresh OpenAPI docs for active app endpoints

**Type:** AFK  
**Blocked by:** Ticket 4

### What to build

Update the manually maintained OpenAPI spec so `/api/docs` and `/api/docs.json` match the endpoints currently used by the frontend and new wallet/market flows.

### Acceptance criteria

- [ ] Docs include `GET /api/pnl/agents/{id}`.
- [ ] Docs include `GET /api/positions/history/{agentId}`.
- [ ] Docs include `POST /api/chat`.
- [ ] Docs include `POST /api/chat/agent/{id}`.
- [ ] Docs include `GET /api/market/candles` with explicit candle schema.
- [ ] Docs include current model routes.
- [ ] `/api/docs.json` formats as valid JSON.
- [ ] `pnpm run typecheck` passes in `trivo-backend/`.

---

## Ticket 8 — Run and document full end-to-end demo verification

**Type:** HITL  
**Blocked by:** Tickets 1, 4, 5, 6, 7

### What to build

Verify the complete demo path manually with backend, frontend, and contracts. This ticket should produce a short verification note that says what worked, what failed due to config/external services, and what remains unsafe to demo without caveats.

### Acceptance criteria

- [ ] Backend starts without realtime WebSocket crash loop.
- [ ] Frontend starts and connects to backend.
- [ ] User can connect wallet through Privy.
- [ ] User can create a Trivo-hosted agent.
- [ ] Created agent is active and visible in Discover/My Agents.
- [ ] Created agent has Circle wallet metadata when config is valid.
- [ ] Agent chart calls `/api/market/candles` and renders candles.
- [ ] Agent engine can create feed/position activity within demo wait window, or blocker is documented.
- [ ] `pnpm run check` passes in `trivo-backend/` or failures are documented.
- [ ] `bun run build && bun run lint` passes in `trivo-frontend/` or failures are documented.
- [ ] `forge test` passes in `trivo-contracts/` or failures are documented.
- [ ] Verification note is added to project docs or ticket comment.

---

## Ticket 9 — Demo polish: replace fake landing/copy states with truthful status signals

**Type:** AFK  
**Blocked by:** Ticket 8

### What to build

Clean up high-visibility demo truth gaps after the core flow works. Landing page should not link to fake agent IDs, copy buttons should either call the real API or be labeled unavailable, and agent cards should show provisioning state for ERC-8004 and Circle wallet.

### Acceptance criteria

- [ ] Landing page fake `/agent/1`, `/agent/2`, etc links are removed or replaced with real agent links.
- [ ] Landing stats are real API-backed or clearly static marketing stats.
- [ ] Copy trade button calls real copy API or is disabled with an explicit message.
- [ ] Agent cards show ERC-8004 registered/pending/failed status when data exists.
- [ ] Agent cards show Circle wallet ready/pending/failed status when data exists.
- [ ] Wallet provider errors are visible enough for demo debugging.
- [ ] UI includes a concise “mock venue execution on Arc Testnet” disclosure near trade history or footer.
- [ ] `bun run build` passes in `trivo-frontend/`.

---

# Dependency Graph

```txt
Ticket 1 ────────────────┐
                         v
Ticket 4 ─────────────> Ticket 5 ├─> Ticket 8 ─> Ticket 9
                                    │
Ticket 6 ───────────────────────────┤
Ticket 7 <────────────── Ticket 4 ──┘
```

# Suggested Implementation Order

1. Ticket 1 — Fix agent wallet provisioning bug.
2. Ticket 4 — Add backend candles endpoint. Can run parallel with Ticket 1.
3. Ticket 5 — Wire chart to backend candles.
4. Ticket 6 — Clean backend engine drift.
5. Ticket 7 — Refresh OpenAPI docs.
6. Ticket 8 — Manual end-to-end verification.
7. Ticket 9 — Demo polish.

# Proposed Labels

- `type:feature`
- `type:bug`
- `type:docs`
- `type:refactor`
- `priority:p0`
- `priority:p1`
- `area:backend`
- `area:frontend`
- `area:market-data`
- `area:engine`
- `area:docs`
- `needs-hitl`
- `afk-ready`

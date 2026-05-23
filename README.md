# Trivo — The Identity Layer for AI Trading Agents on Arc

**Agora Agents Hackathon** — Canteen × Circle × Arc  
**Submission for RFB 06: Social Trading Intelligence**

Trivo provides persistent on-chain identities for AI trading agents, enabling intelligent copy trading with verifiable performance, automatic fee distribution, and seamless settlement on Arc using USDC.

## Problem

Copy trading today remains fundamentally blind. AI agents produce sophisticated reasoning and trade decisions, yet they lack portable on-chain identity and verifiable track records. Capital allocators follow wallet addresses rather than proven strategies, with no reliable mechanism to evaluate edge, detect strategy degradation, or allocate capital intelligently across multiple agents.

While Polymarket V2, Hyperliquid, and other venues have introduced builder codes and attribution primitives, these systems remain siloed. There is no unified identity layer that allows agents to maintain reputation across venues while enabling capital to flow toward demonstrated performance.

Arc fundamentally changes the economics. With sub-second deterministic finality and approximately $0.01 USDC transaction costs, high-frequency, performance-aware copy trading becomes practical for the first time.

## Solution

Trivo is the identity and coordination layer for AI trading agents on Arc. The platform enables users to launch agents with persistent on-chain identities (ERC-8004), configure their trading logic through natural language, and participate in a copy trading network where performance is tracked on-chain and fees are distributed automatically.

Agents receive a unique builder code that travels with every trade across venues. Copy traders can discover agents through a real-time feed of verified positions and allocate capital based on transparent, on-chain performance metrics rather than opaque wallet history.

## Key Capabilities

- Persistent on-chain agent identity using ERC-8004 with embedded builder codes
- Circle Agent Wallets with configurable spending policies and MPC security
- Intelligent copy trading with dynamic, performance-based fee splits
- Real-time position feed across perpetuals, prediction markets, liquidity provision, and yield strategies
- Multi-model AI configuration (Claude, DeepSeek, OpenAI, Qwen, or bring-your-own-key)
- Support for both hosted and self-hosted agent runtimes
- On-chain attribution and automatic fee distribution to agent creators

## Technology Stack

**Settlement Layer**  
Arc Testnet (Chain ID: 5042002) — USDC as native gas token with sub-second deterministic finality.

**Circle Integration**  
- Circle Developer-Controlled and Agent Wallets with spending policy controls  
- Gateway and Unified Balance for cross-chain USDC management  
- App Kit components for bridge, swap, send, and unified balance operations  
- CCTP for efficient cross-venue collateral movement  
- Nanopayments for micro-fee distribution  
- Smart Contract Platform for position and fee management  

**Smart Contracts**  
Solidity smart contracts built with Foundry (`CopyTrading.sol`, `FeeManager.sol`, Identity Registry, and supporting mock contracts).

**Backend**  
Fastify + TypeScript with Drizzle ORM and PostgreSQL for agent orchestration, memory management, and real-time position routing.

**Frontend**  
React application built with TanStack Start and shadcn/ui components, providing real-time feed, agent launcher, and copy trading interface.

**AI Layer**  
Structured output routing across multiple LLMs with natural language strategy configuration and persistent memory.

## Project Structure

```
trivo/
├── trivo-contracts/          # Foundry project with core smart contracts and tests
├── trivo-backend/            # Fastify API layer and agent coordination service
├── trivo-frontend/           # React + TanStack Start frontend
├── docs/                     # Architecture decisions and phase plans
├── PRD.md                    # Full product requirements document
└── README.md
```

## Getting Started

### Prerequisites
- Arc Testnet USDC (via Circle testnet infrastructure)
- Circle developer credentials for wallet and contract operations

### Local Development

**Contracts**
```bash
cd trivo-contracts
forge install
forge test
```

**Backend**
```bash
cd trivo-backend
cp .env.example .env
pnpm install
pnpm dev
```

**Frontend**
```bash
cd trivo-frontend
cp .env.example .env
pnpm install
pnpm dev
```

Live deployment URL and a 3-minute demo video are included in the submission form.

## Hackathon Alignment

This submission addresses **RFB 06: Social Trading Intelligence** — moving beyond blind copy trading toward AI-driven selection, weighting, monitoring, and risk management of trading strategies with on-chain verifiable identity.

### Judging Criteria

We have designed Trivo to perform strongly across all four dimensions:

**30% Agentic Sophistication**  
Trivo agents exercise substantial autonomy. They interpret natural language objectives, maintain persistent memory, reason across multiple models, evaluate real-time market data from multiple venues, and generate structured trade decisions with configurable risk parameters. The architecture supports both fully autonomous hosted agents and self-hosted agents that return validated decisions for on-chain execution.

**30% Traction**  
The platform is built for rapid user adoption. The real-time feed combined with one-click copy trading enables immediate user participation and feedback. During the hackathon window we will demonstrate real user signups, copy operations, executed trades, and qualitative validation from users.

**20% Circle Tool Usage**  
Trivo makes extensive and creative use of the Circle developer platform, including:
- Circle Agent Wallets with spending policies and MPC security
- Gateway for unified USDC balance and sub-500ms cross-chain transfers
- App Kit for bridge, swap, send, and unified balance flows
- CCTP for efficient collateral movement between venues
- Nanopayments for gasless micro-fee distribution
- Smart Contract Platform for position management and fee settlement
- USDC as the native gas, settlement, and incentive token on Arc

**20% Innovation**  
Trivo introduces a unified on-chain identity primitive (ERC-8004 combined with portable builder codes) that bridges previously siloed attribution systems across prediction markets, perpetual futures, and DeFi venues. By combining persistent agent reputation with intelligent, performance-aware copy trading and automatic on-chain fee distribution, the project creates a new coordination layer between AI agents and capital allocators.

## Submission Requirements

Judging for the Agora Agents Hackathon is asynchronous. There is no live demo day or final presentation. Judges will review submissions after the May 25 deadline at their own pace and may interact directly with the live product and GitHub repository without the team present.

Each submission includes:

- **Video Demo (Required)**: A recorded walkthrough (Loom, YouTube, or Vimeo). Maximum 3 minutes recommended. This serves as the guided tour.
- **Live Product Link (Strongly Encouraged)**: A working URL where judges can explore the application hands-on.
- **Public GitHub Repository (Required)**: Judges will read the repository directly and interact with the codebase.

Traction is a core part of the submission. The form requires a written report on the number of real users who have tried the product and what validation was received from them. As the judging criteria make clear, real users, real transactions, and real volume during the event window carry equal weight with agentic sophistication.

The judging panel consists of operators with backgrounds at Solana, Coinbase, Arc/Circle, and Protocol Labs. They have built and shipped payments infrastructure and companies, and will review this repository and product as practicing builders rather than spectators.

---

**Submission Deadline**: May 25, 2026  
**Form**: https://forms.gle/ok3Gr9zhmHnApvK48

Built for the Agora.

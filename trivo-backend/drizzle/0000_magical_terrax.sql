CREATE TABLE "agent_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"cycle_id" text NOT NULL,
	"market" text,
	"action" text NOT NULL,
	"tool_name" text,
	"tool_args" text,
	"raw_confidence" text,
	"calibrated_confidence" text,
	"risk_level" text,
	"market_regime_id" text,
	"committee_summary" text,
	"risk_decision" text,
	"risk_reason" text,
	"final_reasoning" text,
	"tx_hash" text,
	"position_id" text,
	"status" text DEFAULT 'proposed',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_memory" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"type" text,
	"content" text,
	"reasoning" text,
	"metadata" text,
	"tx_hash" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_reflections" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"decision_id" text,
	"position_id" text,
	"outcome_pnl" text,
	"outcome_pnl_pct" text,
	"was_correct" text,
	"lesson" text,
	"mistake_pattern" text,
	"improvement" text,
	"usable_in_prompt" text DEFAULT 'true',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_risk_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"max_open_positions" text,
	"max_leverage_x" text,
	"max_trade_usd" text,
	"max_daily_loss_usd" text,
	"min_confidence_open" text,
	"min_confidence_close" text,
	"cooldown_minutes" text,
	"block_if_regime" text,
	"require_committee_quorum" text,
	"enabled" text DEFAULT 'true',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_scorecards" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"window" text NOT NULL,
	"trivo_score" text,
	"realized_pnl_score" text,
	"win_rate_score" text,
	"drawdown_score" text,
	"consistency_score" text,
	"risk_adjusted_score" text,
	"explanation_score" text,
	"total_trades" text,
	"max_drawdown_pct" text,
	"sharpe_like_ratio" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"session_data" text,
	"system_prompt" text,
	"model_provider" text,
	"model_config" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_skill_packs" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"skill_pack_id" text NOT NULL,
	"active" text DEFAULT 'true',
	"config" text,
	"assigned_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_tools" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"tool_name" text NOT NULL,
	"enabled" text DEFAULT 'true',
	"config" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"erc8004_token_id" text,
	"erc8004_tx_hash" text,
	"metadata_uri" text,
	"name" text NOT NULL,
	"handle" text NOT NULL,
	"avatar" text,
	"hosting_type" text,
	"endpoint" text,
	"model_provider" text,
	"model_config" text,
	"skills" text,
	"strategy" text,
	"spend_limit" text,
	"max_leverage" text,
	"stop_loss_pct" text,
	"copy_trading_agent_id" text,
	"circle_wallet_id" text,
	"circle_wallet_address" text,
	"status" text DEFAULT 'inactive',
	"total_pnl" text DEFAULT '0',
	"aum" text DEFAULT '0',
	"trade_count" text DEFAULT '0',
	"win_rate" text DEFAULT '0',
	"copiers" text DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "agents_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "committee_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"decision_id" text NOT NULL,
	"cycle_id" text NOT NULL,
	"role" text NOT NULL,
	"stance" text NOT NULL,
	"confidence" text,
	"summary" text,
	"evidence" text,
	"model_provider" text,
	"latency_ms" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "copy_relations" (
	"id" text PRIMARY KEY NOT NULL,
	"follower_agent_id" text NOT NULL,
	"target_agent_id" text NOT NULL,
	"allocation_bps" text NOT NULL,
	"active" text DEFAULT 'true',
	"started_at" timestamp DEFAULT now(),
	"total_copied" text DEFAULT '0',
	"total_pnl" text DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "feed_events" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"type" text,
	"data" text,
	"venue" text,
	"pair" text,
	"side" text,
	"size" text,
	"tx_hash" text,
	"reasoning" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "market_regimes" (
	"id" text PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"timeframe" text NOT NULL,
	"regime" text NOT NULL,
	"trend_score" text,
	"volatility_score" text,
	"liquidity_score" text,
	"sentiment_shock_score" text,
	"confidence" text,
	"evidence" text,
	"source" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" text PRIMARY KEY NOT NULL,
	"copy_trading_position_id" text,
	"agent_id" text NOT NULL,
	"venue" text,
	"market" text NOT NULL,
	"side" text NOT NULL,
	"size" text NOT NULL,
	"entry_price" text NOT NULL,
	"mark_price" text,
	"leverage" text,
	"pnl" text DEFAULT '0',
	"pnl_pct" text DEFAULT '0',
	"copies" text DEFAULT '0',
	"status" text DEFAULT 'open',
	"tx_hash" text,
	"reasoning" text,
	"opened_at" timestamp DEFAULT now(),
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "skill_packs" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"config" text,
	"tool_names" text,
	"committee_roles" text,
	"enabled" text DEFAULT 'true',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"venue" text,
	"icon" text,
	"skill_md_cid" text,
	"config" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_memory" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text,
	"content" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet_address" text,
	"email" text,
	"display_name" text,
	"avatar" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

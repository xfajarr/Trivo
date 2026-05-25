CREATE TABLE "agent_events" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"type" text NOT NULL,
	"data" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"sequence" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_pnl_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"window" text NOT NULL,
	"realized_pnl" text,
	"unrealized_pnl" text,
	"total_pnl" text,
	"open_positions" text,
	"closed_positions" text,
	"winning_positions" text,
	"losing_positions" text,
	"win_rate" text,
	"sharpe_ratio" text,
	"max_drawdown" text,
	"portfolio_value" text,
	"snapshot_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trade_outcomes" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"decision_id" text,
	"position_id" text,
	"market" text NOT NULL,
	"side" text NOT NULL,
	"size" text NOT NULL,
	"entry_price" text NOT NULL,
	"exit_price" text NOT NULL,
	"gross_pnl" text,
	"fees" text DEFAULT '0',
	"net_pnl" text,
	"pnl_pct" text,
	"hold_time_ms" text,
	"was_correct" text,
	"won" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "unrealized_pnl" text;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "realized_pnl" text;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "realized_pnl_pct" text;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "fees" text DEFAULT '0';--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "net_pnl" text;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "closed_by" text;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "decision_id" text;
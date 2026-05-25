export const API_BASE = import.meta.env.VITE_API_URL || "https://trivo-production.up.railway.app";
export const WS_BASE = API_BASE.replace(/^http/, "ws");

export const VENUES = ["perp", "prediction", "lp", "yield", "spot"] as const;

export const VENUE_LABEL: Record<string, string> = {
  perp: "Perpetuals",
  prediction: "Prediction",
  lp: "Liquidity",
  yield: "Yield",
  spot: "Spot",
};

export const VENUE_EMOJI: Record<string, string> = {
  perp: "⚡",
  prediction: "🎯",
  lp: "💧",
  yield: "🌾",
  spot: "💱",
};

export const MODEL_LABEL: Record<string, string> = {
  deepseek: "DeepSeek",
  claude: "Claude",
  openai: "OpenAI",
  qwen: "Qwen",
  byok: "Bring Your Own Key",
};

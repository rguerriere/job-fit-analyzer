import { config as loadEnv } from "dotenv";

loadEnv({ quiet: true });

const EFFORTS = ["low", "medium", "high"] as const;
export type Effort = (typeof EFFORTS)[number];

function readEffort(): Effort {
  const value = process.env.ANTHROPIC_EFFORT ?? "medium";
  if (!(EFFORTS as readonly string[]).includes(value)) {
    throw new Error(`ANTHROPIC_EFFORT must be one of ${EFFORTS.join(", ")} (got "${value}").`);
  }
  return value as Effort;
}

export function getConfig() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and paste your key from console.anthropic.com.",
    );
  }
  return {
    apiKey,
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    effort: readEffort(),
  };
}

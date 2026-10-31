import { config as loadEnv } from "dotenv";

// Next.js loads .env itself; this is for the command-line tools.
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

/** App-wide model settings. The API key is per user, so it is not part of this. */
export function getModelSettings() {
  return {
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    effort: readEffort(),
  };
}

/** The developer's own key from .env, used by the command-line tools. */
export function getEnvApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and paste your key from console.anthropic.com.",
    );
  }
  return apiKey;
}

import { ChatAnthropic } from "@langchain/anthropic";
import { getConfig } from "./config.js";

/**
 * Creates the Claude chat model used across the app.
 *
 * - Effort controls how much the model thinks (and therefore cost/latency).
 * - Server-side fallbacks: if Claude's safety classifiers decline a request,
 *   Anthropic automatically retries it on a suitable fallback model.
 */
export function createModel() {
  const { apiKey, model, effort } = getConfig();
  return new ChatAnthropic({
    apiKey,
    model,
    maxTokens: 16000,
    outputConfig: { effort },
    betas: ["server-side-fallback-2026-07-01"],
    invocationKwargs: { fallbacks: "default" },
  });
}

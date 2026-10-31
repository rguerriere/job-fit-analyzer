import { ChatAnthropic } from "@langchain/anthropic";
import { getModelSettings } from "./config";

/**
 * Creates the Claude chat model, billed to the given API key.
 *
 * - Effort controls how much the model thinks (and therefore cost/latency).
 * - Server-side fallbacks: if Claude's safety classifiers decline a request,
 *   Anthropic automatically retries it on a suitable fallback model.
 */
export function createModel(apiKey: string) {
  const { model, effort } = getModelSettings();
  return new ChatAnthropic({
    apiKey,
    model,
    maxTokens: 16000,
    outputConfig: { effort },
    betas: ["server-side-fallback-2026-07-01"],
    invocationKwargs: { fallbacks: "default" },
  });
}

/**
 * Checks a key by listing models. This endpoint is free, so saving a key costs nothing.
 */
export async function checkApiKey(key: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      cache: "no-store",
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: "Anthropic rejected this key. Check that you copied all of it and that it hasn't been revoked.",
      };
    }
    return { ok: false, message: `Anthropic returned an error (${res.status}). Try again in a moment.` };
  } catch {
    return { ok: false, message: "Couldn't reach Anthropic to check the key. Check your internet connection." };
  }
}

export function maskKey(key: string): string {
  return `${key.slice(0, 10)}…${key.slice(-4)}`;
}

/** Turns an error from the Anthropic API into a message a user can act on. */
export function describeApiError(err: unknown): string {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : String(err);

  if (status === 401) return "Your Anthropic API key was rejected. Update it in Settings.";
  if (/credit balance/i.test(message)) {
    return "Your Anthropic account is out of credits. Add credits at console.anthropic.com, then try again.";
  }
  if (status === 429) return "Anthropic's rate limit was reached. Wait a minute and try again.";
  if (status === 529 || /overloaded/i.test(message)) {
    return "Claude is busy right now. Try again in a minute.";
  }
  return `Something went wrong talking to Claude: ${message}`;
}

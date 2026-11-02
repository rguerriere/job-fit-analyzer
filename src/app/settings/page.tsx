import { maskKey } from "@/lib/anthropicKey";
import { getCurrentUser } from "@/lib/currentUser";
import { ApiKeyForm } from "./ApiKeyForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold">Anthropic API key</h2>
          <p className="mt-1 text-sm text-fg-muted">
            The app calls Claude with your own key, so usage is billed to your Anthropic account. Create a key at{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              console.anthropic.com
            </a>
            . Saving checks that the key works, which costs nothing.
          </p>
        </div>
        <ApiKeyForm maskedKey={user.anthropicApiKey ? maskKey(user.anthropicApiKey) : null} />
      </section>
    </div>
  );
}

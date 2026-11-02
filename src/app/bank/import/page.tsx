import Link from "next/link";
import { getCurrentUser } from "@/lib/currentUser";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/bank" className="text-sm text-primary hover:underline">
          ← Career bank
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Add to your career bank</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Claude splits your resume or notes into separate entries. You review and edit them before anything is saved.
        </p>
      </div>

      {user.anthropicApiKey ? (
        <ImportForm />
      ) : (
        <div className="card">
          <p className="font-medium">Add your API key first</p>
          <p className="mt-1 text-sm text-fg-muted">
            Reading your resume uses Claude, which needs your Anthropic API key.
          </p>
          <Link href="/settings" className="btn btn-primary mt-3">
            Go to Settings
          </Link>
        </div>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { analyzePosting } from "./actions";

export function AnalyzeForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, startAnalyze] = useTransition();

  function analyze(formData: FormData) {
    setError(null);
    startAnalyze(async () => {
      const result = await analyzePosting(formData);
      // Open the saved result on the Opportunities page.
      if (result.ok) router.push(`/opportunities?open=${result.id}`);
      else setError(result.error);
    });
  }

  return (
    <form action={analyze} className="card space-y-4">
      <div>
        <label htmlFor="posting" className="label">
          Job posting
        </label>
        <textarea
          id="posting"
          name="posting"
          rows={14}
          required
          className="input"
          placeholder="Paste the full posting, including the requirements and any 'nice to have' section."
        />
      </div>

      {error && <p className="alert-error">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={isAnalyzing}>
          {isAnalyzing ? "Analyzing…" : "Analyze fit"}
        </button>
        {isAnalyzing && (
          <span className="text-sm text-fg-muted">
            Claude reads the posting, then checks each requirement against your career bank. This usually takes
            30–60 seconds.
          </span>
        )}
      </div>
    </form>
  );
}

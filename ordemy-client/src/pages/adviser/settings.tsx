import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, LockKeyhole, Save } from "lucide-react";
import { ApiError } from "../../lib/api";
import { fetchAiSettings, saveAiSettings } from "./api";
import { AdviserCard, AdviserNotice, AdviserPageIntro } from "./shared";

const DEFAULT_MODEL = "openai/gpt-oss-20b";

export default function AdviserSettings() {
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [apiKey, setApiKey] = useState("");
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    fetchAiSettings()
      .then((settings) => {
        if (!active) return;
        setModel(settings.model);
        setKeyConfigured(settings.keyConfigured);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof ApiError || loadError instanceof Error
              ? loadError.message
              : "Could not load AI settings.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!keyConfigured && !apiKey.trim()) {
      setError("Enter your Groq API key to configure AI grouping.");
      return;
    }
    setSaving(true);
    try {
      await saveAiSettings(apiKey.trim(), model.trim());
      setApiKey("");
      setKeyConfigured(true);
      setSuccess("AI settings saved. Your API key is encrypted and never shown again.");
    } catch (saveError: unknown) {
      setError(
        saveError instanceof ApiError || saveError instanceof Error
          ? saveError.message
          : "Could not save your AI settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdviserPageIntro
        eyebrow="Configuration"
        title="AI settings"
        description="Connect a Groq API key for scheduled question grouping. Secrets are stored encrypted and are never returned to the browser."
      />
      {error && <AdviserNotice dismiss={() => setError("")}>{error}</AdviserNotice>}
      {success && (
        <AdviserNotice tone="success" dismiss={() => setSuccess("")}>
          {success}
        </AdviserNotice>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <AdviserCard>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#2501FF]/[0.08] text-[#2501FF]">
              <KeyRound size={19} />
            </span>
            <div>
              <h2 className="font-bold text-slate-950">Groq API connection</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Use an API key from your Groq account. The selected model must be available to that key.
              </p>
            </div>
          </div>
          <form onSubmit={submit} className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Provider</span>
              <input
                value="Groq"
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Model ID</span>
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                maxLength={100}
                required
                placeholder={DEFAULT_MODEL}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#2501FF]/50 focus:ring-4 focus:ring-[#2501FF]/[0.08]"
              />
              <span className="mt-1.5 block text-xs text-slate-400">
                Default: {DEFAULT_MODEL}
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                {keyConfigured ? "Replace API key" : "Groq API key"}
              </span>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                minLength={20}
                maxLength={500}
                autoComplete="new-password"
                placeholder={keyConfigured ? "Saved securely — enter a new key to replace" : "gsk_…"}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#2501FF]/50 focus:ring-4 focus:ring-[#2501FF]/[0.08]"
              />
              <span className="mt-1.5 block text-xs text-slate-400">
                {keyConfigured
                  ? "Your existing key is never displayed. Keep this empty if you are not replacing it."
                  : "Your key is encrypted by the server before it is saved."}
              </span>
            </label>
            <button
              type="submit"
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2501FF] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1d00d6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "Saving…" : "Save AI settings"}
            </button>
          </form>
        </AdviserCard>

        <div className="space-y-5">
          <AdviserCard>
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <LockKeyhole size={19} />
            </span>
            <h2 className="mt-4 font-bold text-slate-950">Key status</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? "Checking configuration…" : keyConfigured ? "A key is configured." : "No key configured yet."}
            </p>
            <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-bold ${keyConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
              {keyConfigured ? "Ready for scheduled runs" : "Setup required"}
            </span>
          </AdviserCard>
          <AdviserCard className="border-amber-200 bg-amber-50/60">
            <h2 className="font-bold text-amber-950">External processing notice</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900/80">
              When configured, question subjects and text are sent to Groq to create similar-question groups and reply drafts. Never include sensitive personal information in a question. AI drafts are not sent automatically; an adviser must review, edit and send each group.
            </p>
          </AdviserCard>
          <AdviserCard>
            <h2 className="font-bold text-slate-950">Schedule</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Scheduled processing runs each hour from 12pm through 5pm, Africa/Lagos time. Missed slots are checked after a server restart.
            </p>
          </AdviserCard>
        </div>
      </div>
    </>
  );
}

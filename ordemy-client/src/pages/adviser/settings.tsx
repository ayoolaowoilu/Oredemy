import { useEffect, useState, type FormEvent } from "react";
import { Bot, ImageUp, Save, UserRound } from "lucide-react";
import { UserAvatar } from "../../components/user-avatar";
import { useAuth } from "../../context/useAuth";
import { ApiError, tokenStorage } from "../../lib/api";
import { compressProfileImage } from "../../utils/compress-image";
import { EditRequest, UploadProfileImage } from "../onboarding/ob.helpers";
import { fetchAiPreferences, updateAiPreferences } from "./api";
import { AdviserCard, AdviserNotice, AdviserPageIntro } from "./shared";

export default function AdviserSettings() {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [aiAutoReplies, setAiAutoReplies] = useState(false);
  const [loadingAiPreference, setLoadingAiPreference] = useState(true);
  const [savingAiPreference, setSavingAiPreference] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function loadPreference() {
      try {
        const response = await fetchAiPreferences();
        if (active) setAiAutoReplies(response.data.ai_auto_replies);
      } catch (loadError: unknown) {
        if (active) {
          setError(
            loadError instanceof ApiError || loadError instanceof Error
              ? loadError.message
              : "Could not load automatic AI reply settings.",
          );
        }
      } finally {
        if (active) setLoadingAiPreference(false);
      }
    }
    void loadPreference();
    return () => {
      active = false;
    };
  }, []);

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = tokenStorage.get();
    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }
    if (!name.trim()) {
      setError("Enter your full name.");
      return;
    }
    setSavingName(true);
    setError("");
    setNotice("");
    try {
      await EditRequest({ change: "name", values: { name: name.trim() } }, token);
      await refreshProfile();
      setNotice("Your name has been updated.");
    } catch (saveError: unknown) {
      setError(
        saveError instanceof ApiError || saveError instanceof Error
          ? saveError.message
          : "Your name could not be updated.",
      );
    } finally {
      setSavingName(false);
    }
  }

  async function changePhoto(file: File | null) {
    if (!file) return;
    const token = tokenStorage.get();
    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Choose an image that is 20 MB or smaller.");
      return;
    }
    setSavingImage(true);
    setError("");
    setNotice("");
    try {
      const compressed = await compressProfileImage(file);
      await UploadProfileImage(compressed, token);
      await refreshProfile();
      setNotice("Your profile photo has been updated.");
    } catch (uploadError: unknown) {
      setError(
        uploadError instanceof ApiError || uploadError instanceof Error
          ? uploadError.message
          : "Your profile photo could not be updated.",
      );
    } finally {
      setSavingImage(false);
    }
  }

  async function toggleAiAutoReplies() {
    const enabled = !aiAutoReplies;
    if (
      enabled &&
      !window.confirm(
        "Enable automatic AI replies? Scheduled runs can send AI-generated answers to students without your review. Replies are labeled AI-assisted, but may be inaccurate. You can turn this off at any time.",
      )
    ) {
      return;
    }
    setSavingAiPreference(true);
    setError("");
    setNotice("");
    try {
      const response = await updateAiPreferences(enabled);
      setAiAutoReplies(response.data.ai_auto_replies);
      setNotice(response.message);
    } catch (preferenceError: unknown) {
      setError(
        preferenceError instanceof ApiError || preferenceError instanceof Error
          ? preferenceError.message
          : "Could not update automatic AI reply settings.",
      );
    } finally {
      setSavingAiPreference(false);
    }
  }

  return (
    <>
      <AdviserPageIntro
        eyebrow="Account"
        title="Settings"
        description="Update your adviser profile. Department and cohort assignments are managed by an administrator."
      />
      {error && <AdviserNotice dismiss={() => setError("")}>{error}</AdviserNotice>}
      {notice && <AdviserNotice tone="success" dismiss={() => setNotice("")}>{notice}</AdviserNotice>}

      <div className="grid gap-5 lg:grid-cols-2">
        <AdviserCard>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#2501FF]/[0.08] text-[#2501FF]">
              <UserRound size={19} />
            </span>
            <div>
              <h2 className="font-bold text-slate-950">Personal details</h2>
              <p className="text-sm text-slate-500">The details students see.</p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
            <UserAvatar image={user?.image} name={user?.name} className="size-14" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Profile photo</p>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#2501FF]/[0.08] px-4 py-2 text-xs font-bold text-[#2501FF]">
                <ImageUp size={14} /> {savingImage ? "Uploading…" : "Change photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={savingImage}
                  onChange={(event) => {
                    void changePhoto(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
          <form onSubmit={saveName} className="mt-5 space-y-4">
            <label className="block text-xs font-semibold text-slate-700">
              Full name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={255}
                required
                className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#2501FF]"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Email
              <input
                value={user?.email ?? ""}
                readOnly
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-500"
              />
            </label>
            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="submit"
                disabled={savingName || !name.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-[#2501FF] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                <Save size={15} /> {savingName ? "Saving…" : "Save name"}
              </button>
            </div>
          </form>
        </AdviserCard>

        <AdviserCard>
          <h2 className="font-bold text-slate-950">Academic assignment</h2>
          <p className="mt-1 text-sm text-slate-500">
            Your approved department and student cohort.
          </p>
          <dl className="mt-5 space-y-4">
            <div>
              <dt className="text-xs font-semibold text-slate-400">Department</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">{user?.department ?? "Not assigned"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-400">Cohort session</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">{user?.session ?? "Not assigned"}</dd>
            </div>
          </dl>
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">
            To change a verified adviser’s department or cohort, contact an administrator so student questions and class-rep authority remain assigned correctly.
          </p>
        </AdviserCard>

        <AdviserCard>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#2501FF]/[0.08] text-[#2501FF]">
              <Bot size={19} />
            </span>
            <div>
              <h2 className="font-bold text-slate-950">Automatic AI replies</h2>
              <p className="text-sm text-slate-500">Choose whether AI may answer similar questions for you.</p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Would you like Oredemy to automatically answer similar questions?
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                When enabled, scheduled AI runs group related questions and send an AI-assisted reply without waiting for your review. Students receive a notification. You can disable this at any time.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={aiAutoReplies}
              aria-label="Automatically answer similar questions"
              disabled={loadingAiPreference || savingAiPreference}
              onClick={() => void toggleAiAutoReplies()}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                aiAutoReplies ? "bg-[#2501FF]" : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${
                  aiAutoReplies ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            {loadingAiPreference
              ? "Loading your preference…"
              : aiAutoReplies
                ? "On — the scheduled AI run may send replies automatically."
                : "Off — AI groups questions for your review; nothing is sent automatically."}
          </p>
        </AdviserCard>
      </div>
    </>
  );
}

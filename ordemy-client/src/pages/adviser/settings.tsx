import { useState, type FormEvent } from "react";
import { ImageUp, Save, UserRound } from "lucide-react";
import { UserAvatar } from "../../components/user-avatar";
import { useAuth } from "../../context/useAuth";
import { ApiError, tokenStorage } from "../../lib/api";
import { compressProfileImage } from "../../utils/compress-image";
import { EditRequest, UploadProfileImage } from "../onboarding/ob.helpers";
import { AdviserCard, AdviserNotice, AdviserPageIntro } from "./shared";

export default function AdviserSettings() {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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

      </div>
    </>
  );
}

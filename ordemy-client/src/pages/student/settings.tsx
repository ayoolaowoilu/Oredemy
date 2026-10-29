import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  GraduationCap,
  ImageUp,
  LogOut,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { ApiError, tokenStorage } from "../../lib/api";
import type { AcademicSchool } from "../../utils/types";
import {
  getAdmissionSessions,
  getCurrentAcademicSession,
} from "../../utils/level";
import { compressProfileImage } from "../../utils/compress-image";
import { UserAvatar } from "../../components/user-avatar";
import {
  EditRequest,
  FetchAcademicStructure,
  UploadProfileImage,
} from "../onboarding/ob.helpers";
import {
  Card,
  Notice,
  PageIntro,
  PrimaryButton,
} from "./shared";

const inputClass =
  "mt-2 w-full rounded-xl border border-[#E9E5FF] bg-white px-3.5 py-3 text-sm text-[#0B1030] outline-none placeholder:text-slate-400 focus:border-[#2501FF] focus:ring-2 focus:ring-[#2501FF]/10 disabled:bg-slate-50 disabled:text-slate-400";

const notificationOptions = [
  { key: "replies", label: "Adviser replies", note: "Tell me when my adviser responds." },
  { key: "announcements", label: "Department announcements", note: "Class rep and department updates." },
  { key: "payments", label: "Payment reminders", note: "Upcoming and outstanding payments." },
] as const;

type NotificationKey = (typeof notificationOptions)[number]["key"];

export default function StudentSettings() {
  const { user, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState<AcademicSchool[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [facultyId, setFacultyId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [admissionSession, setAdmissionSession] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [savingAcademic, setSavingAcademic] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notifications, setNotifications] = useState<Record<NotificationKey, boolean>>(() => {
    const defaults: Record<NotificationKey, boolean> = {
      replies: true,
      announcements: true,
      payments: false,
    };
    if (!user?.id) return defaults;
    try {
      const raw = localStorage.getItem(`ordemy:notifications:${user.id}`);
      return raw
        ? {
            ...defaults,
            ...(JSON.parse(raw) as Partial<Record<NotificationKey, boolean>>),
          }
        : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    let active = true;
    FetchAcademicStructure()
      .then((response) => {
        if (!active) return;
        setSchools(response.data);
        const school = response.data.find((item) =>
          item.faculties.some((faculty) => faculty.id === user?.faculty_id),
        );
        if (school) {
          setSchoolId(school.id);
          setFacultyId(user?.faculty_id ?? null);
          setDepartmentId(user?.department_id ?? null);
        }
        setAdmissionSession(
          user?.admission_session ?? user?.session ?? "",
        );
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof ApiError || loadError instanceof Error
              ? loadError.message
              : "Could not load the academic structure.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingSchools(false);
      });
    return () => {
      active = false;
    };
  }, [user?.admission_session, user?.department_id, user?.faculty_id, user?.session]);

  const school = schools.find((item) => item.id === schoolId);
  const faculty = school?.faculties.find((item) => item.id === facultyId);
  const currentSession = school
    ? getCurrentAcademicSession(Number(school.calendar_offset))
    : null;
  const admissionSessions = currentSession
    ? getAdmissionSessions(currentSession)
    : [];

  function selectSchool(value: string) {
    setSchoolId(value ? Number(value) : null);
    setFacultyId(null);
    setDepartmentId(null);
    setAdmissionSession("");
  }

  function selectFaculty(value: string) {
    setFacultyId(value ? Number(value) : null);
    setDepartmentId(null);
  }

  function toggleNotification(key: NotificationKey) {
    setNotifications((current) => {
      const next = { ...current, [key]: !current[key] };
      if (user?.id) {
        try {
          localStorage.setItem(
            `ordemy:notifications:${user.id}`,
            JSON.stringify(next),
          );
        } catch {
          // Preference still applies for this session.
        }
      }
      return next;
    });
  }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = tokenStorage.get();
    if (!token) return setError("Your session has expired. Please sign in again.");
    if (!name.trim()) return setError("Enter your full name.");
    setSavingName(true);
    setError("");
    setSuccess("");
    try {
      await EditRequest(
        { change: "name", values: { name: name.trim() } },
        token,
      );
      await refreshProfile();
      setSuccess("Your name has been updated.");
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

  async function saveAcademic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = tokenStorage.get();
    if (!token) return setError("Your session has expired. Please sign in again.");
    if (!facultyId || !departmentId || !admissionSession) {
      return setError("Choose your faculty, department and admission session.");
    }
    setSavingAcademic(true);
    setError("");
    setSuccess("");
    try {
      await EditRequest(
        {
          change: "faculty_id,department_id,session,admission_session",
          values: {
            faculty_id: facultyId,
            department_id: departmentId,
            session: admissionSession,
            admission_session: admissionSession,
          },
        },
        token,
      );
      await refreshProfile();
      setSuccess("Your academic details have been updated.");
    } catch (saveError: unknown) {
      setError(
        saveError instanceof ApiError || saveError instanceof Error
          ? saveError.message
          : "Your academic details could not be updated.",
      );
    } finally {
      setSavingAcademic(false);
    }
  }

  async function updateImage(file: File | null) {
    const token = tokenStorage.get();
    if (!file) return;
    if (!token) return setError("Your session has expired. Please sign in again.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return setError("Choose a JPEG, PNG, or WebP image.");
    }
    if (file.size > 20 * 1024 * 1024) {
      return setError("Choose an image that is 20 MB or smaller.");
    }
    setSavingImage(true);
    setError("");
    setSuccess("");
    try {
      const compressed = await compressProfileImage(file);
      await UploadProfileImage(compressed, token);
      await refreshProfile();
      setSuccess("Your profile photo has been updated.");
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

  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <PageIntro
        eyebrow="Account"
        title="Settings"
        description="Manage your personal details, academic information and notification preferences."
      />
      {error && <Notice onDismiss={() => setError("")}>{error}</Notice>}
      {success && (
        <Notice tone="success" onDismiss={() => setSuccess("")}>
          {success}
        </Notice>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#F1EDFF] text-[#2501FF]">
              <UserRound size={19} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#0B1030]">Personal details</h2>
              <p className="text-sm text-slate-500">How you appear across Oredemy.</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl bg-[#FCFBFF] p-4">
            <UserAvatar
              image={user?.image}
              name={user?.name}
              className="size-16 text-xl"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0B1030]">Profile photo</p>
              <p className="mt-1 text-xs text-slate-500">
                JPEG, PNG or WebP. Compressed below 1 MB before upload.
              </p>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#F0ECFF] bg-[#F7F5FF] px-4 py-2 text-xs font-semibold text-[#2501FF] hover:bg-[#F1EDFF]">
                <ImageUp size={14} />
                {savingImage ? "Uploading…" : "Change photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={savingImage}
                  onChange={(event) => {
                    void updateImage(event.target.files?.[0] ?? null);
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
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Email address
              <input
                value={user?.email ?? ""}
                readOnly
                className={inputClass}
              />
            </label>
            <div className="flex justify-end border-t border-[#F5F2FF] pt-4">
              <PrimaryButton type="submit" disabled={savingName || !name.trim()}>
                <Save size={15} /> {savingName ? "Saving…" : "Save changes"}
              </PrimaryButton>
            </div>
          </form>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#F1EDFF] text-[#2501FF]">
              <GraduationCap size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#0B1030]">Academic details</h2>
              <p className="text-sm text-slate-500">Your faculty, department and session.</p>
            </div>
          </div>

          <form onSubmit={saveAcademic} className="mt-5 space-y-4">
            <label className="block text-xs font-semibold text-slate-700">
              School
              <select
                value={schoolId ?? ""}
                onChange={(event) => selectSchool(event.target.value)}
                disabled={loadingSchools}
                className={inputClass}
              >
                <option value="">Select your school</option>
                {schools.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Faculty
              <select
                value={facultyId ?? ""}
                onChange={(event) => selectFaculty(event.target.value)}
                disabled={!school}
                className={inputClass}
              >
                <option value="">Select your faculty</option>
                {school?.faculties.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Department
              <select
                value={departmentId ?? ""}
                onChange={(event) =>
                  setDepartmentId(
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
                disabled={!faculty}
                className={inputClass}
              >
                <option value="">Select your department</option>
                {faculty?.departments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Admission session
              <select
                value={admissionSession}
                onChange={(event) => setAdmissionSession(event.target.value)}
                disabled={!currentSession}
                className={inputClass}
              >
                <option value="">Select your admission session</option>
                {admissionSessions.map((session) => (
                  <option key={session.label} value={session.label}>
                    {session.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center justify-between gap-3 border-t border-[#F5F2FF] pt-4">
              <p className="text-xs text-slate-400">
                {currentSession
                  ? `Current session: ${currentSession.label}`
                  : "Select a school to see sessions"}
              </p>
              <PrimaryButton
                type="submit"
                disabled={
                  savingAcademic || !facultyId || !departmentId || !admissionSession
                }
              >
                <Save size={15} /> {savingAcademic ? "Saving…" : "Save academic"}
              </PrimaryButton>
            </div>
          </form>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#F1EDFF] text-[#2501FF]">
              <Bell size={19} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#0B1030]">Notifications</h2>
              <p className="text-sm text-slate-500">Choose what you want to hear about.</p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-[#F5F2FF]">
            {notificationOptions.map((option) => (
              <div
                key={option.key}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0B1030]">{option.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{option.note}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifications[option.key]}
                  aria-label={option.label}
                  onClick={() => toggleNotification(option.key)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    notifications[option.key] ? "bg-[#2501FF]" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${
                      notifications[option.key] ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck size={13} /> Preferences are saved on this device.
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600">
              <LogOut size={19} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#0B1030]">Session</h2>
              <p className="text-sm text-slate-500">Sign out of this device safely.</p>
            </div>
          </div>
          <p className="mt-4 rounded-2xl bg-[#FCFBFF] p-4 text-xs leading-5 text-slate-500">
            Signed in as <span className="font-semibold text-[#0B1030]">{user?.email ?? "your account"}</span>.
            You will need your email and password to sign back in.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="mt-4 w-full rounded-full bg-[#2501FF] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1D01CC]"
          >
            Sign out
          </button>
        </Card>
      </div>
    </>
  );
}

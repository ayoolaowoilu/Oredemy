import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { ApiError, tokenStorage } from "../../lib/api";
import type { AcademicSchool } from "../../utils/types";
import {
  calculateLevel,
  getAdmissionSessions,
  getCurrentAcademicSession,
} from "../../utils/level";
import {
  EditRequest,
  FetchAcademicStructure,
  SaveAdviserDepartment,
  UploadProfileImage,
} from "./ob.helpers";

const STUDENT_STEPS = ["School", "Faculty", "Department", "Academic session"];
const ADVISER_STEPS = ["School", "Faculty", "Department", "Student cohort"];

export default function Onboarding() {
  const { refreshProfile, user } = useAuth();
  const navigate = useNavigate();
  const isAdviser = user?.role === "lecturer";
  const steps = isAdviser ? ADVISER_STEPS : STUDENT_STEPS;
  const [schools, setSchools] = useState<AcademicSchool[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    number | null
  >(null);
  const [admissionSession, setAdmissionSession] = useState("");
  const [adviserSession, setAdviserSession] = useState("");
  const [selectedImage, setSelectedImage] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const imagePreview = selectedImage?.preview ?? user?.image ?? null;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    FetchAcademicStructure()
      .then((response) => {
        if (!cancelled) setSchools(response.data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : "Could not load schools. Please try again.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const previewUrl = selectedImage?.preview;
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedImage?.preview]);

  const selectedSchool = schools.find(
    (school) => school.id === selectedSchoolId,
  );
  const selectedFaculty = selectedSchool?.faculties.find(
    (faculty) => faculty.id === selectedFacultyId,
  );
  const selectedDepartment = selectedFaculty?.departments.find(
    (department) => department.id === selectedDepartmentId,
  );
  const currentSession = selectedSchool
    ? getCurrentAcademicSession(Number(selectedSchool.calendar_offset))
    : null;
  const admissionSessions = currentSession
    ? getAdmissionSessions(currentSession)
    : [];
  const level = currentSession
    ? calculateLevel(admissionSession, currentSession.label)
    : null;

  function selectSchool(value: string) {
    setSelectedSchoolId(value ? Number(value) : null);
    setSelectedFacultyId(null);
    setSelectedDepartmentId(null);
    setAdmissionSession("");
    setAdviserSession("");
  }

  function selectFaculty(value: string) {
    setSelectedFacultyId(value ? Number(value) : null);
    setSelectedDepartmentId(null);
  }

  async function saveEnrollment() {
    const token = tokenStorage.get();
    if (!token || !selectedFaculty || !selectedDepartment) {
      setError("Choose a school, faculty, and department.");
      return;
    }
    if (isAdviser && !adviserSession) {
      setError("Choose the class session you advise.");
      return;
    }
    if (!isAdviser && !currentSession) {
      setError("Choose a school, faculty, department, and admission session.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      if (isAdviser) {
        await SaveAdviserDepartment(selectedDepartment.id, adviserSession, token);
      } else {
        await EditRequest(
          {
            change: "faculty_id,department_id,session",
            values: {
              faculty_id: selectedFaculty.id,
              department_id: selectedDepartment.id,
              session: admissionSession,
            },
          },
          token,
        );
      }
      if (selectedImage) {
        await UploadProfileImage(selectedImage.file, token);
      }
      await refreshProfile();
      navigate(isAdviser ? "/" : "/dashboard/student", { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Could not save your academic details. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const canContinue =
    (step === 0 && Boolean(selectedSchool)) ||
    (step === 1 && Boolean(selectedFaculty)) ||
    (step === 2 && Boolean(selectedDepartment)) ||
    (isAdviser && step === 3 && Boolean(adviserSession)) ||
    (!isAdviser && step === 3 && level !== null);

  if (isAdviser && user?.is_verified) {
    return <Navigate to="/dashboard/adviser" replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="mb-8">
          <img
            src="/ordemylogo.svg"
            alt="Oredemy"
            className="mb-4 h-auto w-40 object-contain"
          />
          <div className="mb-6 flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-[#2501FF]/10 text-lg font-bold text-[#2501FF]">
              {imagePreview ? (
                <img src={imagePreview} alt="Profile preview" className="size-full object-cover" />
              ) : (
                user?.name?.trim().charAt(0).toUpperCase() ?? "U"
              )}
            </span>
            <label className="min-w-0">
              <span className="block text-sm font-bold text-slate-800">Profile photo <span className="font-normal text-slate-400">(optional)</span></span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                    setError("Choose a JPEG, PNG, or WebP image.");
                    setSelectedImage(null);
                    event.target.value = "";
                    return;
                  }
                  if (file && file.size > 5 * 1024 * 1024) {
                    setError("Choose an image that is 5 MB or smaller.");
                    setSelectedImage(null);
                    event.target.value = "";
                    return;
                  }
                  setError("");
                  setSelectedImage(
                    file
                      ? { file, preview: URL.createObjectURL(file) }
                      : null,
                  );
                }}
                className="mt-1 block w-full max-w-xs text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#2501FF]/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#2501FF] hover:file:bg-[#2501FF]/15"
              />
              <span className="mt-1 block text-xs text-slate-400">JPEG, PNG or WebP, up to 5 MB</span>
            </label>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            {isAdviser ? "Set up your adviser profile" : "Set up your student profile"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Step {step + 1} of {steps.length}: {steps[step]}
          </p>
          {isAdviser && (
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Choose the school, faculty, and department you advise so your account
              is matched with the right students. An administrator must verify
              your assignment before you can access student questions.
            </p>
          )}
        </div>
        <div className="mb-8 flex gap-2" aria-label="Onboarding progress">
          {steps.map((stepName, index) => (
            <div key={stepName} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${
                  index <= step ? "bg-[#2501FF]" : "bg-slate-100"
                }`}
              />
              <p
                className={`mt-2 hidden text-xs font-semibold sm:block ${
                  index === step ? "text-[#2501FF]" : "text-slate-400"
                }`}
              >
                {stepName}
              </p>
            </div>
          ))}
        </div>

      {error && (
        <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
          {schools.length === 0 && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  FetchAcademicStructure()
                    .then((response) => setSchools(response.data))
                    .catch((requestError: unknown) =>
                      setError(
                        requestError instanceof ApiError
                          ? requestError.message
                          : "Could not load schools. Please try again.",
                      ),
                    )
                    .finally(() => setLoading(false));
                }}
              >
                Try again
              </button>
            </>
          )}
        </p>
      )}

      {loading ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading schools…</p>
      ) : schools.length === 0 && !error ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No schools are available yet.</p>
      ) : null}

      {!loading && step === 0 && (
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">School</span>
          <select
            value={selectedSchoolId ?? ""}
            onChange={(event) => selectSchool(event.target.value)}
            disabled={schools.length === 0}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#2501FF]/50 focus:ring-4 focus:ring-[#2501FF]/10 disabled:bg-slate-50"
          >
            <option value="">Select your school</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {!loading && step === 1 && (
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">Faculty</span>
          <select
            value={selectedFacultyId ?? ""}
            onChange={(event) => selectFaculty(event.target.value)}
            disabled={!selectedSchool}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#2501FF]/50 focus:ring-4 focus:ring-[#2501FF]/10 disabled:bg-slate-50"
          >
            <option value="">Select your faculty</option>
            {selectedSchool?.faculties.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {!loading && step === 2 && (
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">Department</span>
          <select
            value={selectedDepartmentId ?? ""}
            onChange={(event) =>
              setSelectedDepartmentId(
                event.target.value ? Number(event.target.value) : null,
              )
            }
            disabled={!selectedFaculty}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#2501FF]/50 focus:ring-4 focus:ring-[#2501FF]/10 disabled:bg-slate-50"
          >
            <option value="">Select your department</option>
            {selectedFaculty?.departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {!loading && isAdviser && step === 3 && currentSession && (
        <div>
          <p className="mb-4 rounded-xl bg-[#2501FF]/[0.04] p-4 text-sm leading-6 text-slate-700">
            Select the student cohort you advise. Their questions and class chat
            will be matched using this session. The school’s current academic
            session is <strong>{currentSession.label}</strong>.
          </p>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
                Student cohort session you advise
            </span>
            <select
              value={adviserSession}
              onChange={(event) => setAdviserSession(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#2501FF]/50 focus:ring-4 focus:ring-[#2501FF]/10"
            >
              <option value="">Select the class session</option>
              {getAdmissionSessions(currentSession).map((session) => (
                <option key={session.label} value={session.label}>
                  {session.label}{session.label === currentSession.label ? " (current)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {!loading && !isAdviser && step === 3 && currentSession && (
        <>
          <p className="mb-4 rounded-xl bg-[#2501FF]/[0.04] p-4 text-sm text-slate-700">
            Current academic session for {selectedSchool?.name}:{" "}
            <strong>{currentSession.label}</strong>
          </p>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Admission session</span>
            <select
              value={admissionSession}
              onChange={(event) => setAdmissionSession(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#2501FF]/50 focus:ring-4 focus:ring-[#2501FF]/10"
            >
              <option value="">Select your admission session</option>
              {admissionSessions.map((session) => (
                <option key={session.label} value={session.label}>
                  {session.label}
                </option>
              ))}
            </select>
          </label>
          {level !== null && <p className="mt-3 text-sm font-semibold text-[#2501FF]">Your calculated level: {level} level</p>}
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {selectedSchool?.name} is{" "}
            {Math.abs(selectedSchool?.calendar_offset ?? 0)} session
            {Math.abs(selectedSchool?.calendar_offset ?? 0) === 1 ? "" : "s"}{" "}
            {selectedSchool?.calendar_offset === 0
              ? "aligned with the calendar year"
              : selectedSchool && selectedSchool.calendar_offset > 0
                ? "behind the calendar year"
                : "ahead of the calendar year"}
          </p>
        </>
      )}

      <div className="mt-8 flex justify-between gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep((current) => current - 1)} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
            Back
          </button>
        )}
        {step === 0 && <span />}
        {step < steps.length - 1 ? (
          <button
            type="button"
            disabled={!canContinue || loading}
            onClick={() => setStep((current) => current + 1)}
            className="rounded-xl bg-[#2501FF] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1e00d6] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            disabled={!canContinue || submitting || loading}
            onClick={() => void saveEnrollment()}
            className="rounded-xl bg-[#2501FF] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1e00d6] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Saving…" : "Finish"}
          </button>
        )}
      </div>
      </section>
    </main>
  );
}

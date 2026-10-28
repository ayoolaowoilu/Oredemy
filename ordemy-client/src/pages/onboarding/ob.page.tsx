import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { ApiError, tokenStorage } from "../../lib/api";
import type { AcademicSchool } from "../../utils/types";
import {
  calculateLevel,
  getAdmissionSessions,
  getCurrentAcademicSession,
} from "../../utils/level";
import { EditRequest, FetchAcademicStructure } from "./ob.helpers";

const STEPS = ["School", "Faculty", "Department", "Academic session"];

export default function Onboarding() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState<AcademicSchool[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    number | null
  >(null);
  const [admissionSession, setAdmissionSession] = useState("");
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
  }

  function selectFaculty(value: string) {
    setSelectedFacultyId(value ? Number(value) : null);
    setSelectedDepartmentId(null);
  }

  async function saveEnrollment() {
    const token = tokenStorage.get();
    if (!token || !selectedFaculty || !selectedDepartment || !currentSession) {
      setError("Choose a school, faculty, department, and admission session.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
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
      await refreshProfile();
      navigate("/dashboard/student", { replace: true });
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
    (step === 3 && level !== null);

  if (loading) return <p>Loading schools…</p>;

  return (
    <main>
      <h1>Set up your student profile</h1>
      <p>
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>

      {error && (
        <p role="alert">
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

      {schools.length === 0 && !error && <p>No schools are available yet.</p>}

      {step === 0 && (
        <label>
          School
          <select
            value={selectedSchoolId ?? ""}
            onChange={(event) => selectSchool(event.target.value)}
            disabled={schools.length === 0}
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

      {step === 1 && (
        <label>
          Faculty
          <select
            value={selectedFacultyId ?? ""}
            onChange={(event) => selectFaculty(event.target.value)}
            disabled={!selectedSchool}
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

      {step === 2 && (
        <label>
          Department
          <select
            value={selectedDepartmentId ?? ""}
            onChange={(event) =>
              setSelectedDepartmentId(
                event.target.value ? Number(event.target.value) : null,
              )
            }
            disabled={!selectedFaculty}
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

      {step === 3 && currentSession && (
        <>
          <p>
            Current academic session for {selectedSchool?.name}:{" "}
            <strong>{currentSession.label}</strong>
          </p>
          <label>
            Admission session
            <select
              value={admissionSession}
              onChange={(event) => setAdmissionSession(event.target.value)}
            >
              <option value="">Select your admission session</option>
              {admissionSessions.map((session) => (
                <option key={session.label} value={session.label}>
                  {session.label}
                </option>
              ))}
            </select>
          </label>
          {level !== null && <p>Your calculated level: {level} level</p>}
          <p>
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

      <div>
        {step > 0 && (
          <button type="button" onClick={() => setStep((current) => current - 1)}>
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => setStep((current) => current + 1)}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            disabled={!canContinue || submitting}
            onClick={() => void saveEnrollment()}
          >
            {submitting ? "Saving…" : "Finish"}
          </button>
        )}
      </div>
    </main>
  );
}

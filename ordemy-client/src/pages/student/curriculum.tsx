import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  GraduationCap,
  Layers3,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { ApiError } from "../../lib/api";
import type { AcademicSchool, DepartmentCourse } from "../../utils/types";
import {
  calculateLevel,
  getCurrentAcademicSession,
} from "../../utils/level";
import { FetchAcademicStructure } from "../onboarding/ob.helpers";
import {
  Card,
  EmptyState,
  Notice,
  PageIntro,
  StatCard,
} from "./shared";
import { fetchCurrentStudentCourses } from "./api";

const levelPlan = [
  { level: 100, label: "Foundation", note: "Settle into department rules and core introductory courses." },
  { level: 200, label: "Building blocks", note: "Strengthen core theory and confirm your course sequence." },
  { level: 300, label: "Specialisation", note: "Balance core courses with electives and practical work." },
  { level: 400, label: "Application", note: "Focus on projects, seminars and career-facing skills." },
  { level: 500, label: "Completion", note: "Finish outstanding requirements and prepare for clearance." },
];

const checklist = [
  { key: "register", label: "Register all courses for the current semester" },
  { key: "units", label: "Confirm your total course units with the department" },
  { key: "timetable", label: "Check your timetable for clashes and missed classes" },
  { key: "materials", label: "Collect the reading list and past questions" },
  { key: "adviser", label: "Review elective choices with your adviser" },
];

export default function StudentCurriculum() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<AcademicSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState<DepartmentCourse[]>([]);
  const [coursesSession, setCoursesSession] = useState("");
  const [coursesLevel, setCoursesLevel] = useState<number | null>(null);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");

  useEffect(() => {
    let active = true;
    FetchAcademicStructure()
      .then((response) => {
        if (active) setSchools(response.data);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof ApiError || loadError instanceof Error
              ? loadError.message
              : "Could not load your academic structure.",
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

  useEffect(() => {
    let active = true;
    fetchCurrentStudentCourses()
      .then((response) => {
        if (!active) return;
        setCourses(response.data);
        setCoursesSession(response.academic_session);
        setCoursesLevel(response.level);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setCoursesError(
            loadError instanceof ApiError || loadError instanceof Error
              ? loadError.message
              : "Could not load your current-session courses.",
          );
        }
      })
      .finally(() => {
        if (active) setCoursesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const school = schools.find((item) =>
    item.faculties.some((faculty) => faculty.id === user?.faculty_id),
  );
  const faculty = school?.faculties.find(
    (item) => item.id === user?.faculty_id,
  );
  const department = faculty?.departments.find(
    (item) => item.id === user?.department_id,
  );
  const currentSession = getCurrentAcademicSession(
    user?.calendar_offset ?? school?.calendar_offset ?? 0,
  );
  const level = user
    ? calculateLevel(
        user.admission_session ?? user.session ?? "",
        currentSession.label,
      )
    : null;
  const numericLevel = level === null ? null : level / 100;
  const storageKey = `ordemy:curriculum:${user?.id ?? "guest"}:${level ?? "unset"}`;
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  function toggleCheck(key: string) {
    setChecked((current) => {
      const next = { ...current, [key]: !current[key] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Storage may be unavailable; the checklist still works in-session.
      }
      return next;
    });
  }

  const completed = checklist.filter((item) => checked[item.key]).length;
  const progress = Math.round((completed / checklist.length) * 100);

  return (
    <>
      <PageIntro
        eyebrow="Academic plan"
        title="Curriculum"
        description="See where you are in your programme and keep track of the steps that matter this session."
        action={
          <Link
            to="/dashboard/student/questions"
            className="inline-flex items-center gap-2 rounded-full border border-[#F0ECFF] bg-[#F7F5FF] px-5 py-2.5 text-sm font-semibold text-[#2501FF] hover:bg-[#F1EDFF]"
          >
            Ask about courses <ArrowRight size={16} />
          </Link>
        }
      />
      {error && (
        <Notice onDismiss={() => setError("")}>
          {error}
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError("");
              FetchAcademicStructure()
                .then((response) => setSchools(response.data))
                .catch((refreshError: unknown) =>
                  setError(
                    refreshError instanceof Error
                      ? refreshError.message
                      : "Could not refresh your academic structure.",
                  ),
                )
                .finally(() => setLoading(false));
            }}
            className="ml-2 inline-flex items-center gap-1 font-bold underline"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<GraduationCap size={20} />}
          label="Current level"
          value={loading ? "—" : numericLevel ? `${numericLevel}00L` : "—"}
          note={user?.admission_session ? `Admitted ${user.admission_session}` : "Set your admission session"}
          color="bg-violet-50 text-violet-700"
        />
        <StatCard
          icon={<BookOpen size={19} />}
          label="Session"
          value={currentSession.label}
          note={school?.name ?? "Current academic session"}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={<Layers3 size={19} />}
          label="Department"
          value={loading ? "—" : department?.name ?? "—"}
          note={faculty?.name ?? "Complete your academic profile"}
          color="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          icon={<CheckCircle2 size={19} />}
          label="Checklist"
          value={`${completed}/${checklist.length}`}
          note={`${progress}% of this session's steps done`}
          color="bg-amber-50 text-amber-700"
        />
      </div>

      <section className="mt-7">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Current session courses
              </p>
              <h2 className="mt-1 text-lg font-bold text-[#0B1030]">
                {coursesLevel ? `${coursesLevel} level · ${coursesSession}` : coursesSession || currentSession.label}
              </h2>
            </div>
            {!coursesLoading && courses.length > 0 && (
              <span className="rounded-full bg-[#2501FF]/[0.08] px-3 py-1 text-xs font-bold text-[#2501FF]">
                {courses.reduce((sum, course) => sum + course.units, 0)} total units
              </span>
            )}
          </div>
          {coursesError ? (
            <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
              {coursesError}
            </p>
          ) : coursesLoading ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              {coursesLevel
                ? `No courses have been added for your department and ${coursesLevel} level in ${coursesSession}. Check back after your lecturer publishes them.`
                : "Complete your academic profile with a department and admission session to see your courses."}
            </p>
          ) : (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <li key={course.id} className="rounded-xl border border-[#F0ECFF] bg-[#FCFBFF] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-lg bg-[#2501FF]/[0.08] px-2.5 py-1 text-xs font-bold text-[#2501FF]">
                      {course.course_code}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-slate-500">
                      {course.units} unit{course.units === 1 ? "" : "s"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-[#0B1030]">{course.course_name}</h3>
                  {course.lecturer_name && (
                    <p className="mt-1 text-xs text-slate-500">Added by {course.lecturer_name}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Your academic path
              </p>
              <h2 className="mt-1 text-lg font-bold text-[#0B1030]">
                Level roadmap
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {department && faculty && school
                  ? `${department.name} · ${faculty.name} · ${school.name}`
                  : "Complete your academic profile to see your full path."}
              </p>
            </div>
            <span className="rounded-full bg-[#2501FF]/[0.08] px-3 py-1 text-xs font-bold text-[#2501FF]">
              {numericLevel ? `${numericLevel}00L` : "Level —"}
            </span>
          </div>

          <ol className="mt-6 space-y-3">
            {levelPlan.map(({ level: planLevel, label, note }) => {
              const reached =
                numericLevel !== null && planLevel / 100 <= numericLevel;
              const current = numericLevel !== null && planLevel / 100 === numericLevel;
              return (
                <li
                  key={planLevel}
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
                    current
                      ? "border-[#2501FF]/25 bg-[#2501FF]/[0.04]"
                      : "border-[#F0ECFF] bg-white"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                      current
                        ? "bg-[#2501FF] text-white"
                        : reached
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-50 text-slate-400"
                    }`}
                  >
                    {planLevel / 100}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0B1030]">
                      {planLevel}L · {label}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                      {note}
                    </p>
                  </div>
                  {current && (
                    <span className="ml-auto shrink-0 rounded-full bg-[#2501FF] px-2.5 py-1 text-[10px] font-bold text-white">
                      You are here
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>

        <div className="space-y-5">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  This session
                </p>
                <h2 className="mt-1 text-lg font-bold text-[#0B1030]">
                  Curriculum checklist
                </h2>
              </div>
              <span className="rounded-full bg-[#2501FF]/[0.08] px-3 py-1 text-xs font-bold text-[#2501FF]">
                {progress}%
              </span>
            </div>
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-[#e8e5ff]"
              role="progressbar"
              aria-label="Curriculum checklist progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="h-full rounded-full bg-[#2501FF] transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <ul className="mt-4 space-y-1">
              {checklist.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => toggleCheck(item.key)}
                    aria-pressed={Boolean(checked[item.key])}
                    className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-[#FCFBFF]"
                  >
                    {checked[item.key] ? (
                      <CheckCircle2
                        size={17}
                        className="mt-0.5 shrink-0 text-[#2501FF]"
                      />
                    ) : (
                      <Circle
                        size={17}
                        className="mt-0.5 shrink-0 text-slate-300"
                      />
                    )}
                    <span
                      className={`text-sm leading-5 ${
                        checked[item.key]
                          ? "text-slate-400 line-through"
                          : "text-slate-600"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="bg-[#2501FF] text-white">
            <span className="grid size-10 place-items-center rounded-xl bg-white/15">
              <BookOpen size={19} />
            </span>
            <h2 className="mt-4 text-lg font-bold">Need a course guide?</h2>
            <p className="mt-1 text-sm leading-6 text-white/75">
              Your adviser can confirm the approved course list and elective
              options for your level.
            </p>
            <Link
              to="/dashboard/student/chat"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#2501FF] hover:bg-violet-50"
            >
              Open adviser chat <ArrowRight size={14} />
            </Link>
          </Card>
        </div>
      </div>

      {!loading && !department && (
        <div className="mt-5">
          <EmptyState
            icon={<GraduationCap size={20} />}
            title="Your department is not set"
            description="Add your faculty and department so your curriculum path can be personalised."
            action={
              <Link
                to="/onboarding"
                className="rounded-full bg-[#2501FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1D01CC]"
              >
                Complete profile
              </Link>
            }
          />
        </div>
      )}
    </>
  );
}

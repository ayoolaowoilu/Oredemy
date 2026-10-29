import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { ApiError } from "../../lib/api";
import type { DepartmentCourse } from "../../utils/types";
import {
  createLecturerCourse,
  deleteLecturerCourse,
  fetchLecturerCourses,
} from "./api";
import { AdviserCard, AdviserNotice, AdviserPageIntro } from "./shared";

const levels = [100, 200, 300, 400, 500, 600];

export default function AdviserCourses() {
  const [courses, setCourses] = useState<DepartmentCourse[]>([]);
  const [academicSession, setAcademicSession] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [level, setLevel] = useState(100);
  const [units, setUnits] = useState(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCourses = useCallback(async () => {
    setError("");
    try {
      const response = await fetchLecturerCourses();
      setCourses(response.data);
      setAcademicSession(response.academic_session);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof ApiError || loadError instanceof Error
          ? loadError.message
          : "Could not load department courses.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function initialize() {
      await loadCourses();
    }
    void initialize();
  }, [loadCourses]);

  async function addCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await createLecturerCourse({
        course_name: courseName.trim(),
        course_code: courseCode.trim(),
        units,
        level,
      });
      setCourseName("");
      setCourseCode("");
      setUnits(3);
      setNotice("Course added for the current academic session.");
      await loadCourses();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof ApiError || saveError instanceof Error
          ? saveError.message
          : "Could not add this course.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeCourse(course: DepartmentCourse) {
    if (!window.confirm(`Delete ${course.course_code} — ${course.course_name}?`)) return;
    setBusyId(course.id);
    setError("");
    setNotice("");
    try {
      await deleteLecturerCourse(course.id);
      setCourses((current) => current.filter((item) => item.id !== course.id));
      setNotice(`${course.course_code} was deleted.`);
    } catch (deleteError: unknown) {
      setError(
        deleteError instanceof ApiError || deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this course.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AdviserPageIntro
        eyebrow="Department curriculum"
        title="Courses"
        description={`Add courses for each level. Students see courses for their department, current level and academic session${academicSession ? ` (${academicSession})` : ""}.`}
      />
      {error && <AdviserNotice dismiss={() => setError("")}>{error}</AdviserNotice>}
      {notice && <AdviserNotice tone="success" dismiss={() => setNotice("")}>{notice}</AdviserNotice>}

      <AdviserCard>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#2501FF]/[0.08] text-[#2501FF]">
            <Plus size={19} />
          </span>
          <div>
            <h2 className="font-bold text-slate-950">Add a course</h2>
            <p className="text-sm text-slate-500">
              Academic session: {academicSession || "Loading…"}
            </p>
          </div>
        </div>
        <form onSubmit={addCourse} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2 xl:col-span-1">
            Course name
            <input
              value={courseName}
              onChange={(event) => setCourseName(event.target.value)}
              maxLength={255}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2501FF]"
              placeholder="Introduction to Biology"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Course code
            <input
              value={courseCode}
              onChange={(event) => setCourseCode(event.target.value)}
              maxLength={20}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-[#2501FF]"
              placeholder="BIO 101"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Level
            <select
              value={level}
              onChange={(event) => setLevel(Number(event.target.value))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2501FF]"
            >
              {levels.map((item) => (
                <option key={item} value={item}>{item} level</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Units
            <input
              type="number"
              min={1}
              max={30}
              step={1}
              value={units}
              onChange={(event) => setUnits(Number(event.target.value))}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2501FF]"
            />
          </label>
          <button
            type="submit"
            disabled={saving || !academicSession}
            className="self-end rounded-xl bg-[#2501FF] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1d00d6] disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add course"}
          </button>
        </form>
        <p className="mt-3 text-xs text-slate-400">
          Course codes must be unique within the department, session and level. Units can be 1–30.
        </p>
      </AdviserCard>

      <section className="mt-7">
        <h2 className="mb-3 text-lg font-bold text-slate-950">Courses for {academicSession || "this session"}</h2>
        {loading ? (
          <div className="h-36 animate-pulse rounded-2xl bg-white shadow-sm" />
        ) : courses.length === 0 ? (
          <AdviserCard className="py-10 text-center">
            <BookOpen className="mx-auto text-slate-300" size={25} />
            <p className="mt-3 text-sm text-slate-500">No courses have been added for this session yet.</p>
          </AdviserCard>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#F0ECFF] bg-white shadow-sm">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="bg-[#FCFBFF]">
                <tr className="border-b border-[#F0ECFF]">
                  <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Course code</th>
                  <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Course name</th>
                  <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Level</th>
                  <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Units</th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F2FF]">
                {courses.map((course) => (
                  <tr key={course.id} className="transition-colors hover:bg-[#FCFBFF]">
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-[#2501FF]">
                      {course.course_code}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                      {course.course_name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {course.level} level
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {course.units}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        aria-label={`Delete ${course.course_code}`}
                        disabled={busyId === course.id}
                        onClick={() => void removeCourse(course)}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                        {busyId === course.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import {
  Building2,
  GraduationCap,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  School as SchoolIcon,
  Trash2,
} from "lucide-react";
import { ApiError } from "../../lib/api";
import type { Department, Faculty, School } from "../../utils/types";
import {
  createAdminResource,
  deleteAdminResource,
  fetchAdminResource,
  updateAdminResource,
  type AdminResourceName,
} from "./api";
import {
  Card,
  EmptyState,
  Notice,
  PageIntro,
  PrimaryButton,
  StatCard,
} from "./shared";

const tabs: Array<{
  key: AdminResourceName;
  label: string;
  singular: string;
  icon: typeof SchoolIcon;
}> = [
  { key: "schools", label: "Schools", singular: "school", icon: SchoolIcon },
  { key: "faculties", label: "Faculties", singular: "faculty", icon: Building2 },
  { key: "departments", label: "Departments", singular: "department", icon: Layers3 },
];

const inputClass =
  "mt-2 w-full rounded-xl border border-[#E9E5FF] bg-white px-3.5 py-3 text-sm text-[#0B1030] outline-none placeholder:text-slate-400 focus:border-[#2501FF] focus:ring-2 focus:ring-[#2501FF]/10";

const demoSchools: School[] = [
  { id: -1, name: "University of Lagos", calendar_offset: 0, created_at: "" },
  { id: -2, name: "Obafemi Awolowo University", calendar_offset: 1, created_at: "" },
];

const demoFaculties: Faculty[] = [
  { id: -10, name: "Faculty of Science", school_id: -1, created_at: "" },
  { id: -11, name: "Faculty of Engineering", school_id: -1, created_at: "" },
  { id: -12, name: "Faculty of Arts", school_id: -2, created_at: "" },
];

const demoDepartments: Department[] = [
  { id: -20, name: "Computer Science", faculty_id: -10, created_at: "" },
  { id: -21, name: "Mass Communication", faculty_id: -12, created_at: "" },
  { id: -22, name: "Mechanical Engineering", faculty_id: -11, created_at: "" },
];

export default function AdminAcademics() {
  const [active, setActive] = useState<AdminResourceName>("schools");
  const [schools, setSchools] = useState<School[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [calendarOffset, setCalendarOffset] = useState("0");
  const [schoolId, setSchoolId] = useState("");
  const [facultyId, setFacultyId] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [schoolResponse, facultyResponse, departmentResponse] =
        await Promise.all([
          fetchAdminResource<School>("schools"),
          fetchAdminResource<Faculty>("faculties"),
          fetchAdminResource<Department>("departments"),
        ]);
      setSchools(schoolResponse.data);
      setFaculties(facultyResponse.data);
      setDepartments(departmentResponse.data);
      setPreview(false);
    } catch (loadError: unknown) {
      if (import.meta.env.DEV) {
        setSchools(demoSchools);
        setFaculties(demoFaculties);
        setDepartments(demoDepartments);
        setPreview(true);
      } else {
        setError(
          loadError instanceof ApiError || loadError instanceof Error
            ? loadError.message
            : "Could not load the academic structure.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let activeRequest = true;
    Promise.all([
      fetchAdminResource<School>("schools"),
      fetchAdminResource<Faculty>("faculties"),
      fetchAdminResource<Department>("departments"),
    ])
      .then(([schoolResponse, facultyResponse, departmentResponse]) => {
        if (!activeRequest) return;
        setSchools(schoolResponse.data);
        setFaculties(facultyResponse.data);
        setDepartments(departmentResponse.data);
        setPreview(false);
      })
      .catch((loadError: unknown) => {
        if (!activeRequest) return;
        if (import.meta.env.DEV) {
          setSchools(demoSchools);
          setFaculties(demoFaculties);
          setDepartments(demoDepartments);
          setPreview(true);
          return;
        }
        setError(
          loadError instanceof ApiError || loadError instanceof Error
            ? loadError.message
            : "Could not load the academic structure.",
        );
      })
      .finally(() => {
        if (activeRequest) setLoading(false);
      });
    return () => {
      activeRequest = false;
    };
  }, []);

  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0];
  const rows =
    active === "schools"
      ? schools
      : active === "faculties"
        ? faculties
        : departments;

  function resetForm() {
    setEditingId(null);
    setName("");
    setCalendarOffset("0");
    setSchoolId("");
    setFacultyId("");
  }

  function changeTab(key: AdminResourceName) {
    setActive(key);
    setError("");
    setNotice("");
    resetForm();
  }

  function startEdit(id: number) {
    setEditingId(id);
    setError("");
    setNotice("");
    if (active === "schools") {
      const school = schools.find((item) => item.id === id);
      if (school) {
        setName(school.name);
        setCalendarOffset(String(school.calendar_offset));
      }
    } else if (active === "faculties") {
      const faculty = faculties.find((item) => item.id === id);
      if (faculty) {
        setName(faculty.name);
        setSchoolId(String(faculty.school_id));
      }
    } else {
      const department = departments.find((item) => item.id === id);
      if (department) {
        setName(department.name);
        setFacultyId(String(department.faculty_id));
      }
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (preview) {
      return setError("Preview mode: sign in as an admin to save academic changes.");
    }
    if (!name.trim()) return setError(`Enter a ${activeTab.singular} name.`);
    if (active === "faculties" && !schoolId) {
      return setError("Choose the school this faculty belongs to.");
    }
    if (active === "departments" && !facultyId) {
      return setError("Choose the faculty this department belongs to.");
    }

    const values: Record<string, string | number> =
      active === "schools"
        ? { name: name.trim(), calendar_offset: Number(calendarOffset) || 0 }
        : active === "faculties"
          ? { name: name.trim(), school_id: Number(schoolId) }
          : { name: name.trim(), faculty_id: Number(facultyId) };

    setBusy(true);
    try {
      if (editingId === null) {
        await createAdminResource(active, values);
        setNotice(`New ${activeTab.singular} added.`);
      } else {
        await updateAdminResource(active, editingId, values);
        setNotice(`${activeTab.singular} updated.`);
      }
      resetForm();
      await loadAll();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof ApiError || saveError instanceof Error
          ? saveError.message
          : `Could not save this ${activeTab.singular}.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (preview) {
      return setError("Preview mode: sign in as an admin to delete academic records.");
    }
    const row = rows.find((item) => item.id === id);
    if (!window.confirm(`Delete ${row?.name ?? "this record"}? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await deleteAdminResource(active, id);
      setNotice(`${activeTab.singular} deleted.`);
      if (editingId === id) resetForm();
      await loadAll();
    } catch (deleteError: unknown) {
      setError(
        deleteError instanceof ApiError || deleteError instanceof Error
          ? deleteError.message
          : `Could not delete this ${activeTab.singular}.`,
      );
    } finally {
      setBusy(false);
    }
  }

  function metaFor(id: number) {
    if (active === "schools") {
      const school = schools.find((item) => item.id === id);
      const facultyCount = faculties.filter((item) => item.school_id === id).length;
      return `${facultyCount} facult${facultyCount === 1 ? "y" : "ies"} Â· calendar offset ${school?.calendar_offset ?? 0}`;
    }
    if (active === "faculties") {
      const faculty = faculties.find((item) => item.id === id);
      const school = schools.find((item) => item.id === faculty?.school_id);
      const departmentCount = departments.filter(
        (item) => item.faculty_id === id,
      ).length;
      return `${school?.name ?? "Unknown school"} Â· ${departmentCount} department${departmentCount === 1 ? "" : "s"}`;
    }
    const department = departments.find((item) => item.id === id);
    const faculty = faculties.find((item) => item.id === department?.faculty_id);
    const school = schools.find((item) => item.id === faculty?.school_id);
    return [faculty?.name, school?.name].filter(Boolean).join(" Â· ") || "No faculty";
  }

  return (
    <>
      <PageIntro
        eyebrow="Structure"
        title="Academics"
        description="Manage the schools, faculties and departments that power onboarding and adviser matching."
        action={
          <button
            type="button"
            onClick={() => void loadAll()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-[#F0ECFF] bg-[#F7F5FF] px-5 py-2.5 text-sm font-semibold text-[#2501FF] hover:bg-[#F1EDFF] disabled:opacity-50"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />
      {error && <Notice onDismiss={() => setError("")}>{error}</Notice>}
      {notice && (
        <Notice tone="success" onDismiss={() => setNotice("")}>
          {notice}
        </Notice>
      )}
      {preview && (
        <Notice tone="warning" onDismiss={() => setPreview(false)}>
          Preview data shown. Sign in as an admin to manage the real academic
          structure.
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<SchoolIcon size={19} />}
          label="Schools"
          value={loading ? "â€”" : schools.length}
          note="Calendar owners"
          color="bg-[#2501FF]/[0.08] text-[#2501FF]"
        />
        <StatCard
          icon={<Building2 size={19} />}
          label="Faculties"
          value={loading ? "â€”" : faculties.length}
          note="Across all schools"
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={<GraduationCap size={20} />}
          label="Departments"
          value={loading ? "â€”" : departments.length}
          note="Student and adviser groups"
          color="bg-emerald-50 text-emerald-700"
        />
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
        <Card>
          <div className="flex flex-wrap gap-2">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => changeTab(key)}
                aria-pressed={active === key}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  active === key
                    ? "bg-[#2501FF] text-white"
                    : "bg-[#F7F5FF] text-slate-500 hover:text-[#2501FF]"
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#0B1030]">
                {activeTab.label}
              </h2>
              <span className="rounded-full bg-[#2501FF]/[0.08] px-3 py-1 text-xs font-bold text-[#2501FF]">
                {rows.length}
              </span>
            </div>

            {loading ? (
              <div className="mt-4 space-y-3">
                <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            ) : rows.length ? (
              <ul className="mt-3 divide-y divide-[#F5F2FF]">
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#0B1030]">
                        {row.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {metaFor(row.id)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(row.id)}
                        aria-label={`Edit ${row.name}`}
                        className="grid size-9 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-[#F7F5FF] hover:text-[#2501FF]"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(row.id)}
                        disabled={busy}
                        aria-label={`Delete ${row.name}`}
                        className="grid size-9 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4">
                <EmptyState
                  icon={<Layers3 size={20} />}
                  title={`No ${activeTab.label.toLowerCase()} yet`}
                  description={`Add your first ${activeTab.singular} using the form.`}
                />
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#F1EDFF] text-[#2501FF]">
              <Plus size={18} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#0B1030]">
                {editingId === null ? `Add ${activeTab.singular}` : `Edit ${activeTab.singular}`}
              </h2>
              <p className="text-sm text-slate-500">
                {active === "schools"
                  ? "Schools own the calendar offset."
                  : active === "faculties"
                    ? "Faculties belong to a school."
                    : "Departments belong to a faculty."}
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-xs font-semibold text-slate-700">
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={255}
                required
                placeholder={`${activeTab.singular} name`}
                className={inputClass}
              />
            </label>

            {active === "schools" && (
              <label className="block text-xs font-semibold text-slate-700">
                Calendar offset
                <input
                  type="number"
                  value={calendarOffset}
                  onChange={(event) => setCalendarOffset(event.target.value)}
                  className={inputClass}
                />
                <span className="mt-1 block text-[11px] font-normal text-slate-400">
                  0 means aligned with the calendar year.
                </span>
              </label>
            )}

            {active === "faculties" && (
              <label className="block text-xs font-semibold text-slate-700">
                School
                <select
                  value={schoolId}
                  onChange={(event) => setSchoolId(event.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select a school</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {active === "departments" && (
              <label className="block text-xs font-semibold text-slate-700">
                Faculty
                <select
                  value={facultyId}
                  onChange={(event) => setFacultyId(event.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select a faculty</option>
                  {faculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-[#F5F2FF] pt-4">
              {editingId === null ? (
                <span className="text-xs text-slate-400">Field values are required.</span>
              ) : (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold text-slate-500 hover:text-[#2501FF]"
                >
                  Cancel edit
                </button>
              )}
              <PrimaryButton type="submit" disabled={busy || !name.trim()}>
                {editingId === null ? (
                  <>
                    <Plus size={15} /> {busy ? "Savingâ€¦" : `Add ${activeTab.singular}`}
                  </>
                ) : (
                  <>
                    <Pencil size={15} /> {busy ? "Savingâ€¦" : "Save changes"}
                  </>
                )}
              </PrimaryButton>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}

import "dotenv/config";
import pool from "./src/config/database.js";

/**
 * Editable academic seed data.
 * Replace the school / faculty / department names below with the real ones,
 * then run: node seed.academic.js
 * Safe to re-run: existing rows are skipped by name.
 */
const SCHOOLS = [
  {
    name: "Sample University",
    calendarOffset: 0,
    faculties: [
      {
        name: "Faculty of Science",
        departments: ["Computer Science", "Mathematics", "Physics", "Chemistry", "Biology"],
      },
      {
        name: "Faculty of Engineering",
        departments: ["Civil Engineering", "Electrical Engineering", "Mechanical Engineering"],
      },
      {
        name: "Faculty of Arts",
        departments: ["English", "History", "Philosophy", "Linguistics"],
      },
      {
        name: "Faculty of Social Sciences",
        departments: ["Economics", "Sociology", "Political Science", "Psychology"],
      },
      {
        name: "Faculty of Management Sciences",
        departments: ["Accounting", "Business Administration", "Finance"],
      },
      {
        name: "Faculty of Education",
        departments: ["Educational Management", "Guidance and Counselling", "Science Education"],
      },
    ],
  },
];

async function ensureSchool(name, calendarOffset) {
  const [existing] = await pool.query("SELECT id FROM schools WHERE name = ?", [name]);
  if (existing[0]) return existing[0].id;
  const [result] = await pool.query(
    "INSERT INTO schools (name, calendar_offset) VALUES (?, ?)",
    [name, calendarOffset],
  );
  return result.insertId;
}

async function ensureFaculty(name, schoolId) {
  const [existing] = await pool.query(
    "SELECT id FROM faculties WHERE name = ? AND school_id = ?",
    [name, schoolId],
  );
  if (existing[0]) return existing[0].id;
  const [result] = await pool.query(
    "INSERT INTO faculties (name, school_id) VALUES (?, ?)",
    [name, schoolId],
  );
  return result.insertId;
}

async function ensureDepartment(name, facultyId) {
  const [existing] = await pool.query(
    "SELECT id FROM departments WHERE name = ? AND faculty_id = ?",
    [name, facultyId],
  );
  if (existing[0]) return existing[0].id;
  const [result] = await pool.query(
    "INSERT INTO departments (name, faculty_id) VALUES (?, ?)",
    [name, facultyId],
  );
  return result.insertId;
}

async function main() {
  for (const school of SCHOOLS) {
    const schoolId = await ensureSchool(school.name, school.calendarOffset ?? 0);
    for (const faculty of school.faculties) {
      const facultyId = await ensureFaculty(faculty.name, schoolId);
      for (const department of faculty.departments) {
        await ensureDepartment(department, facultyId);
      }
    }
    console.log(`Seeded ${school.name} (id ${schoolId})`);
  }

  const [[counts]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM schools) AS schools,
       (SELECT COUNT(*) FROM faculties) AS faculties,
       (SELECT COUNT(*) FROM departments) AS departments`,
  );
  console.log(
    `Done. schools: ${counts.schools}, faculties: ${counts.faculties}, departments: ${counts.departments}`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

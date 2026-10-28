export interface AcademicSession {
  startYear: number;
  endYear: number;
  label: string;
}

function makeSession(startYear: number): AcademicSession {
  return {
    startYear,
    endYear: startYear + 1,
    label: `${startYear}/${startYear + 1}`,
  };
}

export function getCurrentAcademicSession(
  calendarOffset: number,
  date = new Date(),
): AcademicSession {
  if (!Number.isInteger(calendarOffset)) {
    throw new TypeError("Calendar offset must be an integer");
  }
  return makeSession(date.getFullYear() - calendarOffset);
}

export function getAdmissionSessions(currentSession: AcademicSession): AcademicSession[] {
  return Array.from({ length: 7 }, (_, index) =>
    makeSession(currentSession.startYear - index),
  );
}

export function calculateLevel(
  admissionSession: string,
  currentSession: string,
): number | null {
  const admissionStart = parseSessionStartYear(admissionSession);
  const currentStart = parseSessionStartYear(currentSession);
  if (admissionStart === null || currentStart === null || admissionStart > currentStart) {
    return null;
  }
  return (currentStart - admissionStart + 1) * 100;
}

function parseSessionStartYear(session: string): number | null {
  const match = /^(\d{4})\/(\d{4})$/.exec(session);
  if (!match) return null;
  const startYear = Number(match[1]);
  return Number(match[2]) === startYear + 1 ? startYear : null;
}

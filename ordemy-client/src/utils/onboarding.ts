import type { UserProfile } from "../types/auth";

/**
 * A user still needs onboarding when their academic details are incomplete.
 * Students need faculty, department, and admission session.
 * Unverified lecturers need a department and the class session they advise.
 */
export function needsOnboarding(user: UserProfile | null): boolean {
  if (!user) return false;

  if (user.role === "student") {
    return !user.faculty_id || !user.department_id || !user.session;
  }

  if (user.role === "lecturer") {
    if (user.is_verified) return false;
    return !user.department_id || !user.session;
  }

  return false;
}

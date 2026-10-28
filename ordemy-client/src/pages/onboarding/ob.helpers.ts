import { ApiError, apiRequest } from "../../lib/api";
import type { EditUserRequest } from "../../types/edit";
import type { AcademicSchool, ApiMessage } from "../../utils/types";

export const EditRequest = (
  editData: EditUserRequest["editData"],
  token: string,
) =>
  apiRequest<ApiMessage>("/api/edit/user", {
    method: "POST",
    token,
    body: { editData },
  });

export const SaveAdviserDepartment = (
  departmentId: number,
  session: string,
  token: string,
) =>
  apiRequest<ApiMessage>("/api/auth/adviser-onboarding", {
    method: "POST",
    token,
    body: { department_id: departmentId, session },
  });

export const FetchAcademicStructure = async () => {
  const response = await apiRequest<{ data: AcademicSchool[] }>(
    "/api/fetch/academic-structure",
    {
      cache: "no-store",
    },
  );
  if (
    !Array.isArray(response.data) ||
    response.data.some(
      (school) =>
        !Number.isInteger(school.calendar_offset) ||
        typeof school.calendar_offset !== "number",
    )
  ) {
    throw new ApiError(
      "The academic structure response is missing a valid school calendar offset.",
      502,
    );
  }
  return response;
};

     
import { apiRequest } from "../../lib/api";
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

export const FetchAcademicStructure = () =>
  apiRequest<{ data: AcademicSchool[] }>("/api/fetch/academic-structure");

     
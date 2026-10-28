import type { QueryRecord } from "../utils/types";
import type { AuthUser } from "./auth";

export interface EditUserRequest {
    editData: {
        change: string;
        values: Partial<Pick<AuthUser, "name">> & {
            image?: string | null;
            session?: string | null;
            admission_session?: string | null;
            faculty_id?: number | null;
            department_id?: number | null;
        };
    };
}

export interface EditQueryRequest {
    editData: {
        query_id: number;
        change: string;
        values: Partial<Pick<QueryRecord, "subject" | "query">>;
    };
}

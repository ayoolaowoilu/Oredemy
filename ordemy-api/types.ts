export type UserRole = "student" | "lecturer" | "admin";

export type QueryType = "Results" | "Facilities" | "Timetable" | "Other";

export type QueryAudience = "Faculty" | "Department" | "School";

export interface ApiError {
    message: string;
}

export interface AuthHeaders {
    "x-token"?: string;
    Authorization?: string;
}

export interface ApiMessage {
    message: string;
}

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export interface AuthResponse {
    token: string;
    user: AuthUser;
    message: string;
}

export interface RegisterRequest {
    userData: {
        name: string;
        email: string;
        password: string;
        role?: Exclude<UserRole, "admin">;
    };
}

export interface LoginRequest {
    userData: {
        email: string;
        password: string;
    };
}

export interface UserProfile extends AuthUser {
    session: string | null;
    faculty: string | null;
    department: string | null;
    created_at: string;
}

export interface EditUserRequest {
    editData: {
        change: string;
        values: Partial<Pick<AuthUser, "name">> & { image?: string | null };
    };
}

export interface EditQueryRequest {
    editData: {
        query_id: number;
        change: string;
        values: Partial<Pick<QueryRecord, "subject" | "query">>;
    };
}

export interface AddQueryRequest {
    queryData: {
        subject: string;
        query: string;
        session: string;
        query_type?: QueryType;
        query_for?: QueryAudience;
    };
}

export interface DeleteQueryRequest {
    query_id: number;
}

export interface AddQueryResponse {
    id: number;
    message: string;
}

export interface QueryRecord {
    id: number;
    user_id: string;
    subject: string;
    query: string;
    query_type: QueryType;
    query_for: QueryAudience;
    session: string;
    created_at: string;
}

export type QuestionFetchScope = "department" | "faculty";

export interface FetchQuestionsQuery {
    session: string;
    scope?: QuestionFetchScope;
    page?: number;
    limit?: number;
    query_type?: QueryType;
}

export interface LecturerQuestion {
    id: number;
    subject: string;
    query: string;
    query_type: QueryType;
    query_for: QueryAudience;
    session: string;
    created_at: string;
    student_id: string;
    student_name: string;
    student_email: string;
    department_id: number | null;
    department: string | null;
    faculty_id: number | null;
    faculty: string | null;
}

export interface SectionQuestionCount {
    section: QueryType;
    total: number;
}

export interface DepartmentQuestionCount {
    department_id: number | null;
    department: string | null;
    total: number;
}

export interface FetchQuestionsResponse {
    data: LecturerQuestion[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    counts: {
        total: number;
        bySection: SectionQuestionCount[];
        byDepartment: DepartmentQuestionCount[];
    };
}

export interface School {
    id: number;
    name: string;
    calendar_offset: number;
    created_at: string;
}

export interface Faculty {
    id: number;
    name: string;
    school_id: number;
    created_at: string;
}

export interface Department {
    id: number;
    name: string;
    faculty_id: number;
    created_at: string;
}

export interface CreateSchoolRequest {
    name: string;
    calendar_offset?: number;
}

export type UpdateSchoolRequest = Partial<CreateSchoolRequest>;

export interface CreateFacultyRequest {
    name: string;
    school_id: number;
}

export type UpdateFacultyRequest = Partial<CreateFacultyRequest>;

export interface CreateDepartmentRequest {
    name: string;
    faculty_id: number;
}

export type UpdateDepartmentRequest = Partial<CreateDepartmentRequest>;

export interface AdminListResponse<T> {
    data: T[];
}

export interface AdminRecordResponse<T> {
    data: T;
}

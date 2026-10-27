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
    is_verified: boolean;
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
    chat_conversation_id?: string;
    message: string;
}

export type ChatConversationType = "support" | "lecturer" | "class";

export interface ChatConversation {
    id: string;
    type: ChatConversationType;
    student_id: string | null;
    lecturer_id: string | null;
    class_department_id?: number | null;
    class_session?: string | null;
    student_name?: string;
    lecturer_name?: string | null;
    class_department?: string | null;
    created_at: string;
    updated_at: string;
    last_message?: string | null;
    last_message_at?: string | null;
}

export interface ChatMessage {
    id: number;
    conversation_id: string;
    sender_id: string;
    sender_name: string;
    query_id: number | null;
    body: string;
    created_at: string;
}

export interface ChatSocketResult<T> {
    ok: boolean;
    data?: T;
    error?: ApiError;
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
    query_type?: QueryType | QueryType[];
    from?: string;
    to?: string;
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

export type ClassRepRequestStatus = "pending" | "approved" | "rejected";

export interface SubmitClassRepRequest {
    message?: string;
}

export interface ReviewClassRepRequest {
    status: "approved" | "rejected";
    note?: string;
}

export interface ClassRepRequest {
    id: number;
    student_id: string;
    student_name?: string;
    department_id: number;
    department?: string;
    session: string;
    message: string | null;
    status: ClassRepRequestStatus;
    reviewed_by?: string | null;
    decision_note?: string | null;
    created_at?: string;
    reviewed_at?: string | null;
}

export interface ClassRepRequestResponse {
    data: ClassRepRequest;
}

export interface ClassRepRequestListResponse {
    data: ClassRepRequest[];
}

export interface PendingLecturer {
    id: string;
    name: string;
    email: string;
    faculty_id: number | null;
    department_id: number | null;
    created_at: string;
}

export interface LecturerVerificationRequest {
    is_verified: boolean;
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

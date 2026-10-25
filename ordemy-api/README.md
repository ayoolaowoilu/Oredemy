# Ordemy API

Express and MySQL API for authentication, complaints, lecturer dashboards, class-representative requests, and administration.

## Run locally

Requirements: Node.js and MySQL.

1. Create the database and tables using [`data.sql`](./data.sql), or apply the migration for an existing database described under [Database setup](#database-setup).
2. Create an `.env` file in this directory:

   ```env
   PORT=8081
   DB_HOST=localhost
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=ordemy
   DB_PORT=3306
   JWT_SECRET=replace_with_a_long_random_secret
   ```

3. Install and start:

   ```sh
   npm install
   node server.js
   ```

Base URL locally: `http://localhost:8081`. `GET /` is a health check and returns `{ "message": "Server is running" }`.

## Quick start for frontend developers

- Send JSON requests with `Content-Type: application/json`.
- For authenticated routes, send **either** `x-token: <JWT>` **or** `Authorization: Bearer <JWT>`.
- Obtain a JWT from register or login. It expires after one hour.
- The example API responses below show the JSON body only; HTTP status codes are shown with each endpoint.
- User IDs are UUID strings. IDs for schools, faculties, departments, complaints, and class-rep requests are integers.
- Use the matching request/response interfaces in [`types.ts`](./types.ts).

## Endpoint index

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Create a student or lecturer account |
| `POST` | `/api/auth/login` | Public | Log in and receive a JWT |
| `GET` | `/api/auth/userdata` | Any signed-in user | Get the current user's profile |
| `POST` | `/api/edit/user` | Any signed-in user | Edit own name or image |
| `POST` | `/api/query/add` | Any signed-in user | Submit a complaint |
| `DELETE` | `/api/query/delete` | Any signed-in user | Delete own complaint |
| `POST` | `/api/edit/query` | Any signed-in user | Edit own complaint |
| `GET` | `/api/fetch/questions` | Verified lecturer | Get recent complaints, filters, and counts |
| `POST` | `/api/class-rep/requests` | Signed-in student | Request class-rep status |
| `GET` | `/api/class-rep/requests/mine` | Signed-in user | Check own class-rep request history |
| `GET` | `/api/class-rep/requests` | Verified lecturer | List pending requests in own department |
| `PATCH` | `/api/class-rep/requests/:id` | Verified lecturer | Approve or reject a request |
| `GET` | `/api/admin/lecturers/pending` | Admin | List lecturers awaiting verification |
| `PATCH` | `/api/admin/lecturers/:id/verification` | Admin | Verify or unverify a lecturer |
| `GET` | `/api/admin/schools` | Admin | List schools |
| `POST` | `/api/admin/schools` | Admin | Create a school |
| `PATCH` | `/api/admin/schools/:id` | Admin | Update a school |
| `DELETE` | `/api/admin/schools/:id` | Admin | Delete a school |
| `GET` | `/api/admin/faculties` | Admin | List faculties |
| `POST` | `/api/admin/faculties` | Admin | Create a faculty |
| `PATCH` | `/api/admin/faculties/:id` | Admin | Update a faculty |
| `DELETE` | `/api/admin/faculties/:id` | Admin | Delete a faculty |
| `GET` | `/api/admin/departments` | Admin | List departments |
| `POST` | `/api/admin/departments` | Admin | Create a department |
| `PATCH` | `/api/admin/departments/:id` | Admin | Update a department |
| `DELETE` | `/api/admin/departments/:id` | Admin | Delete a department |

## Authentication endpoints

### Register

`POST /api/auth/register` — no authentication required. Returns `201`.

| Body field | Required | Type | Notes |
| --- | --- | --- | --- |
| `userData.name` | Yes | string | 3–255 characters |
| `userData.email` | Yes | string | Must be a valid email |
| `userData.password` | Yes | string | At least 6 characters; must include a letter and a number |
| `userData.role` | No | `"student"` or `"lecturer"` | Defaults to `"student"`. `"admin"` is not allowed. Lecturers start unverified. |

```json
{
  "userData": {
    "name": "Example Student",
    "email": "student@example.com",
    "password": "Choose123",
    "role": "student"
  }
}
```

Response: `{ "token": "<JWT>", "user": { "id": "<uuid>", "name": "Example Student", "email": "student@example.com", "role": "student", "is_verified": true }, "message": "Registration Successful" }`.

### Log in

`POST /api/auth/login` — no authentication required. Returns `200`.

| Body field | Required | Type | Notes |
| --- | --- | --- | --- |
| `userData.email` | Yes | string | Valid email |
| `userData.password` | Yes | string | At least 6 characters; must include a letter and a number |

```json
{
  "userData": {
    "email": "student@example.com",
    "password": "Choose123"
  }
}
```

Response has the same `token` and `user` shape as register. Invalid credentials return `401`.

### Get current user profile

`GET /api/auth/userdata` — requires authentication. No path, query, or body parameters. Returns `200`.

Response fields: `id`, `name`, `email`, `role`, `is_verified`, `session`, `faculty`, `department`, `created_at`. `session`, `faculty`, and `department` can be `null`.

## Profile and complaint endpoints

### Edit your profile

`POST /api/edit/user` — requires authentication. The user is determined by the JWT; do not send a user ID. Returns `200`.

| Body field | Required | Type | Notes |
| --- | --- | --- | --- |
| `editData.change` | Yes | string | Comma-separated list containing only `name` and/or `image` |
| `editData.values` | Yes | object | Must contain exactly the fields listed in `change` |
| `editData.values.name` | If changing name | string | Non-empty, at most 255 characters |
| `editData.values.image` | If changing image | string or `null` | Image URL/string, or `null` to clear |

```json
{
  "editData": {
    "change": "name,image",
    "values": {
      "name": "Updated Name",
      "image": "https://example.com/profile.png"
    }
  }
}
```

Example response: `{ "message": "Made changes to: name,image" }`.

### Submit a complaint

`POST /api/query/add` — requires authentication. The API takes the complainant's user ID from the JWT. Returns `201`.

| Body field | Required | Type | Notes |
| --- | --- | --- | --- |
| `queryData.subject` | Yes | string | Non-empty, at most 100 characters |
| `queryData.query` | Yes | string | Non-empty complaint details |
| `queryData.session` | Yes | string | Non-empty session name, at most 200 characters |
| `queryData.query_type` | No | string enum | `Results`, `Facilities`, `Timetable`, or `Other`; defaults to `Other` |
| `queryData.query_for` | No | string enum | `Faculty`, `Department`, or `School`; defaults to `Department` |

```json
{
  "queryData": {
    "subject": "Exam results",
    "query": "Please help me check my result.",
    "session": "2025/2026",
    "query_type": "Results",
    "query_for": "Department"
  }
}
```

Response: `{ "id": 123, "message": "Query submitted" }`.

### Edit your complaint

`POST /api/edit/query` — requires authentication. The complaint must belong to the signed-in user. Returns `200`.

| Body field | Required | Type | Notes |
| --- | --- | --- | --- |
| `editData.query_id` | Yes | positive integer | Complaint to edit |
| `editData.change` | Yes | string | Comma-separated `subject` and/or `query` |
| `editData.values` | Yes | object | Must contain exactly the fields listed in `change` |
| `editData.values.subject` | If changing subject | string | Non-empty, at most 100 characters |
| `editData.values.query` | If changing query | string | Non-empty complaint details |

```json
{
  "editData": {
    "query_id": 123,
    "change": "subject,query",
    "values": {
      "subject": "Updated subject",
      "query": "Updated complaint details"
    }
  }
}
```

Example response: `{ "message": "Made changes to: subject,query" }`.

### Delete your complaint

`DELETE /api/query/delete` — requires authentication. The complaint must belong to the signed-in user. Returns `200`.

| Body field | Required | Type | Notes |
| --- | --- | --- | --- |
| `query_id` | Yes | positive integer | Complaint to delete |

```json
{
  "query_id": 123
}
```

Response: `{ "message": "Query deleted" }`.

## Lecturer dashboard: recent complaints and counts

`GET /api/fetch/questions` — requires a verified lecturer. Complaints are restricted to the lecturer's own assigned department or faculty. You cannot pass a department/faculty ID to access a different unit. Results are ordered newest first.

### Query parameters

| Parameter | Required | Type | Default | Meaning |
| --- | --- | --- | --- | --- |
| `session` | Yes | string | — | Only return complaints submitted for this session |
| `scope` | No | `"department"` or `"faculty"` | `"department"` | Limit to the lecturer's department or their faculty |
| `page` | No | positive integer | `1` | Page number, starting at 1 |
| `limit` | No | integer, 1–100 | `20` | Number of complaints in each page |
| `query_type` | No | enum, repeated enum, or comma-separated enums | All types | Filter the complaint list. Valid values: `Results`, `Facilities`, `Timetable`, `Other` |
| `from` | No | `YYYY-MM-DD` | No lower date limit | Include complaints from this date onward; inclusive |
| `to` | No | `YYYY-MM-DD` | No upper date limit | Include complaints up to this date; inclusive |

`from` cannot be later than `to`. Dates filter complaints by their `created_at` timestamp. Counts always reflect the session, scope, and date range, but deliberately ignore `query_type`, so the dashboard totals remain stable while browsing a filtered type.

Examples:

```http
GET /api/fetch/questions?session=2025%2F2026
GET /api/fetch/questions?session=2025%2F2026&scope=faculty&page=2&limit=20
GET /api/fetch/questions?session=2025%2F2026&query_type=Results&query_type=Other
GET /api/fetch/questions?session=2025%2F2026&query_type=Results%2COther&from=2026-10-01&to=2026-10-25
```

Response shape:

```json
{
  "data": [
    {
      "id": 123,
      "subject": "Exam results",
      "query": "Please help me check my result.",
      "query_type": "Results",
      "query_for": "Department",
      "session": "2025/2026",
      "created_at": "2026-10-25T12:00:00.000Z",
      "student_id": "<uuid>",
      "student_name": "Example Student",
      "student_email": "student@example.com",
      "department_id": 2,
      "department": "Computer Science",
      "faculty_id": 1,
      "faculty": "Science"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  },
  "counts": {
    "total": 25,
    "bySection": [
      { "section": "Results", "total": 10 },
      { "section": "Facilities", "total": 5 },
      { "section": "Timetable", "total": 7 },
      { "section": "Other", "total": 3 }
    ],
    "byDepartment": [
      { "department_id": 2, "department": "Computer Science", "total": 25 }
    ]
  }
}
```

- `pagination.total` and `pagination.totalPages` describe the filtered complaint list.
- `counts.total` is the total across all query types in the session/scope/date range.
- `counts.bySection` always contains all four complaint types, including zero-count types.
- `counts.byDepartment` contains each department in scope, including departments with zero complaints.

## Class-representative requests

Only students can submit requests. Their department and session are taken from their own account; these must be assigned before they can submit. A student cannot have another pending request or already-approved request for the same session. Only a verified lecturer assigned to the request's department can review it. At most one representative may be approved per department and session.

### Submit request

`POST /api/class-rep/requests` — requires a signed-in student. Returns `201`.

| Body field | Required | Type | Notes |
| --- | --- | --- | --- |
| `message` | No | string | Optional note to the lecturer; maximum 1000 characters |

```json
{
  "message": "I would like to represent my class."
}
```

Response: `{ "data": { "id": 42, "student_id": "<uuid>", "department_id": 2, "session": "2025/2026", "message": "I would like to represent my class.", "status": "pending" } }`.

### Check your request status/history

`GET /api/class-rep/requests/mine` — requires authentication. No parameters. Returns `{ "data": [...] }` with the signed-in user's own request history. Students use this route to check their status.

### List requests for lecturer review

`GET /api/class-rep/requests` — requires a verified lecturer with an assigned department. No parameters. Returns `{ "data": [...] }` containing pending requests only for the lecturer's department.

### Approve or reject a request

`PATCH /api/class-rep/requests/:id` — requires a verified lecturer assigned to the request's department.

| Parameter | Required | Type | Meaning |
| --- | --- | --- | --- |
| Path `id` | Yes | positive integer | Class-rep request ID |
| Body `status` | Yes | `"approved"` or `"rejected"` | Decision |
| Body `note` | No | string, maximum 1000 characters | Optional decision note |

```json
{
  "status": "approved",
  "note": "Approved for the 2025/2026 session."
}
```

Response: `{ "message": "Class-representative request approved" }`. A conflicting already-approved representative returns `409`.

## Lecturer verification (admin)

New lecturer accounts have `is_verified: false`. Unverified lecturers cannot access the lecturer complaint dashboard or review class-rep requests. A trusted admin must verify them first.

### List lecturers awaiting verification

`GET /api/admin/lecturers/pending` — requires an admin token. No parameters. Returns `{ "data": [...] }` with each lecturer's `id`, `name`, `email`, `faculty_id`, `department_id`, and `created_at`.

### Verify or revoke a lecturer

`PATCH /api/admin/lecturers/:id/verification` — requires an admin token.

| Parameter | Required | Type | Meaning |
| --- | --- | --- | --- |
| Path `id` | Yes | UUID string | Lecturer user ID |
| Body `is_verified` | Yes | boolean | `true` grants lecturer access; `false` revokes it |

```json
{
  "is_verified": true
}
```

Response: `{ "message": "Lecturer verified" }`.

## Admin: schools, faculties, departments

All routes in this section require an admin token. Collection `GET` responses use `{ "data": [...] }`; create and update responses use `{ "data": {...} }`.

| Resource | Create body (all required unless noted) | Editable fields |
| --- | --- | --- |
| `schools` | `{ "name": "Example University", "calendar_offset": 0 }` (`calendar_offset` optional; defaults to `0`) | `name`, `calendar_offset` |
| `faculties` | `{ "name": "Science", "school_id": 1 }` | `name`, `school_id` |
| `departments` | `{ "name": "Computer Science", "faculty_id": 1 }` | `name`, `faculty_id` |

Use the matching resource path below. For all `PATCH` routes, send a JSON body with one or more of the resource's editable fields from the table above. For all `DELETE` routes, no request body is needed.

| Method | Path | Parameters |
| --- | --- | --- |
| `GET` | `/api/admin/schools` | None |
| `POST` | `/api/admin/schools` | Body: school fields |
| `PATCH` | `/api/admin/schools/:id` | Path `id`: positive integer; body: `name` and/or `calendar_offset` |
| `DELETE` | `/api/admin/schools/:id` | Path `id`: positive integer |
| `GET` | `/api/admin/faculties` | None |
| `POST` | `/api/admin/faculties` | Body: faculty fields |
| `PATCH` | `/api/admin/faculties/:id` | Path `id`: positive integer; body: `name` and/or `school_id` |
| `DELETE` | `/api/admin/faculties/:id` | Path `id`: positive integer |
| `GET` | `/api/admin/departments` | None |
| `POST` | `/api/admin/departments` | Body: department fields |
| `PATCH` | `/api/admin/departments/:id` | Path `id`: positive integer; body: `name` and/or `faculty_id` |
| `DELETE` | `/api/admin/departments/:id` | Path `id`: positive integer |

School names must be non-empty strings up to 255 characters. `school_id` and `faculty_id` must be positive integer IDs of existing parent records. Deleting a school also deletes its faculties/departments; deleting a faculty also deletes its departments.

Example update:

```http
PATCH /api/admin/faculties/4
Content-Type: application/json
x-token: <ADMIN_JWT>
```

```json
{
  "name": "Faculty of Science",
  "school_id": 1
}
```

## Errors

Error responses use `{ "message": "..." }`.

| Status | Meaning |
| --- | --- |
| `400` | Missing/invalid parameters or body fields |
| `401` | Missing, invalid, or expired token |
| `403` | Signed-in user lacks the required role or lecturer verification |
| `404` | Route or record not found |
| `409` | Duplicate record, duplicate request, or conflicting class-rep approval |
| `500` | Unexpected server error |

## Database setup

`data.sql` creates the schema for a new database. For an existing database created before lecturer verification/class-rep requests were added, apply the migration before running the updated API:

```sql
ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET is_verified = TRUE WHERE role IN ('student', 'admin');

CREATE TABLE class_rep_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    department_id INT NOT NULL,
    session VARCHAR(50) NOT NULL,
    message VARCHAR(1000) NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    reviewed_by VARCHAR(36) NULL,
    decision_note VARCHAR(1000) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    INDEX idx_class_rep_department_session_status (department_id, session, status),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_queries_session_type_created
    ON queries (session, query_type, created_at);
```

Existing lecturer accounts remain unverified until an admin explicitly approves them. Keep database credentials and JWT secrets out of frontend code and source control.

Frontend request/response TypeScript definitions are in [`types.ts`](./types.ts).

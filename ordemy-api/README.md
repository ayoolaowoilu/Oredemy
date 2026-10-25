# Ordemy API

Express API for authentication, user profile updates, learner queries, and administrator management of schools, faculties, and departments.

## Run locally

Requirements: Node.js and MySQL.

1. Create a MySQL user/database or use the `ordemy` database created by [`data.sql`](./data.sql).
2. Configure these environment variables in `ordemy-api/.env`:

   ```env
   PORT=8081
   DB_HOST=localhost
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=ordemy
   DB_PORT=3306
   JWT_SECRET=replace_with_a_long_random_secret
   ```

3. From this directory, install dependencies and start the server:

   ```sh
   npm install
   node server.js
   ```

The default port is `8081`. `GET /` returns `{ "message": "Server is running" }`.

## Requests and authentication

Send JSON with `Content-Type: application/json`. Authenticated routes accept either the `x-token` header or the standard HTTP Authorization token header.

Tokens expire after one hour. Registration only accepts the `student` and `lecturer` roles; an administrator account must be provisioned by a trusted database operator. The API checks the account's current database role for admin access.

## Authentication

### Register

`POST /api/auth/register`

```json
{
  "userData": {
    "name": "Example Learner",
    "email": "learner@example.com",
    "password": "Choose123",
    "role": "student"
  }
}
```

`role` is optional and defaults to `student`. Passwords must be at least six characters and contain a letter and a number. Returns `201`:

```json
{
  "token": "<JWT>",
  "user": {
    "id": "<uuid>",
    "name": "Example Learner",
    "email": "learner@example.com",
    "role": "student"
  },
  "message": "Registration Successful"
}
```

### Log in

`POST /api/auth/login`

```json
{
  "userData": {
    "email": "learner@example.com",
    "password": "Choose123"
  }
}
```

Returns `200` with the same token/user shape as registration and the message `Login Successful`.

### Get the current user's profile

`GET /api/auth/userdata` — authenticated.

Returns the user ID, name, email, role, session, faculty name, department name, and `created_at`. `session`, `faculty`, and `department` are `null` until assigned; `created_at` is an ISO timestamp.

## Profile and query operations

All routes below require authentication. The user identity comes from the token; clients must not send a user ID to select whose record is modified.

### Edit the current user's profile

`POST /api/edit/user`

Only `name` and `image` can be changed. `change` must list exactly the keys in `values`:

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

Returns `{ "message": "Made changes to: name,image" }`.

### Submit a query

`POST /api/query/add`

The user ID is taken from the token. `query_type` is one of `Results`, `Facilities`, `Timetable`, or `Other` (default `Other`); `query_for` is one of `Faculty`, `Department`, or `School` (default `Department`).

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

Returns `201` with `{ "id": 123, "message": "Query submitted" }`.

### Fetch questions for a lecturer

`GET /api/fetch/questions` — authenticated lecturer.

Questions are scoped to the lecturer's own department or faculty assignment; the client cannot request another department or faculty by ID. `session` is required. `scope` defaults to `department`; use `faculty` to include questions from all departments assigned to the lecturer's faculty. Pagination defaults to page `1` and limit `20`, with a maximum limit of `100`. `query_type` can optionally filter the returned page and counts.

```http
GET /api/fetch/questions?session=2025%2F2026&scope=faculty&page=1&limit=20
x-token: <LECTURER_JWT>
```

Response includes the question page, pagination metadata, counts by query category (`Results`, `Facilities`, `Timetable`, `Other`), and counts by department for the requested session/scope. These dashboard counts remain session/scope totals when `query_type` is used to filter the question page. Category counts are called `bySection` in the response.

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
      "student_name": "Example Learner",
      "student_email": "learner@example.com",
      "department_id": 2,
      "department": "Computer Science",
      "faculty_id": 1,
      "faculty": "Science"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  },
  "counts": {
    "total": 1,
    "bySection": [
      { "section": "Results", "total": 1 },
      { "section": "Facilities", "total": 0 },
      { "section": "Timetable", "total": 0 },
      { "section": "Other", "total": 0 }
    ],
    "byDepartment": [
      { "department_id": 2, "department": "Computer Science", "total": 1 }
    ]
  }
}
```

### Delete one of the current user's queries

`DELETE /api/query/delete`

```json
{
  "query_id": 123
}
```

Returns `{ "message": "Query deleted" }`. A user cannot delete another user's query.

### Edit one of the current user's queries

`POST /api/edit/query`

Only `subject` and `query` can be changed:

```json
{
  "editData": {
    "query_id": 123,
    "change": "subject,query",
    "values": {
      "subject": "Updated subject",
      "query": "Updated query details"
    }
  }
}
```

## Administrator routes

All admin routes require a valid token for an account whose database role is `admin`. They manage the tables defined in `data.sql`; IDs are auto-incrementing integers. Collection responses use `{ "data": [...] }`, and create/update responses use `{ "data": {...} }`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/schools` | List schools |
| `POST` | `/api/admin/schools` | Create a school: `{ "name": "Example University", "calendar_offset": 0 }` |
| `PATCH` | `/api/admin/schools/:id` | Update `name` and/or `calendar_offset` |
| `DELETE` | `/api/admin/schools/:id` | Delete a school (its faculties and departments cascade) |
| `GET` | `/api/admin/faculties` | List faculties |
| `POST` | `/api/admin/faculties` | Create a faculty: `{ "name": "Science", "school_id": 1 }` |
| `PATCH` | `/api/admin/faculties/:id` | Update `name` and/or `school_id` |
| `DELETE` | `/api/admin/faculties/:id` | Delete a faculty (its departments cascade) |
| `GET` | `/api/admin/departments` | List departments |
| `POST` | `/api/admin/departments` | Create a department: `{ "name": "Computer Science", "faculty_id": 1 }` |
| `PATCH` | `/api/admin/departments/:id` | Update `name` and/or `faculty_id` |
| `DELETE` | `/api/admin/departments/:id` | Delete a department |

For example, a school creation request is:

```http
POST /api/admin/schools
x-token: <ADMIN_JWT>
Content-Type: application/json
```

```json
{
  "name": "Example University",
  "calendar_offset": 0
}
```

To provision an administrator, create or promote a trusted account through a secure database administration process; public registration intentionally rejects the `admin` role. Do not expose database credentials or administrator tokens in a frontend bundle.

## Database tables

`data.sql` defines:

- `schools`: name, calendar offset, creation timestamp.
- `faculties`: school foreign key and cascading deletion with its school.
- `departments`: faculty foreign key and cascading deletion with its faculty.
- `users`: UUID ID, profile/authentication data, optional faculty/department assignments, session, and `student`/`lecturer`/`admin` role.
- `queries`: query subject/body/type/audience, session, owner, and creation timestamp.

## Errors

Errors return JSON in the shape `{ "message": "..." }`. Common status codes are `400` for invalid input, `401` for missing/invalid authentication, `403` for insufficient role, `404` for missing records, `409` for duplicate unique values, and `500` for unexpected server errors. Do not expose passwords, JWT secrets, or database credentials.

Frontend request and response contracts are in [`types.ts`](./types.ts).

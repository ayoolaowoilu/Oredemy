# Ordemy API

Express and MySQL API for authentication, complaints, lecturer dashboards, class-representative requests, and administration.

## Run locally

Requirements: Node.js and MySQL.

1. Create the database and tables using [`data.sql`](./data.sql), or apply the migration for an existing database described under [Database setup](#database-setup).
2. Create or update `.env` in this directory using [`.env.example`](./.env.example) as a template. Keep any existing database/JWT credentials when adding the cache settings:

   ```env
   PORT=8081
   DB_HOST=localhost
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=ordemy
   DB_PORT=3306
   JWT_SECRET=replace_with_a_long_random_secret
   CACHE_ENABLED=true
   CACHE_STORE=memory
   CACHE_TTL_SECONDS=30
   CACHE_MAX_ENTRIES=500
   REDIS_URL=redis://localhost:6379
   REDIS_KEY_PREFIX=ordemy:response:
   ```

3. Install and start:

   ```sh
   npm install
   node server.js
   ```

Base URL locally: `http://localhost:8081`. `GET /` is a health check and returns `{ "message": "Server is running" }`.

## Quick start for frontend developers

- Send JSON requests with `Content-Type: application/json`.
- Register and login are public: they do not need an authentication header.
- Obtain a JWT from register or login. It expires after one hour.
- For every other protected route, add the JWT in the request **Headers** (not in the URL or JSON body). Use either `x-token` with the raw JWT, or `Authorization` with `Bearer`, one space, then the JWT. The examples below show exactly where to set them.
- The example API responses below show the JSON body only; HTTP status codes are shown with each endpoint.
- User IDs are UUID strings. IDs for schools, faculties, departments, complaints, and class-rep requests are integers.
- Use the matching request/response interfaces in [`types.ts`](./types.ts).

### Where to put request headers

**In Postman**

1. Open the request and select the **Headers** tab.
2. Add one of these rows:

   | Key | Value |
   | --- | --- |
   | `x-token` | Paste the JWT returned by register/login (without quotes and without `Bearer`) |

   Or use the standard Authorization header:

   | Key | Value |
   | --- | --- |
   | `Authorization` | Type `Bearer`, add one space, then paste the JWT |

3. For requests with a JSON body, select **Body → raw → JSON**. Postman will set `Content-Type: application/json`; if setting it yourself, add it in the **Headers** tab.
4. Do not add the JWT to the URL, query string, or request body. Do not set an auth header for `POST /api/auth/register` or `POST /api/auth/login`.

**In browser `fetch`**

Set the `headers` property in the request options. This example uses `Authorization`; use `x-token: token` instead if preferred:

```ts
const token = loginResponse.token;

const response = await fetch("http://localhost:8081/api/auth/userdata", {
  method: "GET",
  headers: {
    Authorization: ["Bearer", token].join(" "),
  },
});

const profile = await response.json();
```

For a JSON POST, include both headers and serialize the body:

```ts
const response = await fetch("http://localhost:8081/api/query/add", {
  method: "POST",
  headers: {
    Authorization: ["Bearer", token].join(" "),
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    queryData: {
      subject: "Exam results",
      query: "Please help me check my result.",
      session: "2025/2026",
      query_type: "Results",
      query_for: "Department",
    },
  }),
});
```

To use the custom token header with `fetch`, change the `Authorization` line to `"x-token": token`.

Before submitting a question, make sure the signed-in user has both `faculty_id` and `department_id` set on their profile. Otherwise, `POST /api/query/add` returns `400`.

**In Axios**

Pass headers in the third argument for a POST (or in the second argument for a GET):

```ts
await axios.get("http://localhost:8081/api/auth/userdata", {
  headers: { Authorization: ["Bearer", token].join(" ") },
});

await axios.post(
  "http://localhost:8081/api/query/add",
  { queryData: { subject, query, session, query_type: "Results" } },
  {
    headers: {
      Authorization: ["Bearer", token].join(" "),
      "Content-Type": "application/json",
    },
  },
);
```

## Server-side response cache

The API supports a selectable cache in [`src/middleware/response-cache.js`](./src/middleware/response-cache.js). It caches successful JSON responses for:

- `GET /api/fetch/questions` (after authentication and lecturer verification).
- `GET /api/admin/schools`, `/api/admin/faculties`, and `/api/admin/departments` (after admin authentication).

Cache entries are isolated by signed-in user and full request URL, including query parameters. Responses are only cached server-side; `Cache-Control: private, no-store` prevents browsers or shared proxies from keeping a separate copy. Cached responses include `X-Cache: HIT` or `X-Cache: MISS` so the frontend can inspect cache behavior while debugging.

### Change cache settings

Set these values in the API `.env` file, then restart the server. **Set `CACHE_STORE` to choose the cache service**:

| Setting | Default | Effect |
| --- | --- | --- |
| `CACHE_ENABLED` | `true` | Set to `false` to bypass caching without changing routes |
| `CACHE_STORE` | `memory` | `memory` uses this API process; set to `redis` to use Redis |
| `CACHE_TTL_SECONDS` | `30` | Seconds a cached response remains valid; must be a positive integer |
| `CACHE_MAX_ENTRIES` | `500` | Maximum number of in-memory entries; least-recently-used entries are evicted first. Not used by Redis. |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL; used when `CACHE_STORE=redis`. Include credentials/TLS options in the URL when required by your Redis provider. |
| `REDIS_KEY_PREFIX` | `ordemy:response:` | Prefix for this API's Redis keys, useful when Redis is shared by multiple apps/environments |

**Current in-memory cache:**

```env
CACHE_ENABLED=true
CACHE_STORE=memory
CACHE_TTL_SECONDS=30
CACHE_MAX_ENTRIES=500
```

**Switch to Redis:**

```env
CACHE_ENABLED=true
CACHE_STORE=redis
CACHE_TTL_SECONDS=30
REDIS_URL=redis://localhost:6379
REDIS_KEY_PREFIX=ordemy:response:
```

Install the API dependencies with `npm install`; the Redis client is included. Start a Redis service and set `REDIS_URL` to its connection URL. `rediss://` URLs are supported for TLS-enabled Redis services. Restart the API after changing cache environment variables.

Responses larger than 1 MiB are not cached. Every successful non-GET API request clears the cache, so new complaints, edits, deletions, admin updates, and lecturer verification changes show up on the next read. Failed requests do not clear it.

The memory cache resets on restart and is not shared between API instances. Redis shares cached responses between instances. If Redis is temporarily unavailable, the API logs the cache error and bypasses caching so requests can still use MySQL; restore Redis to resume cache hits.

## Endpoint index

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Create a student or lecturer account |
| `POST` | `/api/auth/login` | Public | Log in and receive a JWT |
| `GET` | `/api/auth/userdata` | Any signed-in user | Get the current user's profile |
| `POST` | `/api/auth/adviser-onboarding` | Unverified lecturer | Assign the adviser to a department and class session before administrator verification |
| `POST` | `/api/auth/profile-image` | Any signed-in user | Upload a profile image to Cloudinary and save its URL |
| `POST` | `/api/edit/user` | Any signed-in user | Edit own profile; students can update academic details |
| `POST` | `/api/query/add` | Signed-in user with faculty and department set | Submit a complaint; student questions also enter the support chat |
| `DELETE` | `/api/query/delete` | Any signed-in user | Delete own complaint |
| `POST` | `/api/edit/query` | Any signed-in user | Edit own complaint |
| `GET` | `/api/fetch/academic-structure` | Public | Fetch schools, faculties, and departments for profile selections |
| `GET` | `/api/fetch/questions` | Verified lecturer | Get recent complaints, filters, and counts |
| `GET` | `/api/chat/conversations` | Student, verified lecturer, or admin | List conversations available to the signed-in user |
| `POST` | `/api/chat/conversations` | Student | Open or retrieve a support, class-group, or matched lecturer conversation |
| `GET` | `/api/chat/conversations/:id/messages` | Conversation participant or admin support | Read conversation messages |
| `POST` | `/api/chat/conversations/:id/messages` | Conversation participant or admin support | Send a chat message |
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

Response fields: `id`, `name`, `email`, `role`, `image`, `is_verified`, `session`, `faculty_id`, `department_id`, `faculty`, `department`, `created_at`. Academic IDs, session, faculty, and department can be `null`.

### Upload a profile image

`POST /api/auth/profile-image` — requires authentication. Send the image bytes directly with `Content-Type: image/jpeg`, `image/png`, or `image/webp`. Images are limited to 5 MB. The API signs the Cloudinary request using server-only environment variables, saves the returned secure URL to the signed-in user's profile, and returns `{ "image": "https://..." }`. Never put Cloudinary credentials in client code.

### Select an adviser department and class session

`POST /api/auth/adviser-onboarding` — requires authentication and an unverified lecturer account. Choose the school, faculty, department, and the cohort's admission session from `GET /api/fetch/academic-structure` and the session list shown during onboarding, then send the selected department ID and class session:

```json
{
  "department_id": 7,
  "session": "2022/2023"
}
```

The API looks up the department's faculty itself and saves both assignments with the class session; it does not trust a client-supplied faculty ID. Student questions and class chats are matched against this department and session. This does not grant access: an administrator must review and verify the adviser, and cannot verify an account without both a department and session assignment. Verified advisers must ask an administrator to change their assignment.

## Profile and complaint endpoints

### Edit your profile

`POST /api/edit/user` — requires authentication. The user is determined by the JWT; do not send a user ID. Returns `200`.

| Body field | Required | Type | Notes |
| --- | --- | --- | --- |
| `editData.change` | Yes | string | Comma-separated list containing `name`, `image`, `session`, `faculty_id`, and/or `department_id` |
| `editData.values` | Yes | object | Must contain exactly the fields listed in `change` |
| `editData.values.name` | If changing name | string | Non-empty, at most 255 characters |
| `editData.values.image` | If changing image | string or `null` | Image URL/string, or `null` to clear |
| `editData.values.session` | If changing session | string or `null` | Non-empty, at most 50 characters, or `null` to clear; students only |
| `editData.values.faculty_id` | If changing faculty | positive integer or `null` | Must identify an existing faculty; students only |
| `editData.values.department_id` | If changing department | positive integer or `null` | Must identify an existing department; students only |

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

The API validates that the department and faculty exist and belong together. If a student changes only `department_id`, the matching `faculty_id` is set automatically. To clear a department while keeping the faculty, send `department_id: null`; to clear a faculty while a department is selected, first clear/change the department too. Only students can change their academic session, faculty, or department; lecturer assignments remain managed by an administrator.

After a successful edit, call `GET /api/auth/userdata` again to refresh the profile in the frontend. The edit response is a confirmation message; the profile endpoint returns the updated IDs and display names.

Example: update a student's faculty, department, and academic session:

```json
{
  "editData": {
    "change": "faculty_id,department_id,session",
    "values": {
      "faculty_id": 2,
      "department_id": 7,
      "session": "2025/2026"
    }
  }
}
```

### Fetch faculties and departments for profile forms

`GET /api/fetch/academic-structure` — public; no authentication header is required. Returns all schools, nested faculties, and each faculty's departments. Use the IDs from this response in the profile edit request; when the user changes faculty, show only departments belonging to that faculty.

```json
{
  "data": [
    {
      "id": 1,
      "name": "Example University",
      "faculties": [
        {
          "id": 2,
          "name": "Science",
          "departments": [
            { "id": 7, "name": "Computer Science" }
          ]
        }
      ]
    }
  ]
}
```

Example frontend flow:

```ts
const { data: schools } = await apiRequest<{ data: AcademicStructureSchool[] }>(
  "/api/fetch/academic-structure",
  token,
);
const selectedFaculty = schools
  .flatMap((school) => school.faculties)
  .find((faculty) => faculty.id === facultyId);
const departments = selectedFaculty?.departments ?? [];
```

`apiRequest` should send the JWT in the `Authorization: Bearer <token>` header, as shown in the [frontend request examples](#where-to-put-request-headers). `AcademicStructureSchool` is defined in [`types.ts`](./types.ts).

### Submit a complaint

`POST /api/query/add` — requires authentication and the signed-in user must have both a faculty and department set in their profile. If either is missing, the API returns `400`; update the profile using [`POST /api/edit/user`](#edit-your-profile) first. The API takes the complainant's user ID from the JWT. Returns `201` on success.

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

For student submissions, the question is also saved as the first/new message in that student's customer-support conversation in the same database transaction. The response includes that conversation ID:

```json
{
  "id": 123,
  "chat_conversation_id": "a1b2c3d4-e5f6-4789-8abc-123456789012",
  "message": "Query submitted"
}
```

Non-student submissions retain the existing query behavior and do not create chat messages.

## Chat

Chat history and messages are stored in MySQL. There are three conversation types:

| Type | Who can use it | How it works |
| --- | --- | --- |
| `support` | The student who opened it and admins | A private student-to-customer-support thread. Student questions submitted through `/api/query/add` are also added here. |
| `lecturer` | The student and their matched verified lecturer | A private one-to-one thread. The API matches a lecturer in the student's department first, then tries the student's faculty. |
| `class` | Students in the same department and academic session, and verified lecturers assigned to that department | One shared group for a department/session. The API checks current class membership when listing chats, reading history, joining the socket room, and sending messages. |

Students must have a department and academic session set to join a class group. Student-to-student messages are allowed only in this shared class group; students cannot create private chats with other students. An admin can manage the customer-support inbox but is not automatically a member of class or lecturer conversations. The client never chooses a conversation member or class ID: the API derives membership from the authenticated account.

### Open a conversation

`POST /api/chat/conversations` — requires authentication as a student. Send `{ "type": "support" }` to open the student's support thread, `{ "type": "lecturer" }` to open a conversation with the matched lecturer, or `{ "type": "class" }` to open the shared group for the student's department/session. Repeated requests return the existing conversation when one exists.

```json
{ "type": "class" }
```

Response: `{ "data": { "id": "...", "type": "class", "class_department_id": 12, "class_session": "2025/2026", "created_at": "...", "updated_at": "..." } }`. A lecturer conversation also includes `student_id` and `lecturer_id`; a support conversation includes its `student_id`.

### List conversations

`GET /api/chat/conversations` — requires authentication. Students see their own support/lecturer conversations and their current class group. Verified lecturers see their assigned one-to-one conversations and class groups for their department. Admins see the customer-support inbox. Each item includes its `id`, `type`, `last_message`, and `last_message_at` (the last two are `null` for an empty conversation).

### Read messages

`GET /api/chat/conversations/:id/messages?limit=50&before=123` — requires access to the conversation. `limit` is optional (default `50`, maximum `100`); `before` is an optional message ID for fetching older messages. The response is `{ "data": [...] }`, ordered oldest to newest. To fetch the next older page, set `before` to the smallest `id` in the page already loaded.

### Send a message over REST

`POST /api/chat/conversations/:id/messages` — requires access to the conversation. Send a non-empty `body` of up to 5000 characters; the response is `{ "data": { ...message } }`.

### Frontend walkthrough

1. **Sign in and keep the token.** Call the existing register/login endpoint and keep the returned `token` in the same secure place as the rest of the app's auth state. Do not put it in a URL.
2. **Load chat navigation.** Request `GET /api/chat/conversations` with the JWT. Render each row by `type` (support, lecturer, or class). Students can show a “Class group” button even before there is a conversation; they can open it with the next step.
3. **Open or join a chat.** For a student, send `POST /api/chat/conversations` with `{ "type": "class" }`, `{ "type": "lecturer" }`, or `{ "type": "support" }`. Use the returned `data.id` as the conversation ID. A lecturer/admin selects an ID from their conversation list instead. If opening a lecturer chat returns `404`, no verified lecturer is assigned in that department/faculty yet; if opening a class chat returns `400`, the student's department/session has not been assigned.
4. **Join live updates and load previous messages.** Connect to Socket.IO, subscribe to `chat:message`, and wait for the `chat:join` acknowledgement. Then request `GET /api/chat/conversations/{id}/messages?limit=50` with the JWT and merge the history with any live events, deduplicating by message `id`. Joining first avoids missing messages sent while history is loading. Older pages use the `before` cursor described above.
5. **Send and append messages.** Send the message through the Socket.IO event below. Append the server's `chat:message` event to the current thread. The server persists a message before broadcasting it; do not treat a client-side optimistic message as confirmed until the acknowledgement or broadcast arrives. REST `POST /api/chat/conversations/{id}/messages` is also available if realtime sending is not desired.
6. **Clean up when changing screens.** Leave the old conversation, remove event listeners, and disconnect the socket when the user signs out. Reconnect with the current JWT after reconnect/sign-in and rejoin the currently open conversation. If a chat request returns `401`, refresh the app's signed-in state; `403` means that account is not a member of the conversation.

Example REST helper for browser clients:

```ts
const apiBase = "http://localhost:8081";
const token = loginResponse.token;

async function chatRequest<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? "Chat request failed");
  return result as T;
}

const conversations = await chatRequest<{ data: ChatConversation[] }>(
  "/api/chat/conversations",
  token,
);
const { data: classChat } = await chatRequest<{ data: ChatConversation }>(
  "/api/chat/conversations",
  token,
  { method: "POST", body: JSON.stringify({ type: "class" }) },
);
```

Import the `ChatConversation` and `ChatMessage` types from [`types.ts`](./types.ts) in the frontend project (or copy the matching interface definitions into the frontend). The snippets assume the frontend has installed `socket.io-client`; the backend's `socket.io` dependency does not install the frontend client.

### Realtime Socket.IO

`server.js` serves Socket.IO on the same host and port as the HTTP API. Install the client library in the frontend with `npm install socket.io-client`, then pass the JWT in the Socket.IO `auth` payload:

```ts
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import type { ChatMessage } from "./types";

// Inside the chat screen component; token and classChat come from auth/API state.
const [messages, setMessages] = useState<ChatMessage[]>([]);
useEffect(() => {
  let active = true;
  const socket = io("http://localhost:8081", { auth: { token } });
  setMessages([]);
  const mergeMessages = (current: ChatMessage[], incoming: ChatMessage[]) => {
    const byId = new Map(current.map((message) => [message.id, message]));
    for (const message of incoming) byId.set(message.id, message);
    return [...byId.values()].sort((a, b) => a.id - b.id);
  };
  const handleMessage = (message: ChatMessage) => {
    if (message.conversation_id === classChat.id) {
      setMessages((current) => mergeMessages(current, [message]));
    }
  };

  socket.on("chat:message", handleMessage);
  socket.emit("chat:join", { conversationId: classChat.id }, async (result) => {
    if (!result.ok) {
      console.error(result.error?.message ?? "Could not join chat");
      return;
    }
    try {
      const history = await chatRequest<{ data: ChatMessage[] }>(
        `/api/chat/conversations/${classChat.id}/messages?limit=50`,
        token,
      );
      if (active) setMessages((current) => mergeMessages(current, history.data));
    } catch (error) {
      console.error("Could not load chat history", error);
    }
  });

  return () => {
    active = false;
    socket.off("chat:message", handleMessage);
    socket.disconnect();
  };
}, [classChat.id, token]);
```

After joining, send messages in the same socket session. Acknowledge callbacks receive `{ ok: true, data }` on success or `{ ok: false, error: { message } }` on failure. `chat:message` broadcasts contain the saved message, including its server-assigned `id`, sender, body, and timestamp. The sender receives both the broadcast and acknowledgement; deduplicate both by message `id`.

```ts
socket.emit(
  "chat:message",
  { conversationId: classChat.id, body: "Hello, class!" },
  (result) => {
    if (!result.ok) console.error(result.error.message);
  },
);
```

If the frontend keeps one socket open while changing chats, leave the old room before joining the next one:

```ts
socket.emit("chat:leave", { conversationId: previousConversationId });
```

Disconnecting the socket when the chat screen closes also leaves its rooms.

The server validates the JWT and current class/conversation membership before joining rooms or storing messages. Set `CLIENT_ORIGIN` to a comma-separated list of allowed frontend origins; it defaults to `*` when unset. Message events are persisted before they are broadcast. For environments where the browser cannot use websockets, Socket.IO can fall back to HTTP long-polling; the REST history/send endpoints remain available.

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

Only students can submit requests. Their department and session are taken from their own account; these must be assigned before they can submit. A student cannot have another pending request or already-approved request for the same session. Only a verified lecturer assigned to the request's department and session can review it. At most one representative may be approved per department and session.

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

`GET /api/class-rep/requests` — requires a verified lecturer with an assigned department and session. No parameters. Returns `{ "data": [...] }` containing pending requests only for the lecturer's department and session.

### Approve or reject a request

`PATCH /api/class-rep/requests/:id` — requires a verified lecturer assigned to the request's department and session.

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

`data.sql` creates the schema for a new database. For an existing database created before lecturer verification/class-rep requests/chat were added, apply the applicable migration(s) before running the updated API:

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

CREATE TABLE chat_conversations (
    id VARCHAR(36) PRIMARY KEY,
    type ENUM('support', 'lecturer', 'class') NOT NULL,
    student_id VARCHAR(36) NULL,
    lecturer_id VARCHAR(36) NULL,
    class_department_id INT NULL,
    class_session VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_chat_conversations_student (student_id, updated_at),
    INDEX idx_chat_conversations_lecturer (lecturer_id, updated_at),
    UNIQUE KEY uq_chat_conversations_class (type, class_department_id, class_session),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_department_id) REFERENCES departments(id) ON DELETE CASCADE
);

CREATE TABLE chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    query_id INT NULL,
    body MEDIUMTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_chat_messages_conversation (conversation_id, id),
    UNIQUE KEY uq_chat_messages_query (query_id),
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE SET NULL
);
```

If you already created the chat tables using the earlier chat migration (where `chat_conversations.type` allowed only `support` and `lecturer`), keep the existing tables and run this one-time upgrade instead of running the `CREATE TABLE chat_conversations` / `CREATE TABLE chat_messages` statements again:

```sql
ALTER TABLE chat_conversations
    MODIFY COLUMN type ENUM('support', 'lecturer', 'class') NOT NULL,
    MODIFY COLUMN student_id VARCHAR(36) NULL,
    ADD COLUMN class_department_id INT NULL,
    ADD COLUMN class_session VARCHAR(50) NULL,
    ADD UNIQUE KEY uq_chat_conversations_class (type, class_department_id, class_session),
    ADD CONSTRAINT fk_chat_conversations_class_department
        FOREIGN KEY (class_department_id) REFERENCES departments(id) ON DELETE CASCADE;
```

This class-chat upgrade uses department plus academic session as the class identity. Existing support and lecturer conversations remain unchanged.

Existing lecturer accounts remain unverified until an admin explicitly approves them. Keep database credentials and JWT secrets out of frontend code and source control.

Frontend request/response TypeScript definitions are in [`types.ts`](./types.ts).

## Adviser AI and chat

For an existing database, run [`migrations/20261028_add_adviser_ai.sql`](./migrations/20261028_add_adviser_ai.sql) once before starting the updated API. If that migration was already applied, also run [`migrations/20261029_scope_adviser_scheduler_logs.sql`](./migrations/20261029_scope_adviser_scheduler_logs.sql) to scope recovery logs to the adviser. New databases receive the complete schema from `data.sql`.

Configure `GROQ_API_KEY` and optionally `GROQ_MODEL` in the API environment. The API key is server-only; it is not editable in the adviser dashboard or sent to the client. Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the API environment to enable profile photo uploads. Keep all values private and out of source control. Groq receives the subject and text of questions selected for grouping. Generated replies remain drafts until an adviser reviews and sends them.

The adviser endpoints are mounted under `/api/adviser` and require an authenticated, verified lecturer assigned to a department:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/adviser/dashboard` | Department question totals and pending class-rep requests |
| `GET` | `/api/adviser/ai-runs` | List scheduler runs and reply drafts |
| `GET` | `/api/adviser/scheduler-logs` | List recent scheduler startup, heartbeat and recovery logs |
| `PATCH` | `/api/adviser/ai-runs/:runId/groups/:groupId` | Save an edited draft |
| `POST` | `/api/adviser/ai-runs/:runId/groups/:groupId/send` | Send a reviewed draft to its students |

The scheduler checks hourly from 12:00 through 17:00 in `Africa/Lagos` when the server-side Groq key is configured. It writes startup, heartbeat, sleep-gap, catch-up and shutdown entries to `adviser_ai_scheduler_logs`; recovery is capped at 30 days. Daily department volume above 100 is marked critical in run logs and the adviser dashboard. Email alerts are not configured.

Adviser chat uses the existing authenticated Socket.IO endpoint. Verified lecturers can list `/api/chat/class-sessions` for their assigned session and create or open that department group with `POST /api/chat/conversations` using `{ "type": "class", "session": "2022/2023" }`. Student-to-adviser conversations are matched by department and session. Chat messages sent through REST or Socket.IO are broadcast to authorized conversation rooms.

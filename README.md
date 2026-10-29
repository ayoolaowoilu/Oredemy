<p align="center">
  <img src="ordemy-client/public/ordemylogo.svg" alt="Oredemy logo" width="260">
</p>

<h1 align="center">Oredemy</h1>

<p align="center">
  A student support and academic communication platform for students, lecturers, and administrators.
</p>

## What is Oredemy?

Oredemy brings student questions, lecturer responses, class communication, and academic administration together in one web platform. Students can ask questions and use course and chat features; lecturers can manage courses, class representatives, chats, and AI-assisted question groups; administrators can manage schools, faculties, departments, and lecturer verification.

The repository does **not** currently have a folder named `ordemy-app`. The complete Oredemy application is split across two folders:

- [`ordemy-client/`](./ordemy-client/) — the browser app built with React, TypeScript, and Vite.
- [`ordemy-api/`](./ordemy-api/) — the Express API and MySQL database schema.

In other words, “Oredemy app” means the client and API working together, not a third app folder.

## Screenshots

Screenshots are not included yet. Add the following image files to `docs/screenshots/` to display the main screens here:

| File to add | Suggested screen |
| --- | --- |
| `docs/screenshots/student-dashboard.png` | Student dashboard |
| `docs/screenshots/lecturer-ai-groups.png` | Lecturer AI question groups and reply controls |
| `docs/screenshots/admin-console.png` | Admin console |
| `docs/screenshots/mobile-chat.png` | Mobile chat and navigation |

Use real screenshots from the running app. Before sharing them, hide personal information, access tokens, and other private data.

## Run locally

You need Node.js 22 or later, MySQL, and a terminal.

### 1. Start the API

Follow the [API setup guide](./ordemy-api/README.md#run-locally). In short:

```sh
cd ordemy-api
npm install
node server.js
```

The API uses `http://localhost:8081` by default. Create its `.env` from [`ordemy-api/.env.example`](./ordemy-api/.env.example), configure the database, and initialize the schema using [`ordemy-api/data.sql`](./ordemy-api/data.sql) or the applicable migrations.

### 2. Start the frontend

In a second terminal:

```sh
cd ordemy-client
npm install
npm run dev
```

The Vite development server prints the local frontend URL when it starts. To point the frontend to a non-default API URL, set `VITE_API_URL` in `ordemy-client/.env.local`. Frontend environment variables are public to the browser: **never put database passwords, JWT secrets, Groq keys, or other service secrets there.**

## Project documentation

- [Frontend README](./ordemy-client/README.md) — roles, pages, frontend setup, and deployment.
- [API README](./ordemy-api/README.md) — API setup, environment variables, migrations, endpoints, and test data.

## License

This project is distributed under the [MIT License](./LICENSE).
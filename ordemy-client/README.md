# Oredemy Frontend

React, TypeScript, and Vite application for Oredemy students, lecturers, and administrators.

For API setup, database migrations, endpoints, and the AI test seed, see the [API README](../ordemy-api/README.md).

## Requirements

- Node.js 22 or later
- The Oredemy API running locally or deployed

## Run locally

1. Install dependencies:

   ```sh
   npm install
   ```

2. Optionally create `.env.local` in `ordemy-client` and set the API base URL:

   ```env
   VITE_API_URL=http://localhost:8081
   ```

   Vite uses the local API URL by default. In development, API requests go through the Vite proxy. For a deployed frontend, set `VITE_API_URL` to the API's HTTPS base URL (for example, `https://your-api.onrender.com`) and redeploy. Do not add AI, database, JWT, or Cloudinary secrets to frontend environment variables.

3. Start the development server:

   ```sh
   npm run dev
   ```

Other useful commands:

```sh
npm run lint
npm run build
npm run preview
```

## Account setup and profile

Students and lecturers select their school, faculty, and department during onboarding.

- Students also select their admission session. Oredemy uses it and the school's academic calendar to calculate their current level.
- Lecturers select the cohort session they advise. Their account requires administrator verification before adviser tools become available.
- The student **Settings** page lets students edit their name, profile photo, school, faculty, department, and admission session. Email is read-only.
- Adviser **Settings** lets lecturers edit their name and photo. Once verified, department and cohort assignments are admin-managed.
- Profile photo uploads require the API's server-side Cloudinary configuration; see [API environment setup](../ordemy-api/README.md#adviser-ai-and-chat).

## Courses and class representatives

Verified lecturers can use **Courses** to add and delete courses with:

- Course name
- Course code
- Units (1–30)
- Level (100, 200, 300, 400, 500, or 600)

Courses are saved for the lecturer's department and the school's current academic session. Students see courses matching their own department, computed level, and current session in **Curriculum**. Apply the course migration before using this feature on an existing database; instructions are in the [API README](../ordemy-api/README.md#database-setup).

On the **Class reps** page, lecturers review pending applications and see approved representatives for their assigned cohort. A lecturer can revoke an approved representative's authority. Students see the revoked status and may apply again.

## Adviser AI

The **AI review** page lists generated question groups and drafts. Each group stays review-only unless the lecturer chooses **Reply to questions like this in future** and approves the reply text. Scheduled runs compare new question groups with the saved examples and automatically answer only groups the AI identifies as the same issue, using the approved reply. The lecturer can update or cancel each group’s rule. AI replies are labeled and students receive normal chat notifications.

The scheduler runs hourly between 12:00 and 17:00 Africa/Lagos when `GROQ_API_KEY` is configured on the API. An adviser needs to be verified, assigned to a department and cohort, and have recent questions linked to their lecturer chat. AI run notifications appear in the adviser workspace and AI review page. Since similarity is determined by the AI model, only save replies that are appropriate to send automatically if a future question is judged to match.

To try this flow, use the test-only SQL seed and sample accounts documented in the [API README](../ordemy-api/README.md#testing-courses-class-rep-revocation-and-ai-grouping). Never run test seed data against production.

## Deployment notes

- Build command: `npm run build`
- Publish directory: `dist`
- Set `VITE_API_URL` to the deployed API base URL in the frontend hosting provider.
- Set the frontend's exact HTTPS origin in the API's `CLIENT_ORIGIN` environment variable to allow browser requests.
- Deploy the API and apply its required migrations before deploying the frontend features that depend on them.

Keep all service secrets on the API server. See the [API README](../ordemy-api/README.md) for CORS, environment variables, migrations, and the endpoint reference.

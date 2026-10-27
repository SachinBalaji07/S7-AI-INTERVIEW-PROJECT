<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# InterviewAI Platform

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e1381f08-7263-4fa3-8a07-dd0530b7413b

## Run locally

**Prerequisites:** Node.js 22 or later

1. Install dependencies with `npm install`.
2. Optionally set `GEMINI_API_KEY` in `.env` to enable Gemini-powered assessment analysis.
3. Start the server with `npm run dev`.
4. Open `http://localhost:3000`.

The server stores accounts, candidate profiles, shared assessment question banks, jobs, applications, and submitted round results in `data/interviewai.sqlite`. This file is created automatically and is excluded from Git. When deploying, use a persistent disk for this file and point `INTERVIEWAI_DB_PATH` at that disk if needed. All users must access the same running server to see the same jobs, question banks, and applications.

### Recruiter and candidate flow

- Demo recruiter: `recruiter@interviewai.com` / `password123`
- Demo candidate: `alex.johnson@example.com` / `password123`
- Recruiters create a job under **Jobs & Assessments** and select question bank items for each round.
- Recruiters manage aptitude, coding, and interview pools under **Question Bank**. Aptitude questions support pie-chart data; coding questions accept runnable JavaScript test cases. Skill tags can suggest matching questions when setting up a job.
- Candidates complete their profile and key skills, browse open roles, apply, and select an application to launch its assessment.
- Round 3 uses the selected interview questions and adds context from the candidate's stated role and matching skills. Uploaded resume files are available for recruiter review; resume text is not automatically extracted.
- Old browser-local accounts can be migrated by signing in once with their existing password.

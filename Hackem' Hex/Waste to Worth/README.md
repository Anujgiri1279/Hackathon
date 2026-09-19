# Waste2Worth

Waste2Worth is a sustainability platform for analysing waste, finding reuse
services, browsing marketplace listings, and generating upcycling ideas.

## Features

- Image-based waste analysis through the backend AI provider chain.
- Text/material upcycling ideas from Gemini, Groq, OpenAI-compatible, OpenRouter,
  or Claude providers when configured.
- Upcycle image scanning that identifies multiple objects and suggests
  individual and combined projects.
- Google, YouTube, and Pinterest search links for generated ideas.
- Marketplace, services, dashboard, profile, authentication, and admin pages.
- Supabase persistence and storage integration.
- Offline static demonstration under `offline-demo/`.

## Run locally

Requirements: Node.js 18+ and npm 9+.

For a complete beginner-friendly walkthrough, read
[`SETUP-GUIDE.md`](SETUP-GUIDE.md).

On Windows, double-click `setup-waste2worth.bat` for guided first-time setup.

1. Install backend dependencies:

   ```powershell
   cd Backend
   npm install
   Copy-Item .env.example .env
   ```

2. Open `Backend/.env` and add the server-only Supabase and AI credentials.
   Never commit that file or expose `SUPABASE_SERVICE_ROLE_KEY` in frontend
   code.

3. Start the backend:

   ```powershell
   npm start
   ```

4. In another terminal, install and start the frontend:

   ```powershell
   cd frontend
   npm install
   npm start
   ```

5. Open <http://localhost:3000/index.html>.

The Windows shortcut `start-preview.bat` performs the same setup and starts
both services. It creates a local `.env` from `.env.example` if one is absent;
that generated file remains ignored by Git.

## Supabase setup

Run `Backend/schema.sql` in the Supabase SQL editor. Create the public
`waste-images` storage bucket and configure the values in `Backend/.env`.
The service-role key is server-only and must never be placed in
`frontend/public`.

## AI configuration

The lowest-cost recommended setup is one Gemini vision key plus the Groq text
model for text upcycling. The image route tries a bounded list of Gemini vision
models and then configured compatible providers. Invalid or unavailable
providers are skipped or reported as `AI_UNAVAILABLE`.

Use one controlled image request while configuring providers. Do not repeatedly
press the scan button because provider fallbacks can contact more than one
external service.

## GitHub deployment notes

This repository is intentionally free of runtime `.env` files and
`node_modules`. Configure secrets in the deployment platform instead of
committing them. Set `FRONTEND_URL` to the deployed frontend origin and update
`frontend/public/js/config.js` so `W2W_API_URL` points to the deployed backend
API. The current static frontend and Express backend can be deployed
separately.

## Project files

- `Backend/` — Express API, Supabase persistence, AI providers, schema.
- `frontend/public/` — static application pages, scripts, and styles.
- `offline-demo/` — standalone local-only demonstration.
- `report-hackemhex.html` — previous detailed test report.

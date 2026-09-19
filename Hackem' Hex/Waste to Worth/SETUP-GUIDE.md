# Waste2Worth setup guide

This guide is for someone setting up Waste2Worth on a new Windows machine.
The project can also run on macOS or Linux with the equivalent shell commands.

## 1. Install prerequisites

Install:

- Node.js 18 or newer from <https://nodejs.org/>
- npm 9 or newer (included with Node.js)
- Git from <https://git-scm.com/downloads>

After installing, open PowerShell and verify:

```powershell
node --version
npm --version
git --version
```

## 2. Get the project

If the project is already on the machine, open PowerShell in its folder. If it
is hosted on GitHub, clone it:

```powershell
git clone https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
cd YOUR-REPOSITORY
```

Do not rename `Backend` or `frontend`; the launcher and documentation expect
those folders.

## 3. Install backend dependencies

The easiest Windows setup is to double-click `setup-waste2worth.bat`. It checks
Node.js and npm, creates `Backend\.env` from the safe example, and installs
backend and frontend dependencies. You still need to edit `Backend\.env` with
your own Supabase and AI values before using live features.

For a manual setup, run:

```powershell
cd Backend
npm install
Copy-Item .env.example .env
```

Open `Backend\.env` in a text editor. Add your own values:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- At least one AI provider key for text/image features
- `FRONTEND_URL=http://localhost:3000`

The service-role key must remain in `Backend\.env` only. Never paste it into
frontend files, GitHub issues, screenshots, or chat messages.

## 4. Configure Supabase

1. Create or open a Supabase project.
2. Open the Supabase SQL Editor.
3. Run `Backend/schema.sql`.
4. Create a Storage bucket named `waste-images`.
5. Make the bucket public if image URLs are needed by the preview.
6. Copy the project URL and keys into `Backend\.env`.

The backend uses the service-role key for server-side persistence. It should
never be exposed in browser JavaScript.

## 5. Start the application

### Automatic Windows startup

Double-click `start-preview.bat`. It opens the backend and frontend in
separate command windows and opens:

<http://localhost:3000/index.html>

### Manual startup

Open two PowerShell windows.

**Window 1 — backend**

```powershell
cd Backend
npm start
```

The API should be available at <http://localhost:5000>.

**Window 2 — frontend**

```powershell
cd frontend
npm install
npm start
```

The frontend should be available at <http://localhost:3000>.

## 6. Test the important pages

Open:

- <http://localhost:3000/index.html>
- <http://localhost:3000/upcycle.html>
- <http://localhost:3000/upload.html>
- <http://localhost:3000/marketplace.html>
- <http://localhost:3000/services.html>
- <http://localhost:3000/dashboard.html>

For the upcycle page:

1. Enter an item and material.
2. Select the number of ideas.
3. Press **Generate ideas**.
4. Confirm that idea cards, instructions, and search links appear.
5. Upload one ordinary object image.
6. Confirm that the selected filename and preview appear.
7. Wait for detected items and project ideas.

Use one image request while checking provider configuration. Repeated scans
can contact multiple external AI providers and consume credits.

## 7. Troubleshooting

### The frontend cannot reach the backend

Confirm the backend is running and that `frontend/public/js/config.js` points
to:

```javascript
window.W2W_API_URL = "http://localhost:5000/api";
```

If the backend is deployed elsewhere, change this value to the deployed API
URL and rebuild/redeploy the static frontend.

### Port 5000 or 3000 is already in use

Close the process using the port, or change the backend `PORT` and frontend
start command. If the frontend port changes, update `FRONTEND_URL` and the
frontend API/CORS configuration together.

### Text ideas work but image scanning does not

Check:

1. The uploaded file is JPEG, PNG, WebP, or GIF.
2. The file is under 10 MB.
3. `GEMINI_API_KEY` is valid.
4. `GEMINI_VISION_MODEL` is available to the account.
5. A fallback vision provider is configured if Gemini is unavailable.

The API returns `AI_UNAVAILABLE` when no vision provider returns usable data.
This means the upload reached the backend, but provider configuration or
availability needs attention.

### Supabase errors appear

Recheck the project URL, service-role key, schema, Storage bucket name, and
bucket visibility. Do not solve Supabase errors by placing the service-role
key in frontend code.

## 8. Safe GitHub workflow

Before committing:

```powershell
git status
node --check Backend/server.js
node --check Backend/routes/upcycle.js
node --check Backend/gemini.js
node --check frontend/public/js/script.js
```

Confirm that `Backend\.env` does not appear in `git status`. The repository
ignores runtime `.env` files and `node_modules` automatically.

Commit only source, configuration examples, documentation, and lockfiles:

```powershell
git add .
git commit -m "Prepare Waste2Worth for GitHub"
git push
```

Never commit real API keys or Supabase service-role credentials.

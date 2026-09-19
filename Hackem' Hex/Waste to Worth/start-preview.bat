@echo off
setlocal
set "ROOT=%~dp0"
set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
set "NPM_CLI=%ProgramFiles%\nodejs\node_modules\npm\bin\npm-cli.js"

if not exist "%NODE_EXE%" (
  echo Node.js is required. Install the LTS release from https://nodejs.org/
  pause
  exit /b 1
)

if not exist "%ROOT%Backend\.env" (
  copy "%ROOT%Backend\.env.example" "%ROOT%Backend\.env" >nul
  echo Created Backend\.env from the example. Add Supabase and Gemini credentials before using AI features.
)

echo Starting Waste2Worth backend on http://localhost:5000
start "Waste2Worth Backend" cmd /k "cd /d "%ROOT%Backend" && "%NODE_EXE%" "%NPM_CLI%" install && "%NODE_EXE%" server.js"

echo Starting Waste2Worth frontend on http://localhost:3000
start "Waste2Worth Frontend" cmd /k "cd /d "%ROOT%frontend" && "%NODE_EXE%" "%NPM_CLI%" install && "%NODE_EXE%" node_modules\serve\build\main.js public -l 3000"

timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"
endlocal

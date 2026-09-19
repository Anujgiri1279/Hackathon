@echo off
setlocal
set "ROOT=%~dp0"

where powershell.exe >nul 2>&1
if errorlevel 1 (
  echo PowerShell is required and was not found.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%setup-waste2worth.ps1"
if errorlevel 1 (
  echo.
  echo Setup failed. Read the error above, fix the reported issue, and run this file again.
  pause
  exit /b 1
)

echo.
echo Setup finished. Edit Backend\.env, then run start-preview.bat.
pause

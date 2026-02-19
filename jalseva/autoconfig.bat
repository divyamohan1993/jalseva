@echo off
REM ============================================================================
REM  JalSeva - Windows Deployment Script (autoconfig.bat)
REM ============================================================================
REM  Run this from your Windows laptop to deploy JalSeva to a GCloud VM.
REM
REM  Prerequisites:
REM    - Google Cloud SDK (gcloud) installed and authenticated
REM    - Git Bash or tar available in PATH (ships with Windows 10+)
REM    - SSH access to the target VM configured via gcloud
REM
REM  Usage:
REM    autoconfig.bat
REM    autoconfig.bat --zone us-central1-a --vm my-vm --project my-project
REM ============================================================================

setlocal enabledelayedexpansion

REM ---------- Default Configuration (edit these) ----------
set "VM_ZONE=asia-south2-a"
set "VM_NAME=power-vm-spot-2h-20260219-094900"
set "GCP_PROJECT=dmjone"
set "DOMAIN=jalseva.dmj.one"

REM ---------- Parse optional CLI arguments ----------
:parse_args
if "%~1"=="" goto :args_done
if /i "%~1"=="--zone"    (set "VM_ZONE=%~2"    & shift & shift & goto :parse_args)
if /i "%~1"=="--vm"      (set "VM_NAME=%~2"     & shift & shift & goto :parse_args)
if /i "%~1"=="--project" (set "GCP_PROJECT=%~2"  & shift & shift & goto :parse_args)
if /i "%~1"=="--domain"  (set "DOMAIN=%~2"       & shift & shift & goto :parse_args)
shift
goto :parse_args
:args_done

REM ---------- Resolve project directory ----------
set "SCRIPT_DIR=%~dp0"
REM Remove trailing backslash
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "PROJECT_DIR=%SCRIPT_DIR%"

echo.
echo  ===================================================
echo   JalSeva Deployment
echo  ===================================================
echo   VM       : %VM_NAME%
echo   Zone     : %VM_ZONE%
echo   Project  : %GCP_PROJECT%
echo   Domain   : %DOMAIN%
echo   Source   : %PROJECT_DIR%
echo  ===================================================
echo.

REM ---------- Step 1: Create tarball ----------
echo [1/5] Creating deployment tarball...
set "TARBALL=%TEMP%\jalseva-deploy.tar.gz"
if exist "%TARBALL%" del "%TARBALL%"

pushd "%PROJECT_DIR%\.."
tar czf "%TARBALL%" --exclude="jalseva/node_modules" --exclude="jalseva/.next" --exclude="jalseva/.git" --exclude="jalseva/autoconfig.bat" --exclude="jalseva/autoconfig.sh" jalseva/
popd

if not exist "%TARBALL%" (
    echo ERROR: Failed to create tarball.
    exit /b 1
)
for %%A in ("%TARBALL%") do echo       Tarball created: %%~zA bytes
echo.

REM ---------- Step 2: Transfer tarball to VM ----------
echo [2/5] Transferring to VM...
gcloud compute scp "%TARBALL%" "%VM_NAME%":/tmp/jalseva-deploy.tar.gz --zone="%VM_ZONE%" --project="%GCP_PROJECT%"
if errorlevel 1 (
    echo ERROR: SCP transfer failed.
    exit /b 1
)
echo       Transfer complete.
echo.

REM ---------- Step 3: Transfer autoconfig.sh to VM ----------
echo [3/5] Transferring setup script...
gcloud compute scp "%PROJECT_DIR%\autoconfig.sh" "%VM_NAME%":/tmp/autoconfig.sh --zone="%VM_ZONE%" --project="%GCP_PROJECT%"
if errorlevel 1 (
    echo ERROR: Failed to transfer autoconfig.sh.
    exit /b 1
)
echo       Setup script transferred.
echo.

REM ---------- Step 4: Run autoconfig.sh on VM ----------
echo [4/5] Running deployment on VM (this may take a few minutes)...
gcloud compute ssh --zone "%VM_ZONE%" "%VM_NAME%" --project "%GCP_PROJECT%" --command="chmod +x /tmp/autoconfig.sh && sudo /tmp/autoconfig.sh --domain %DOMAIN% --tarball /tmp/jalseva-deploy.tar.gz"
if errorlevel 1 (
    echo ERROR: Remote deployment failed.
    exit /b 1
)
echo.

REM ---------- Step 5: Verify ----------
echo [5/5] Verifying deployment...
timeout /t 3 /noq >nul
gcloud compute ssh --zone "%VM_ZONE%" "%VM_NAME%" --project "%GCP_PROJECT%" --command="curl -s -o /dev/null -w 'HTTP %%{http_code} - %%{size_download} bytes' http://localhost:3000/ && echo ' [OK]'"
echo.
echo  ===================================================
echo   Deployment complete!
echo   Live at: https://%DOMAIN%
echo   Pitch deck: https://%DOMAIN%/pitch.html
echo  ===================================================
echo.

del "%TARBALL%" 2>nul
endlocal

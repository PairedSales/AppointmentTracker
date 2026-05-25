@echo off
echo Installing Appraisal Tracker Windows Services...

set "NSSM=C:\Users\jeffh\AppData\Local\Microsoft\WinGet\Packages\NSSM.NSSM_Microsoft.Winget.Source_8wekyb3d8bbwe\nssm-2.24-101-g897c7ad\win64\nssm.exe"
set "PROJ_DIR=c:\Users\jeffh\Coding Projects\AppraisalTracker"

echo.
echo Installing AppraisalTrackerServer...
"%NSSM%" stop AppraisalTrackerServer
"%NSSM%" remove AppraisalTrackerServer confirm
"%NSSM%" install AppraisalTrackerServer "C:\Program Files\nodejs\npm.cmd" run dev
"%NSSM%" set AppraisalTrackerServer AppDirectory "%PROJ_DIR%"

echo.
echo Installing AppraisalTrackerTunnel...
"%NSSM%" stop AppraisalTrackerTunnel
"%NSSM%" remove AppraisalTrackerTunnel confirm
"%NSSM%" install AppraisalTrackerTunnel "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run appraisal-tracker
"%NSSM%" set AppraisalTrackerTunnel AppDirectory "%PROJ_DIR%"

echo.
echo Starting Services...
"%NSSM%" start AppraisalTrackerServer
"%NSSM%" start AppraisalTrackerTunnel

echo.
echo ==============================================
echo SUCCESS! 
echo Both services are now permanently running in the background.
echo You can safely delete this script.
echo ==============================================
pause

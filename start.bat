@echo off
title HemaCalc AI Server
echo ==========================================
echo    Starting HemaCalc AI Local Server...
echo ==========================================
echo.
start http://localhost:5173
npm run dev
pause

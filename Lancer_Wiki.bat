@echo off
echo Demarrage du WikiDSI...

start cmd /k "cd backend && node server.js"
start cmd /k "cd frontend && npm run dev"

echo Le Wiki est en cours de demarrage.
echo Backend : http://localhost:3001
echo Frontend : http://localhost:5173
pause

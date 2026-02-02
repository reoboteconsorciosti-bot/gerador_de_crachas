@echo off
echo Iniciando o Gerador de Crachas...

:: 1. Iniciar Backend (Python/FastAPI)
echo Iniciando Backend na porta 8000...
start "Backend (Python)" cmd /k "cd backend && python -m uvicorn main:app --reload --port 8000"

:: 2. Iniciar Frontend (React/Vite)
echo Iniciando Frontend na porta 5173...
start "Frontend (React)" cmd /k "cd frontend && npm run dev"

:: 3. Abrir Navegador
timeout /t 5
start http://localhost:5173

echo.
echo ==================================================
echo  SISTEMA INICIADO!
echo  Backend: http://localhost:8000/docs (API)
echo  Frontend: http://localhost:5173 (App)
echo ==================================================
pause

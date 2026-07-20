#!/bin/bash
cd "$(dirname "$0")"
set -a; source .env; set +a

echo "Starting backend on :8000 and Vite dev server on :5173 ..."
echo "Open http://localhost:5173 in your browser."
echo ""

# Start backend in background
venv/bin/uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start Vite dev server (frontend)
cd frontend && npx vite --host &
FRONTEND_PID=$!

# Kill both on Ctrl-C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait

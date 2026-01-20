#!/bin/bash
# Start Vite frontend in background
bunx vite --host --port 3000 > /dev/shm/vite-frontend.log 2>&1 &
VITE_PID=$!

# Start API server in foreground (so the container doesn't exit)
bun run --hot server.ts

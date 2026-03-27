#!/bin/bash
# Restart dashboard dev server and relay cleanly
cd "$(dirname "$0")"

echo "Stopping existing servers..."
lsof -ti:3000 -ti:3001 -ti:3002 -ti:3099 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1

echo "Clearing Next.js cache..."
rm -rf .next

echo "Starting relay on port 3099..."
npx tsx server/relay.ts &
RELAY_PID=$!
sleep 2

echo "Starting dev server..."
npm run dev &
DEV_PID=$!
sleep 4

echo ""
echo "=== Dashboard Ready ==="
echo "Relay PID: $RELAY_PID (port 3099)"
echo "Dev PID:   $DEV_PID"
echo ""
lsof -i:3099 -i:3000 -i:3001 -P 2>/dev/null | grep LISTEN
echo ""
echo "Open: http://localhost:3000"
echo "To stop: kill $RELAY_PID $DEV_PID"

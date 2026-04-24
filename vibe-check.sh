#!/bin/bash
set -e
export VIBE_BASE_URL="${VIBE_BASE_URL:-http://localhost:3001}"
echo "Running vibe-check against $VIBE_BASE_URL"
npx playwright test --reporter=list

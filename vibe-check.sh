#!/bin/bash
# Retroductus vibe-check — 0 fouten = groen

set -e

VIBE_BASE_URL=${VIBE_BASE_URL:-http://localhost:3001}
export VIBE_BASE_URL

echo "🔍 Retroductus vibe-check"
echo "   Base URL: $VIBE_BASE_URL"
echo ""

cd "$(dirname "$0")"

npx playwright test --reporter=list

echo ""
echo "✅ vibe-check groen"

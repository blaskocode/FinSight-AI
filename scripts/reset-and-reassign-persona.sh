#!/bin/bash
# Reset and reassign persona for a user (triggers comprehensive metrics calculation)

USER_ID=$1

if [ -z "$USER_ID" ]; then
  echo "Usage: ./reset-and-reassign-persona.sh <user_id>"
  exit 1
fi

echo "Resetting persona for user: $USER_ID"
echo ""

# Delete existing persona
sqlite3 backend/finsight.db "DELETE FROM personas WHERE user_id = '$USER_ID';"
echo "✅ Deleted existing persona"

echo ""
echo "Now reload your profile in the frontend, and the persona will be reassigned with ALL metrics!"
echo ""
echo "After reload, run: node scripts/check-user-signals.js $USER_ID"


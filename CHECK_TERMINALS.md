# How to Find Backend Logs

## The Problem
You're not seeing logs because you're looking at the wrong terminal or the backend hasn't restarted with the new logging code.

## Solution

### Step 1: Find the Backend Terminal
The backend is running in terminal session **s003** (based on `ps aux` output).

Look for the terminal window/tab where you ran:
```bash
npm run dev
```
OR
```bash
cd backend && npm run dev
```

### Step 2: Restart the Backend
In that terminal, press `Ctrl+C` to stop it, then restart:
```bash
npm run dev
```

### Step 3: Test Again
1. Open the frontend at http://localhost:3000
2. Send a chat message: "How much did I spend on groceries last month?"
3. Watch the BACKEND terminal (not browser console)

You should see logs like:
```
=== CHAT REQUEST RECEIVED ===
User ID: user-...
Message: How much did I spend on groceries last month?
[CACHE] Skipping cache for transaction query - will query database
Calling OpenAI with 2 messages
=== queryTransactions called ===
Parameters: { userId: '...', category: '...', dateRange: {...} }
Total transactions for user: X
Transactions in date range: Y
```

## Confirmed Working
I tested with `user-1762493515018-cseak508b` and confirmed:
- ✅ 28 grocery transactions exist
- ✅ October transactions are in the database
- ✅ Backend responds successfully (tokensUsed: 1064)
- ❌ But queryTransactions isn't finding them

## Next Step
After restarting and seeing the logs, we'll be able to see exactly what date range and category GPT is using, which will help us fix why it's not finding the transactions.


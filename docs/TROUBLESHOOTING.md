# Troubleshooting Guide

## Common Issues and Solutions

### Issue: 500 Error on Recommendations Endpoint

**Symptoms:**
- Error: `Failed to load resource: the server responded with a status of 500 (Internal Server Error)`
- Recommendations don't load on dashboard

**Causes:**
1. **User doesn't have a persona assigned yet** (most common)
   - Personas are assigned when the profile loads, not during data generation
   - If recommendations are requested before profile loads, this error occurs

2. **Missing OpenAI API Key** (for rationale generation)
   - The system has a fallback, but if there's an error in the rationale generation, it can cause a 500 error

**Solutions:**

1. **Ensure profile loads before recommendations:**
   - The dashboard now loads profile first, then recommendations
   - If you see this error, refresh the page to ensure profile loads first

2. **Check backend logs:**
   - Look at the terminal where the backend is running
   - The error message will tell you what went wrong

3. **Set up OpenAI API Key (optional but recommended):**
   - Create a `.env` file in the `backend/` directory
   - Add: `OPENAI_API_KEY=your-api-key-here`
   - The system will work without it (uses fallback rationales), but AI-generated rationales are better

### Issue: No Persona Assigned

**Symptoms:**
- Dashboard shows "No persona assigned"
- No recommendations appear

**Causes:**
- User's financial data doesn't match any persona criteria
- Profile hasn't been loaded yet

**Solutions:**
1. Make sure you've loaded the profile (it should happen automatically)
2. Check that the user has financial data (transactions, accounts, etc.)
3. Try a different user ID

### Issue: Missing OpenAI API Key

**Symptoms:**
- Recommendations work but have generic rationales
- Chat doesn't work (shows "AI chat is not available")

**Solutions:**
1. **For Recommendations:**
   - The system uses fallback template-based rationales
   - This is fine for testing, but AI-generated rationales are better
   - To enable AI rationales, add `OPENAI_API_KEY` to `backend/.env`

2. **For Chat:**
   - Chat requires OpenAI API key
   - Without it, chat will show an error message
   - Add `OPENAI_API_KEY` to `backend/.env` to enable chat

**How to set up OpenAI API Key:**
1. Get an API key from https://platform.openai.com/api-keys
2. Create `backend/.env` file (if it doesn't exist)
3. Add: `OPENAI_API_KEY=sk-your-key-here`
4. Restart the backend server

### Issue: Data Generation Fails

**Symptoms:**
- Error: `Cannot destructure property 'generateId' of 'helpers'`
- Data generation stops partway through

**Solutions:**
- This was a circular dependency issue that has been fixed
- If you see this, make sure you have the latest code
- Try running: `cd data-gen && node index.js` again

### Issue: Users Show "NO PERSONA"

**Symptoms:**
- When listing users, they all show "NO PERSONA"
- This is normal! Personas are assigned when profiles are loaded

**Solutions:**
- This is expected behavior
- Personas are assigned dynamically based on financial signals
- Load a user's profile in the dashboard to assign their persona

### Issue: Can't Find User IDs

**Symptoms:**
- Don't know which user IDs to test with

**Solutions:**
1. Run: `node scripts/list-users.js` to see all available users
2. Use any user ID from the list
3. The system will assign a persona when you load their profile

---

## Quick Fixes

### Backend 500 Error
1. Check backend terminal for error message
2. Most common: User doesn't have persona yet - refresh page
3. Check that database exists: `backend/finsight.db`

### Frontend Not Loading
1. Check that backend is running on port 3002
2. Check that frontend is running on port 3000
3. Check browser console for errors

### No Recommendations
1. Make sure profile loaded first (persona assigned)
2. Check that user has financial data
3. Try a different user ID

### Chat Not Working
1. Check that `OPENAI_API_KEY` is set in `backend/.env`
2. Restart backend after adding API key
3. Check backend logs for OpenAI errors

---

## Environment Variables

Create `backend/.env` with:

```env
# OpenAI API Key (optional but recommended)
OPENAI_API_KEY=sk-your-key-here

# Admin Password (optional, defaults to 'admin123')
ADMIN_PASSWORD=your-admin-password

# Database Path (optional, defaults to finsight.db)
DB_PATH=./finsight.db

# Port (optional, defaults to 3002)
PORT=3002
```

---

## Testing Without OpenAI

The system is designed to work without OpenAI:
- ✅ Persona assignment works (based on financial signals)
- ✅ Recommendations work (with template-based rationales)
- ✅ All features work except:
  - AI chat (requires OpenAI)
  - AI-generated rationales (falls back to templates)

To test fully, add the OpenAI API key, but it's not required for basic functionality.


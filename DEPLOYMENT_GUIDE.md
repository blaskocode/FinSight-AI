# FinSight AI - Production Deployment Guide

## 🚀 Deploying to Render.com

This guide covers deploying FinSight AI to Render.com with your Professional subscription.

### Prerequisites

- Render.com Professional account
- GitHub repository with your code
- OpenAI API key
- Admin password for operator access

---

## Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Add production configuration for Render"
git push origin main
```

---

## Step 2: Deploy to Render

### Option A: Using Render Blueprint (Recommended)

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will auto-detect the `render.yaml` file
5. Click **"Apply"**

### Option B: Manual Web Service Creation

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `finsight-ai`
   - **Region**: Oregon (or your preferred region)
   - **Branch**: `main`
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Standard (Render Professional)

---

## Step 3: Configure Environment Variables

In the Render dashboard, add these environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Required |
| `DATABASE_PATH` | `/opt/render/project/.data/finsight.db` | Required |
| `OPENAI_API_KEY` | `sk-...` | Your OpenAI API key (secret) |
| `ADMIN_PASSWORD` | `your_secure_password` | For admin access (secret) |
| `FRONTEND_URL` | `https://your-app.onrender.com` | Optional, for CORS |

**Important**: Mark `OPENAI_API_KEY` and `ADMIN_PASSWORD` as **secret** (toggle the eye icon).

---

## Step 4: Add Persistent Disk (If Not Using Blueprint)

1. In your service settings, go to **"Disks"**
2. Click **"Add Disk"**
3. Configure:
   - **Name**: `finsight-data`
   - **Mount Path**: `/opt/render/project/.data`
   - **Size**: 1 GB
4. Click **"Create Disk"**

**Note**: Blueprint (`render.yaml`) automatically creates this disk.

---

## Step 5: Deploy!

1. Click **"Manual Deploy"** → **"Deploy latest commit"** (or it will auto-deploy)
2. Watch the build logs
3. First deployment takes ~5-10 minutes
4. Once deployed, you'll see: **"Your service is live 🎉"**

---

## Step 6: Initialize Database

After first deployment, you need to create the database schema and seed data.

### Option 1: Via Render Shell (Recommended)

1. In Render dashboard, go to your service
2. Click **"Shell"** tab in the top navigation
3. Wait for shell to connect
4. Run initialization command:

```bash
cd backend
node -e "require('./db/init').initializeDatabase().then(() => console.log('Done!')).catch(console.error)"
```

5. Wait for completion message

### Option 2: Via HTTP Endpoint

Call the initialization endpoint once:

```bash
curl -X POST https://your-app.onrender.com/api/admin/initialize-db \
  -H "Content-Type: application/json"
```

**Note**: This endpoint is available on first deploy for convenience. Remove it after initialization for security.

---

## Step 7: Verify Deployment

### Check Health Endpoint

```bash
curl https://your-app.onrender.com/api/health
```

Expected response:
```json
{"status":"ok","message":"FinSight AI Backend is running"}
```

### Test Sample User Login

1. Visit `https://your-app.onrender.com`
2. Click on any sample user card
3. Verify dashboard loads
4. Test chat functionality
5. Check recommendations generate

---

## 🔒 Security Checklist

After deployment:

- [ ] Verify `OPENAI_API_KEY` and `ADMIN_PASSWORD` are marked as secret
- [ ] Test rate limiting (make 101 requests in 15 minutes - should get 429 error)
- [ ] Verify CORS is working (frontend can call backend)
- [ ] Check Helmet headers are present (view network tab in browser devtools)
- [ ] Confirm database is on persistent disk (restart service, data persists)
- [ ] Remove or secure the `/api/admin/initialize-db` endpoint after first use

---

## 📊 Monitoring

### Render Dashboard

- **Metrics**: CPU, Memory, Bandwidth usage
- **Logs**: Real-time application logs
- **Events**: Deploy history and status
- **Disk**: Storage usage monitoring

### Key Logs to Monitor

- Successful API requests: `200` status codes
- Rate limit hits: `Too many requests` messages
- Database errors: `SQLite error` messages
- OpenAI API errors: `OpenAI API` error messages

---

## 🐛 Troubleshooting

### Issue: "Database is locked"

**Cause**: SQLite database not on persistent disk
**Fix**: Ensure `DATABASE_PATH=/opt/render/project/.data/finsight.db`

### Issue: Frontend shows 404 errors

**Cause**: Static file serving not configured
**Fix**: Verify `NODE_ENV=production` is set

### Issue: CORS errors

**Cause**: CORS origin mismatch
**Fix**: Set `FRONTEND_URL` environment variable to your Render URL

### Issue: "Cannot find module"

**Cause**: Dependencies not installed
**Fix**: Verify build command includes `npm run install:all`

### Issue: Rate limit too strict

**Cause**: Default 100 requests per 15 minutes
**Fix**: Increase in `backend/src/index.ts` (line 46):

```typescript
max: 200, // Increase from 100 to 200
```

Then redeploy.

---

## 💰 Cost Estimate

**Render Professional with this configuration:**

| Service | Plan | Cost |
|---------|------|------|
| Web Service | Standard | ~$25/month |
| Persistent Disk | 1 GB SSD | ~$0.25/month |
| **Total** | | **~$25-30/month** |

**Benefits:**
- ✅ Zero cold starts
- ✅ Instant deployments
- ✅ Professional support
- ✅ Better performance
- ✅ 10GB included disk

---

## 🔄 Updating the Application

### Deploy Updates

1. Push changes to GitHub:
```bash
git add .
git commit -m "Update feature X"
git push origin main
```

2. Render auto-deploys on push (if auto-deploy enabled)
3. Or manually trigger: Click **"Manual Deploy"** in dashboard

### Database Migrations

If you make database schema changes:

1. Create migration script in `backend/db/migrations/`
2. Add migration runner to `backend/db/init.ts`
3. Run via Render Shell after deployment:

```bash
cd backend
npm run db:migrate
```

---

## 📈 Scaling Considerations

### When to Upgrade

**Upgrade to higher Render plan if:**
- Response time > 2 seconds consistently
- CPU usage > 80% consistently
- Memory usage > 80% consistently
- Database size > 1GB (add more disk)

### Migration Path

**For >10k users or high traffic:**
1. Migrate SQLite → PostgreSQL (Render PostgreSQL)
2. Add Redis for caching (Render Redis)
3. Scale to multiple instances (Render supports this)
4. Consider CDN for static assets (Cloudflare)

---

## 🆘 Support

**Render Support:**
- Professional plan includes priority support
- Support portal: https://dashboard.render.com/support
- Response time: Usually < 24 hours

**Application Issues:**
- Check application logs in Render dashboard
- Review `DEPLOYMENT_GUIDE.md` (this file)
- Check memory bank: `memory-bank/techContext.md`

---

## ✅ Post-Deployment Tasks

- [ ] Set up custom domain (optional)
- [ ] Configure SSL/TLS (Render provides free SSL)
- [ ] Set up monitoring alerts (Render notifications)
- [ ] Create backup strategy for database
- [ ] Document any custom configurations
- [ ] Share production URL with team

---

**🎉 Your app is now live in production!**

Visit: `https://your-app.onrender.com`

---

**Last Updated**: November 9, 2024


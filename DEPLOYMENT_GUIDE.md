# Deployment Guide

Complete guide to deploy the Options Strategy Builder to production using Vercel (frontend) and Render (backend).

---

## Prerequisites

- [x] GitHub account with repository
- [x] Vercel account (free tier)
- [x] Render account (free tier)
- [x] Supabase project with database tables created
- [x] UptimeRobot account (optional, for keep-alive)

---

## Part 1: Backend Deployment (Render)

### Step 1: Prepare Backend for Production

1. **Verify build script exists** in `backend/package.json`:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

2. **Test local build**:
```bash
cd backend
npm run build
node dist/index.js
```

### Step 2: Deploy to Render

1. **Go to [Render Dashboard](https://dashboard.render.com/)**

2. **Click "New +" → "Web Service"**

3. **Connect GitHub Repository**
   - Select your repository
   - Click "Connect"

4. **Configure Service**:
   - **Name**: `options-strategy-backend` (or your choice)
   - **Region**: Oregon (US West) or closest to you
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/index.js`
   - **Plan**: Free

5. **Add Environment Variables**:
   Click "Advanced" → "Add Environment Variable"

   ```
   NODE_ENV = production
   PORT = 4000
   SUPABASE_URL = https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
   ALLOWED_ORIGINS = https://your-frontend.vercel.app
   ```

   **Where to find Supabase keys:**
   - Go to [Supabase Dashboard](https://app.supabase.com/)
   - Select your project
   - Settings → API
   - Copy `URL` and `service_role` key (NOT anon key for backend)

6. **Deploy**:
   - Click "Create Web Service"
   - Wait 5-10 minutes for first deploy
   - Note your backend URL: `https://your-app.onrender.com`

7. **Verify Deployment**:
   ```bash
   curl https://your-app.onrender.com/api/health
   # Should return: {"status":"ok","time":1234567890}
   ```

### Step 3: Configure Render Health Check

Render automatically uses `/api/health` endpoint for health checks (already configured in `render.yaml`).

---

## Part 2: Frontend Deployment (Vercel)

### Step 1: Prepare Frontend for Production

1. **Update API URL** in frontend code (already done via env vars)

2. **Test local build**:
```bash
cd frontend
npm run build
npm run preview
```

### Step 2: Deploy to Vercel

#### Option A: Vercel Dashboard (Recommended)

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Click "Add New..." → "Project"**

3. **Import Git Repository**:
   - Select your GitHub repository
   - Click "Import"

4. **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

5. **Add Environment Variables**:
   Click "Environment Variables" section:

   ```
   VITE_API_BASE_URL = https://your-backend.onrender.com
   VITE_SUPABASE_URL = https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-key
   ```

   **Where to find Supabase keys:**
   - Go to [Supabase Dashboard](https://app.supabase.com/)
   - Select your project
   - Settings → API
   - Copy `URL` and `anon` key (public key for frontend)

6. **Deploy**:
   - Click "Deploy"
   - Wait 2-5 minutes
   - Note your frontend URL: `https://your-app.vercel.app`

7. **Verify Deployment**:
   - Open `https://your-app.vercel.app`
   - Check browser console for errors
   - Test login/register
   - Test API calls

#### Option B: Vercel CLI

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

### Step 3: Update Backend CORS

1. **Go back to Render Dashboard**
2. **Select your backend service**
3. **Environment → Edit**
4. **Update `ALLOWED_ORIGINS`**:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```
5. **Save Changes** (triggers redeploy)

---

## Part 3: Keep-Alive Setup (Prevent Render Spin-Down)

Render free tier spins down after 15 minutes of inactivity. Use UptimeRobot to keep it alive.

### Step 1: Sign Up for UptimeRobot

1. **Go to [UptimeRobot](https://uptimerobot.com/)**
2. **Create free account**
3. **Verify email**

### Step 2: Create Monitor

1. **Dashboard → Add New Monitor**

2. **Configure Monitor**:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Options Strategy Backend
   - **URL**: `https://your-backend.onrender.com/api/health`
   - **Monitoring Interval**: 5 minutes
   - **Monitor Timeout**: 30 seconds
   - **Alert Contacts**: Your email

3. **Click "Create Monitor"**

4. **Verify**:
   - Check that status shows "Up"
   - Your backend will now be pinged every 5 minutes
   - This keeps Render from spinning down

### Alternative: Cron-Job.org

If you prefer, use [Cron-Job.org](https://cron-job.org/) instead:
- Create account
- Add new cron job
- URL: `https://your-backend.onrender.com/api/health`
- Interval: Every 5 minutes
- Enable

---

## Part 4: Supabase Configuration

### Step 1: Verify Database Tables

Ensure these tables exist in Supabase:

```sql
-- Strategies table
CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instrument TEXT NOT NULL,
  legs JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paper positions table
CREATE TABLE paper_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  instrument TEXT NOT NULL,
  legs JSONB NOT NULL,
  entry_price NUMERIC NOT NULL,
  current_price NUMERIC,
  pnl NUMERIC,
  status TEXT DEFAULT 'open',
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own strategies"
  ON strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategies"
  ON strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies"
  ON strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies"
  ON strategies FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own positions"
  ON paper_positions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own positions"
  ON paper_positions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own positions"
  ON paper_positions FOR UPDATE
  USING (auth.uid() = user_id);
```

### Step 2: Configure Auth Settings

1. **Go to Supabase Dashboard → Authentication → URL Configuration**

2. **Add Redirect URLs**:
   ```
   https://your-app.vercel.app
   https://your-app.vercel.app/auth/callback
   http://localhost:5173
   http://localhost:5173/auth/callback
   ```

3. **Site URL**: `https://your-app.vercel.app`

---

## Part 5: Testing Production Deployment

### Test Checklist

#### Backend Tests
```bash
# Health check
curl https://your-backend.onrender.com/api/health

# Market data (should work without auth)
curl https://your-backend.onrender.com/api/market/spot?symbol=NIFTY

# Protected route (should return 401)
curl https://your-backend.onrender.com/api/portfolio/strategies
```

#### Frontend Tests

1. **Open `https://your-app.vercel.app`**
2. **Test Navigation**: All pages load
3. **Test Registration**:
   - Register new account
   - Check email for confirmation
   - Confirm email
4. **Test Login**:
   - Login with credentials
   - Verify redirect to dashboard
5. **Test Strategy Builder**:
   - Add legs
   - View payoff chart
   - Save strategy
6. **Test Portfolio**:
   - View saved strategies
   - Load strategy
   - Create paper position
7. **Test Market Data**:
   - Dashboard loads data
   - Option chain loads
   - OI/IV charts load

#### Browser Console Tests

Open DevTools Console and check:
- ✅ No CORS errors
- ✅ No 404 errors
- ✅ API calls succeed
- ✅ Supabase auth works
- ✅ No JavaScript errors

---

## Part 6: Custom Domain (Optional)

### Vercel Custom Domain

1. **Vercel Dashboard → Your Project → Settings → Domains**
2. **Add Domain**: `yourdomain.com`
3. **Add DNS Records** (at your domain registrar):
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
4. **Wait for DNS propagation** (up to 48 hours)
5. **Update Backend CORS**:
   ```
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

### Render Custom Domain

1. **Render Dashboard → Your Service → Settings → Custom Domain**
2. **Add Domain**: `api.yourdomain.com`
3. **Add DNS Record** (at your domain registrar):
   ```
   Type: CNAME
   Name: api
   Value: your-app.onrender.com
   ```
4. **Update Frontend env var**:
   ```
   VITE_API_BASE_URL=https://api.yourdomain.com
   ```

---

## Part 7: Monitoring & Maintenance

### Vercel Analytics

1. **Enable in Vercel Dashboard → Analytics**
2. **View metrics**: Page views, performance, errors

### Render Logs

1. **Render Dashboard → Your Service → Logs**
2. **View real-time logs**
3. **Check for errors**

### Supabase Logs

1. **Supabase Dashboard → Logs**
2. **View API logs**
3. **Monitor auth events**

### Error Tracking (Optional)

Consider adding Sentry:
```bash
npm install @sentry/react @sentry/vite-plugin
```

---

## Troubleshooting

### Issue: CORS Error

**Symptom**: Browser console shows CORS error
**Solution**:
1. Check `ALLOWED_ORIGINS` in Render includes your Vercel URL
2. Ensure no trailing slash in URLs
3. Redeploy backend after changing env vars

### Issue: 401 Unauthorized

**Symptom**: API calls return 401
**Solution**:
1. Check Supabase keys are correct
2. Verify user is logged in
3. Check JWT token in browser localStorage
4. Verify Supabase RLS policies

### Issue: Backend Spins Down

**Symptom**: First request takes 30+ seconds
**Solution**:
1. Verify UptimeRobot is pinging every 5 minutes
2. Check UptimeRobot monitor status is "Up"
3. Consider upgrading to Render paid plan

### Issue: Build Fails on Vercel

**Symptom**: Vercel build fails
**Solution**:
1. Check build logs in Vercel dashboard
2. Verify `npm run build` works locally
3. Check all dependencies are in `package.json`
4. Verify environment variables are set

### Issue: Build Fails on Render

**Symptom**: Render build fails
**Solution**:
1. Check build logs in Render dashboard
2. Verify TypeScript compiles: `npm run build`
3. Check `tsconfig.json` is correct
4. Verify all dependencies are in `package.json`

### Issue: Environment Variables Not Working

**Symptom**: App can't connect to backend/Supabase
**Solution**:
1. Verify env vars are set in Vercel/Render dashboard
2. Check variable names match exactly (case-sensitive)
3. Redeploy after adding env vars
4. Check browser console for actual API URL being used

---

## Environment Variables Reference

### Frontend (Vercel)

| Variable | Example | Where to Find |
|----------|---------|---------------|
| `VITE_API_BASE_URL` | `https://your-app.onrender.com` | Render dashboard URL |
| `VITE_SUPABASE_URL` | `https://abc123.supabase.co` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase → Settings → API (anon/public key) |

### Backend (Render)

| Variable | Example | Where to Find |
|----------|---------|---------------|
| `NODE_ENV` | `production` | Set manually |
| `PORT` | `4000` | Set manually |
| `SUPABASE_URL` | `https://abc123.supabase.co` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Supabase → Settings → API (service_role key) |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` | Your Vercel URL |

---

## Deployment Checklist

### Pre-Deployment
- [ ] All features tested locally
- [ ] Build succeeds locally (frontend & backend)
- [ ] Environment variables documented
- [ ] Supabase tables created
- [ ] Supabase RLS policies configured

### Backend Deployment
- [ ] Render service created
- [ ] Environment variables added
- [ ] Build succeeds
- [ ] Health endpoint responds
- [ ] API endpoints work

### Frontend Deployment
- [ ] Vercel project created
- [ ] Environment variables added
- [ ] Build succeeds
- [ ] Site loads
- [ ] API calls work

### Post-Deployment
- [ ] CORS configured correctly
- [ ] Auth works (register/login)
- [ ] All pages load
- [ ] Market data loads
- [ ] Portfolio features work
- [ ] UptimeRobot configured
- [ ] Monitoring enabled

---

## Cost Breakdown

### Free Tier Limits

**Vercel Free**:
- 100 GB bandwidth/month
- Unlimited projects
- Automatic SSL
- Custom domains

**Render Free**:
- 750 hours/month (enough for 1 service)
- Spins down after 15 min inactivity
- 512 MB RAM
- Automatic SSL

**Supabase Free**:
- 500 MB database
- 1 GB file storage
- 2 GB bandwidth
- 50,000 monthly active users

**UptimeRobot Free**:
- 50 monitors
- 5-minute intervals
- Email alerts

**Total Monthly Cost**: $0 🎉

---

## Upgrade Paths

If you need more resources:

**Render Starter ($7/month)**:
- No spin-down
- 512 MB RAM
- Better performance

**Vercel Pro ($20/month)**:
- 1 TB bandwidth
- Analytics
- Password protection

**Supabase Pro ($25/month)**:
- 8 GB database
- 100 GB bandwidth
- Daily backups

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **UptimeRobot Docs**: https://uptimerobot.com/api/

---

## Quick Deploy Commands

```bash
# Test builds locally
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..

# Deploy via CLI (optional)
cd frontend && vercel --prod
```

---

**Deployment complete! 🚀**

Your Options Strategy Builder is now live in production!

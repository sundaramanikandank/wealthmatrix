# Quick Deployment Guide

Fast-track deployment in 15 minutes.

---

## 🚀 Step 1: Backend (Render) - 5 minutes

1. **Go to**: https://dashboard.render.com/
2. **Click**: "New +" → "Web Service"
3. **Connect**: Your GitHub repo
4. **Configure**:
   ```
   Name: options-strategy-backend
   Root Directory: backend
   Build Command: npm install && npm run build
   Start Command: node dist/index.js
   ```
5. **Add Environment Variables**:
   ```
   NODE_ENV=production
   PORT=4000
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   ALLOWED_ORIGINS=https://YOUR_APP.vercel.app
   ```
6. **Click**: "Create Web Service"
7. **Copy**: Your backend URL (e.g., `https://your-app.onrender.com`)

---

## 🎨 Step 2: Frontend (Vercel) - 5 minutes

1. **Go to**: https://vercel.com/new
2. **Import**: Your GitHub repo
3. **Configure**:
   ```
   Framework: Vite
   Root Directory: frontend
   Build Command: npm run build (auto-detected)
   Output Directory: dist (auto-detected)
   ```
4. **Add Environment Variables**:
   ```
   VITE_API_BASE_URL=https://YOUR_BACKEND.onrender.com
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```
5. **Click**: "Deploy"
6. **Copy**: Your frontend URL (e.g., `https://your-app.vercel.app`)

---

## 🔄 Step 3: Update Backend CORS - 2 minutes

1. **Go back to**: Render Dashboard
2. **Select**: Your backend service
3. **Environment** → Edit `ALLOWED_ORIGINS`
4. **Update to**: `https://your-app.vercel.app` (your actual Vercel URL)
5. **Save** (triggers redeploy)

---

## ⏰ Step 4: Keep-Alive (UptimeRobot) - 3 minutes

1. **Go to**: https://uptimerobot.com/
2. **Sign up** (free)
3. **Add Monitor**:
   ```
   Type: HTTP(s)
   URL: https://YOUR_BACKEND.onrender.com/api/health
   Interval: 5 minutes
   ```
4. **Create Monitor**

---

## ✅ Step 5: Test - 2 minutes

1. **Open**: `https://your-app.vercel.app`
2. **Register**: Create account
3. **Login**: Test authentication
4. **Test**: Add strategy, view charts
5. **Check**: Browser console for errors

---

## 🎉 Done!

Your app is live at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-app.onrender.com`

---

## 📋 Checklist

- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] CORS updated with Vercel URL
- [ ] UptimeRobot monitoring enabled
- [ ] Test: Register/Login works
- [ ] Test: Market data loads
- [ ] Test: Portfolio features work

---

## 🆘 Need Help?

See full guide: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## 🔑 Where to Find Keys

**Supabase Dashboard** → Settings → API:
- `URL`: Your project URL
- `anon key`: For frontend (public)
- `service_role key`: For backend (secret)

**Vercel URL**: After deployment, shown in dashboard

**Render URL**: After deployment, shown in dashboard

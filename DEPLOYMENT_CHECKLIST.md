# Deployment Checklist

Use this checklist to ensure smooth deployment.

---

## Pre-Deployment

### Code Preparation
- [ ] All features tested locally
- [ ] Frontend build succeeds: `cd frontend && npm run build`
- [ ] Backend build succeeds: `cd backend && npm run build`
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] All environment variables documented

### Supabase Setup
- [ ] Supabase project created
- [ ] Database tables created (strategies, paper_positions)
- [ ] RLS policies configured
- [ ] Auth redirect URLs configured
- [ ] Copied `URL` from Supabase dashboard
- [ ] Copied `anon key` from Supabase dashboard
- [ ] Copied `service_role key` from Supabase dashboard

### Git Repository
- [ ] Code pushed to GitHub
- [ ] `.gitignore` includes `.env` files
- [ ] No sensitive data in repository
- [ ] README.md updated

---

## Backend Deployment (Render)

### Initial Setup
- [ ] Signed up for Render account
- [ ] Connected GitHub repository
- [ ] Created new Web Service

### Configuration
- [ ] Name: `options-strategy-backend`
- [ ] Root Directory: `backend`
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `node dist/index.js`
- [ ] Plan: Free

### Environment Variables
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `4000`
- [ ] `SUPABASE_URL` = (from Supabase dashboard)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (from Supabase dashboard)
- [ ] `ALLOWED_ORIGINS` = (will update after frontend deploy)

### Deployment
- [ ] Clicked "Create Web Service"
- [ ] Build succeeded (check logs)
- [ ] Service is running
- [ ] Copied backend URL: `https://__________.onrender.com`

### Verification
- [ ] Health check works: `curl https://YOUR_BACKEND/api/health`
- [ ] Returns: `{"status":"ok","time":...}`

---

## Frontend Deployment (Vercel)

### Initial Setup
- [ ] Signed up for Vercel account
- [ ] Connected GitHub repository
- [ ] Created new project

### Configuration
- [ ] Framework: Vite (auto-detected)
- [ ] Root Directory: `frontend`
- [ ] Build Command: `npm run build` (auto-detected)
- [ ] Output Directory: `dist` (auto-detected)

### Environment Variables
- [ ] `VITE_API_BASE_URL` = (your Render backend URL)
- [ ] `VITE_SUPABASE_URL` = (from Supabase dashboard)
- [ ] `VITE_SUPABASE_ANON_KEY` = (from Supabase dashboard)

### Deployment
- [ ] Clicked "Deploy"
- [ ] Build succeeded (check logs)
- [ ] Site is live
- [ ] Copied frontend URL: `https://__________.vercel.app`

### Verification
- [ ] Site loads without errors
- [ ] No CORS errors in console
- [ ] Can navigate between pages

---

## CORS Configuration

### Update Backend
- [ ] Go to Render dashboard
- [ ] Select backend service
- [ ] Environment → Edit `ALLOWED_ORIGINS`
- [ ] Set to: `https://YOUR_FRONTEND.vercel.app`
- [ ] Save (triggers redeploy)
- [ ] Wait for redeploy to complete

### Verify
- [ ] Open frontend in browser
- [ ] Open DevTools console
- [ ] No CORS errors
- [ ] API calls succeed

---

## Keep-Alive Setup (UptimeRobot)

### Account Setup
- [ ] Signed up for UptimeRobot (free)
- [ ] Verified email

### Monitor Configuration
- [ ] Created new monitor
- [ ] Type: HTTP(s)
- [ ] Name: Options Strategy Backend
- [ ] URL: `https://YOUR_BACKEND.onrender.com/api/health`
- [ ] Interval: 5 minutes
- [ ] Timeout: 30 seconds

### Verification
- [ ] Monitor status shows "Up"
- [ ] Received test alert email
- [ ] Backend stays awake

---

## Testing Production

### Authentication
- [ ] Register new account
- [ ] Receive confirmation email
- [ ] Confirm email
- [ ] Login with credentials
- [ ] Logout works
- [ ] Login again

### Strategy Builder
- [ ] Page loads
- [ ] Market data loads
- [ ] Can select instrument (NIFTY/BANKNIFTY)
- [ ] Can select expiry
- [ ] Can add legs
- [ ] Payoff chart renders
- [ ] Greeks display
- [ ] Can save strategy
- [ ] Save succeeds

### Portfolio
- [ ] Page loads
- [ ] Saved strategies tab shows data
- [ ] Can load strategy
- [ ] Can delete strategy
- [ ] Can create paper position
- [ ] Paper positions tab shows data
- [ ] History tab works

### Market Data
- [ ] Dashboard loads
- [ ] Table shows NIFTY & BANKNIFTY data
- [ ] Refresh button works
- [ ] Option Chain loads
- [ ] OI Charts load
- [ ] IV Charts load

### Mobile Testing
- [ ] Open DevTools (F12)
- [ ] Toggle device toolbar (Cmd+Shift+M)
- [ ] Select iPhone SE (375px)
- [ ] Hamburger menu appears
- [ ] Menu opens/closes
- [ ] All pages accessible
- [ ] No horizontal scroll
- [ ] Tables scroll horizontally
- [ ] Forms work (no zoom on iOS)

### Performance
- [ ] Page load < 3 seconds
- [ ] API calls < 2 seconds
- [ ] No memory leaks
- [ ] No console errors
- [ ] No 404 errors

---

## Post-Deployment

### Monitoring
- [ ] UptimeRobot monitoring active
- [ ] Vercel analytics enabled (optional)
- [ ] Error tracking setup (optional)

### Documentation
- [ ] Updated README with live URLs
- [ ] Documented environment variables
- [ ] Created user guide (optional)

### Backup
- [ ] Supabase automatic backups enabled
- [ ] Database export downloaded (optional)

### Security
- [ ] All API keys secure (not in git)
- [ ] CORS properly configured
- [ ] RLS policies tested
- [ ] Auth flow secure

---

## Troubleshooting

### If Backend Build Fails
- [ ] Check Render logs
- [ ] Verify `npm run build` works locally
- [ ] Check all dependencies in package.json
- [ ] Verify TypeScript compiles

### If Frontend Build Fails
- [ ] Check Vercel logs
- [ ] Verify `npm run build` works locally
- [ ] Check environment variables set
- [ ] Verify all imports correct

### If CORS Errors
- [ ] Verify `ALLOWED_ORIGINS` includes frontend URL
- [ ] No trailing slash in URLs
- [ ] Backend redeployed after env var change
- [ ] Clear browser cache

### If Auth Fails
- [ ] Verify Supabase keys correct
- [ ] Check redirect URLs in Supabase
- [ ] Verify RLS policies
- [ ] Check browser console for errors

### If Backend Spins Down
- [ ] Verify UptimeRobot monitor active
- [ ] Check monitor interval (5 minutes)
- [ ] Verify health endpoint works
- [ ] Consider paid Render plan

---

## Success Criteria

✅ **Backend**
- Health endpoint responds
- API endpoints work
- Stays awake (UptimeRobot)

✅ **Frontend**
- Site loads without errors
- All pages accessible
- API calls succeed

✅ **Authentication**
- Register works
- Login works
- Protected routes secured

✅ **Features**
- Strategy builder functional
- Portfolio features work
- Market data loads

✅ **Mobile**
- Responsive on 375px
- No horizontal scroll
- Touch-friendly

✅ **Performance**
- Fast page loads
- No console errors
- Smooth interactions

---

## Environment Variables Summary

### Frontend (Vercel)
```
VITE_API_BASE_URL=https://YOUR_BACKEND.onrender.com
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Backend (Render)
```
NODE_ENV=production
PORT=4000
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
ALLOWED_ORIGINS=https://YOUR_FRONTEND.vercel.app
```

---

## URLs to Save

- **Frontend**: https://__________.vercel.app
- **Backend**: https://__________.onrender.com
- **Supabase**: https://__________.supabase.co
- **GitHub**: https://github.com/__________/__________

---

## Next Steps After Deployment

1. **Share with users**
2. **Monitor for errors**
3. **Gather feedback**
4. **Plan improvements**
5. **Consider custom domain**
6. **Setup analytics**
7. **Add more features**

---

**Deployment Complete! 🎉**

Your Options Strategy Builder is now live in production!

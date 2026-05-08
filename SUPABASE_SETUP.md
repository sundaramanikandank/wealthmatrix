# Supabase Setup Guide

This guide will help you set up Supabase for the Options Strategy Builder application.

## Prerequisites
- A Supabase account (free tier is sufficient)
- Access to your project's `.env` files

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in the details:
   - **Name:** `options-strategy-builder` (or any name you prefer)
   - **Database Password:** Choose a strong password (save it securely)
   - **Region:** Choose the closest region to you
   - **Pricing Plan:** Free tier is sufficient
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to be provisioned

## Step 2: Run SQL Setup Script

1. In your Supabase dashboard, navigate to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the entire contents of `supabase-setup.sql` from this project
4. Paste it into the SQL Editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)
6. Verify success: You should see "Success. No rows returned" message

### What the SQL script does:
- ✅ Creates `strategies` table for saving option strategies
- ✅ Creates `paper_positions` table for paper trading
- ✅ Adds indexes for performance
- ✅ Enables Row Level Security (RLS)
- ✅ Creates RLS policies (users can only access their own data)
- ✅ Adds trigger to auto-update `updated_at` timestamp

## Step 3: Verify Tables

1. In Supabase dashboard, go to **Table Editor** (left sidebar)
2. You should see two tables:
   - `strategies`
   - `paper_positions`
3. Click on each table to verify the columns match the schema

## Step 4: Get API Credentials

### For Frontend (.env)

1. In Supabase dashboard, go to **Settings** → **API**
2. Find the **"Project URL"** section
   - Copy the URL (e.g., `https://xxxxx.supabase.co`)
3. Find the **"Project API keys"** section
   - Copy the `anon` `public` key (starts with `eyJ...`)
4. Open `/frontend/.env` and update:
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key_here
   ```

### For Backend (.env)

1. In the same **Settings** → **API** page
2. Copy the **"Project URL"** (same as above)
3. Copy the `service_role` `secret` key (⚠️ Keep this secret!)
4. Open `/backend/.env` and update:
   ```env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_service_role_key_here
   ```

## Step 5: Enable Email Authentication (Optional)

If you want users to sign up with email:

1. Go to **Authentication** → **Providers** (left sidebar)
2. Enable **Email** provider (should be enabled by default)
3. Configure email templates if needed

For testing, you can disable email confirmation:
1. Go to **Authentication** → **Settings**
2. Scroll to **"Email Auth"**
3. Toggle off **"Enable email confirmations"** (for development only)

## Step 6: Test the Setup

### Test Database Access

Run this query in SQL Editor to verify RLS is working:
```sql
-- This should return empty (no user logged in)
SELECT * FROM strategies;
SELECT * FROM paper_positions;
```

### Test from Application

1. Restart your backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Restart your frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. The application should now be able to connect to Supabase

## Database Schema

### `strategies` Table
Stores saved option strategies for users.

| Column       | Type         | Description                           |
|--------------|--------------|---------------------------------------|
| id           | uuid         | Primary key                           |
| user_id      | uuid         | Foreign key to auth.users             |
| name         | text         | Strategy name                         |
| instrument   | text         | 'NIFTY' or 'BANKNIFTY'                |
| legs         | jsonb        | Array of leg objects                  |
| notes        | text         | Optional notes                        |
| created_at   | timestamptz  | Creation timestamp                    |
| updated_at   | timestamptz  | Last update timestamp (auto-updated)  |

### `paper_positions` Table
Stores paper trading positions.

| Column         | Type         | Description                           |
|----------------|--------------|---------------------------------------|
| id             | uuid         | Primary key                           |
| user_id        | uuid         | Foreign key to auth.users             |
| strategy_name  | text         | Name of the strategy                  |
| instrument     | text         | 'NIFTY' or 'BANKNIFTY'                |
| legs           | jsonb        | Array of leg objects                  |
| entry_premium  | numeric      | Premium at entry                      |
| entry_date     | timestamptz  | Entry timestamp                       |
| exit_premium   | numeric      | Premium at exit (nullable)            |
| exit_date      | timestamptz  | Exit timestamp (nullable)             |
| status         | text         | 'open' or 'closed'                    |
| notes          | text         | Optional notes                        |
| created_at     | timestamptz  | Creation timestamp                    |

## Security Notes

⚠️ **Important:**
- **Never commit** the `service_role` key to version control
- The `anon` key is safe to expose in frontend code (it's public)
- Row Level Security (RLS) ensures users can only access their own data
- All policies are enforced at the database level

## Troubleshooting

### "relation does not exist" error
- Make sure you ran the SQL setup script successfully
- Check that tables appear in Table Editor

### "new row violates row-level security policy" error
- Make sure user is authenticated
- Verify RLS policies are created correctly
- Check that `user_id` matches `auth.uid()`

### Can't connect to Supabase
- Verify URL and keys are correct in `.env` files
- Check that you restarted both backend and frontend after updating `.env`
- Ensure no trailing spaces in `.env` values

## Next Steps

After setup is complete:
1. ✅ Implement authentication UI (login/signup)
2. ✅ Create API routes for saving/loading strategies
3. ✅ Add paper trading functionality
4. ✅ Test with real user accounts

---

**Need help?** Check the [Supabase Documentation](https://supabase.com/docs) or open an issue.

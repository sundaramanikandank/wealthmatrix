# Supabase Quick Start

## 🚀 5-Minute Setup

### 1. Create Project
- Go to [supabase.com](https://supabase.com) → **New Project**
- Name: `options-strategy-builder`
- Choose region & create

### 2. Run SQL
- Open **SQL Editor** in Supabase dashboard
- Copy & paste entire `supabase-setup.sql` file
- Click **Run**

### 3. Get Credentials
Go to **Settings** → **API**:

**Frontend** (`/frontend/.env`):
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Backend** (`/backend/.env`):
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 4. Restart Servers
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### ✅ Done!

---

## 📋 What Was Created

### Tables
- ✅ `strategies` - Save option strategies
- ✅ `paper_positions` - Paper trading positions

### Security
- ✅ Row Level Security (RLS) enabled
- ✅ Users can only access their own data
- ✅ Policies for SELECT, INSERT, UPDATE, DELETE

### Features
- ✅ Auto-updating timestamps
- ✅ Foreign key constraints
- ✅ Performance indexes
- ✅ Data validation (CHECK constraints)

---

## 🔍 Verify Setup

Run in SQL Editor:
```sql
-- Should show 2 tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should show 8 policies (4 per table)
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

---

## 📚 Full Documentation
See `SUPABASE_SETUP.md` for detailed instructions and troubleshooting.

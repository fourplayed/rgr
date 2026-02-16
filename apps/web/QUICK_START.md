# Quick Start - Supabase Authentication

## For Developers Setting Up the Project

### 1. Install Dependencies

```bash
cd rgr
npm install
```

### 2. Configure Environment Variables

Create `.env` file in `apps/web/` directory:

```bash
cd apps/web
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://eryhwfkqbbuftepjvgwq.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get the anon key from:
- Supabase Dashboard → Project Settings → API
- Or from `rgr/new-secrets.txt` (if you have access)

### 3. Start Development Server

```bash
npm run dev:web
```

Open http://localhost:5173/login in your browser.

### 4. Create a Test User

#### Option A: Use Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard/project/eryhwfkqbbuftepjvgwq/auth/users
2. Click "Add user" → "Create new user"
3. Enter:
   - Email: `test@example.com`
   - Password: `password123`
4. Click "Create user"

#### Option B: Use SQL Editor

Go to https://supabase.com/dashboard/project/eryhwfkqbbuftepjvgwq/sql/new

Run:

```sql
-- Create test user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  is_super_admin
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "driver", "full_name": "Test User"}'::jsonb,
  false
);
```

### 5. Test the Login

1. Navigate to http://localhost:5173/login
2. Enter credentials:
   - Email: `test@example.com`
   - Password: `password123`
3. Click "Sign In"
4. You should be redirected to the dashboard

### 6. Verify Everything Works

Open browser DevTools (F12) and check Console for:

```
[Supabase] Client initialized successfully
[Auth] Checking authentication status...
[Auth] Login successful: { userId: "...", email: "...", role: "..." }
```

## Common Issues

### "Supabase client not initialized"

**Solution**: Make sure `.env` file exists in `apps/web/` with correct values.

### "Invalid login credentials"

**Solutions**:
- Verify user was created in Supabase
- Check email and password are correct
- Make sure email is confirmed (check `email_confirmed_at` in database)

### Changes to .env not working

**Solution**: Restart the dev server (Vite needs restart for env changes).

```bash
# Stop server (Ctrl+C)
npm run dev:web
```

### Can't access Supabase Dashboard

**Solution**: Ask team lead for:
- Dashboard access
- Project credentials
- Service role key (for admin operations)

## What to Test

Quick smoke test:

1. [ ] Valid login works
2. [ ] Invalid login shows error
3. [ ] Session persists after page refresh
4. [ ] Logout works and clears session
5. [ ] Protected routes redirect to login when not authenticated

See `TESTING_GUIDE.md` for comprehensive testing procedures.

## Next Steps

After getting login working:

1. Read `AUTH_SETUP.md` for architecture details
2. Review `TESTING_GUIDE.md` for complete test cases
3. Check `SUPABASE_INTEGRATION_SUMMARY.md` for full documentation

## Need Help?

- Review `AUTH_SETUP.md` for troubleshooting
- Check browser console for error messages
- Verify Supabase project status in dashboard
- Contact team lead for credentials or access issues

## Environment Files

- `.env` - Your local environment variables (DO NOT COMMIT)
- `.env.example` - Template for environment setup (safe to commit)
- `rgr/new-secrets.txt` - Original credentials file (DO NOT COMMIT)

**IMPORTANT**: Never commit `.env` or `new-secrets.txt` to git!

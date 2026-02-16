# Authentication Testing Guide

## Prerequisites

1. Supabase project is set up and running
2. `.env` file is configured with correct credentials
3. Dev server is running (`npm run dev:web`)

## Setting Up Test Users

### Method 1: Using Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/eryhwfkqbbuftepjvgwq/auth/users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. Click "Create user"
5. Optionally add user metadata:
   - `role`: `driver`, `manager`, or `superuser`
   - `full_name`: User's full name

### Method 2: Using SQL

Run this in the SQL Editor:

```sql
-- Create a test user
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
  is_super_admin,
  confirmation_token
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
  '{"role": "driver", "full_name": "Test Driver"}'::jsonb,
  false,
  ''
);
```

### Method 3: Sign Up via App

If you've implemented a signup page:
1. Navigate to `/signup`
2. Fill in registration form
3. Submit and check email for confirmation link
4. Confirm email and login

## Test Cases

### 1. Valid Login Flow

**Steps:**
1. Navigate to http://localhost:5173/login
2. Enter valid credentials:
   - Email: `test@example.com`
   - Password: `password123`
3. Click "Sign In"

**Expected Results:**
- Loading spinner appears
- User is redirected to `/dashboard`
- Session is stored in localStorage
- No error messages appear
- Console logs show: `[Auth] Login successful`

### 2. Invalid Credentials

**Steps:**
1. Navigate to http://localhost:5173/login
2. Enter invalid credentials:
   - Email: `test@example.com`
   - Password: `wrongpassword`
3. Click "Sign In"

**Expected Results:**
- Error message appears: "Invalid email or password"
- User remains on login page
- No redirect occurs
- Console logs show: `[Auth] Login error`

### 3. Empty Form Submission

**Steps:**
1. Navigate to http://localhost:5173/login
2. Leave fields empty
3. Click "Sign In"

**Expected Results:**
- Validation errors appear for both fields
- Submit button may be disabled
- No API call is made

### 4. Session Persistence

**Steps:**
1. Login successfully
2. Navigate to `/dashboard`
3. Refresh the browser (F5)

**Expected Results:**
- User remains logged in
- No redirect to login page
- User data is restored from session
- Console logs show: `[Auth] Session valid`

### 5. Logout Flow

**Steps:**
1. Login successfully
2. Navigate to dashboard
3. Click logout button

**Expected Results:**
- User is redirected to `/login`
- Session is cleared from localStorage
- Attempting to navigate to `/dashboard` redirects to login
- Console logs show: `[Auth] Logout successful`

### 6. Protected Route Access

**Steps:**
1. Ensure you're logged out
2. Navigate directly to http://localhost:5173/dashboard

**Expected Results:**
- Immediately redirected to `/login`
- No dashboard content is shown
- URL changes to `/login`

### 7. Session Expiry

**Steps:**
1. Login successfully
2. Open browser DevTools → Application → Storage → Local Storage
3. Find the Supabase auth token
4. Wait for token to expire (or manually delete it)
5. Try to navigate to protected route

**Expected Results:**
- Redirect to login page
- Session is cleared
- User must login again

### 8. Network Error Handling

**Steps:**
1. Open browser DevTools → Network tab
2. Enable "Offline" mode
3. Try to login

**Expected Results:**
- Error message appears (network-related)
- User remains on login page
- Appropriate error is logged to console

## Browser Testing

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

Check for:
- Consistent behavior across browsers
- localStorage support
- Session persistence
- Visual appearance

## Automated Testing

Run existing tests:

```bash
npm run test:web
```

## Debugging

### Enable Debug Logging

The authentication system includes console logging. Check the browser console for:

- `[Supabase] Client initialized successfully`
- `[Auth] Login successful`
- `[Auth] Session valid`
- `[Auth] Logout successful`

### Common Issues

**Login not working:**
1. Check browser console for errors
2. Verify credentials are correct
3. Check Supabase dashboard for user status
4. Verify email is confirmed
5. Check network tab for failed API calls

**Session not persisting:**
1. Check localStorage is enabled
2. Verify `persistSession: true` in config
3. Clear browser cache and try again
4. Check for browser extensions blocking storage

**Protected routes not working:**
1. Verify `isAuthenticated` state in React DevTools
2. Check auth check is completing
3. Look for redirect logs in console

## Manual E2E Test Script

Execute this complete flow:

1. [ ] Start fresh (clear localStorage, logout if needed)
2. [ ] Navigate to http://localhost:5173
3. [ ] Verify redirect to `/login`
4. [ ] Try to login with wrong password → See error
5. [ ] Login with correct credentials → Redirect to `/dashboard`
6. [ ] Refresh page → Still logged in
7. [ ] Navigate to another protected route → Access granted
8. [ ] Logout → Redirect to login
9. [ ] Try to access dashboard → Redirect to login
10. [ ] Login again → Successful

## Performance Testing

Monitor the following:
- Initial page load time
- Login request duration
- Session check duration
- Token refresh time

Use browser DevTools → Network tab to measure.

Target metrics:
- Login request: < 1000ms
- Session check: < 500ms
- Initial load: < 2000ms

## Security Testing

Verify the following:
- [ ] Passwords are not logged to console
- [ ] Tokens are not exposed in URLs
- [ ] HTTPS is used for all API calls
- [ ] XSS protection via input sanitization
- [ ] CSRF protection is in place
- [ ] Session tokens expire after logout

## Reporting Issues

When reporting auth issues, include:
1. Steps to reproduce
2. Expected vs actual behavior
3. Browser and version
4. Console error logs
5. Network request/response details
6. User role and permissions

## Next Steps After Testing

Once all tests pass:
- [ ] Document any discovered edge cases
- [ ] Create additional test users with different roles
- [ ] Set up automated integration tests
- [ ] Configure production environment variables
- [ ] Test in staging environment before production deployment

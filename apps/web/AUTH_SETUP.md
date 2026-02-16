# Supabase Authentication Setup

## Overview

This document describes the Supabase authentication integration for the RGR Fleet Manager web application.

## Architecture

### Components

1. **Supabase Client** (`@rgr/shared/services/supabase/client.ts`)
   - Singleton client instance
   - Configured with URL and anon key from environment variables
   - Shared across the application

2. **Auth Store** (`src/stores/authStore.ts`)
   - Zustand state management for authentication
   - Handles login, logout, and session checking
   - Manages user state and authentication status

3. **Login Logic** (`src/pages/login/useLoginLogic.ts`)
   - Custom hook for login form business logic
   - Input validation and sanitization
   - Error handling and user feedback

4. **Configuration** (`src/config/supabase.ts`)
   - Environment variable loading and validation
   - Client initialization logic

## Environment Variables

Create a `.env` file in `apps/web/` with the following variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**SECURITY NOTE**: Never commit the `.env` file to version control. Use `.env.example` as a template.

## Current Configuration

- **Project URL**: https://eryhwfkqbbuftepjvgwq.supabase.co
- **Region**: Asia-Pacific (ap-southeast-1)
- **Authentication Method**: Email/Password
- **Session Persistence**: Enabled (localStorage)
- **Auto Token Refresh**: Enabled

## Authentication Flow

### Login

1. User enters email and password
2. `useLoginLogic` validates and sanitizes input
3. Calls `authStore.login(email, password)`
4. Auth store calls Supabase `signInWithPassword`
5. On success, session is stored and user is redirected to dashboard
6. On failure, error message is displayed

### Session Management

1. App initializes Supabase client on startup
2. `checkAuth()` is called to restore session from localStorage
3. Session is automatically refreshed by Supabase client
4. Protected routes check `isAuthenticated` state

### Logout

1. User clicks logout button
2. Calls `authStore.logout()`
3. Supabase session is cleared
4. Local state is reset
5. User is redirected to login page

## Error Handling

The integration includes comprehensive error handling:

- **Network Errors**: Caught and displayed to user
- **Invalid Credentials**: User-friendly error messages
- **Session Expiry**: Automatic session refresh
- **Rate Limiting**: Server-side rate limiting via Supabase
- **Configuration Errors**: Displayed on app startup

## Security Features

1. **HTTPS Only**: All API calls use HTTPS
2. **Row Level Security**: Configured in Supabase (see database schema)
3. **JWT Tokens**: Secure session tokens with expiration
4. **Auto Token Refresh**: Prevents session expiry during use
5. **Input Sanitization**: XSS protection via DOMPurify
6. **Password Security**: Passwords are never sanitized or logged

## Testing

### Manual Testing

1. **Valid Login**:
   - Enter valid credentials
   - Should redirect to dashboard
   - Session should persist on page refresh

2. **Invalid Login**:
   - Enter wrong password
   - Should show error message
   - Should not redirect

3. **Session Persistence**:
   - Login successfully
   - Refresh the page
   - Should remain logged in

4. **Logout**:
   - Click logout
   - Should redirect to login
   - Session should be cleared

### Testing Checklist

- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Session persists after page refresh
- [ ] Logout clears session
- [ ] Protected routes redirect to login when not authenticated
- [ ] Error messages are user-friendly
- [ ] Loading states are shown during auth operations

## Troubleshooting

### Common Issues

1. **"Supabase client not initialized"**
   - Check that `.env` file exists
   - Verify environment variables are set correctly
   - Ensure `initializeSupabase()` is called before use

2. **"Invalid login credentials"**
   - Verify user exists in Supabase Auth
   - Check email confirmation status
   - Verify password is correct

3. **"Network Error"**
   - Check internet connection
   - Verify Supabase project URL is correct
   - Check Supabase project status

4. **Session not persisting**
   - Check browser localStorage is enabled
   - Verify `persistSession: true` in client config
   - Clear browser cache and try again

## Next Steps

1. **Email Verification**: Configure email templates in Supabase
2. **Password Reset**: Implement forgot password flow
3. **MFA**: Add multi-factor authentication for managers/superusers
4. **Social Login**: Add Google/Microsoft OAuth
5. **Audit Logging**: Track login attempts and session history

## Related Files

- `apps/web/.env` - Environment configuration (DO NOT COMMIT)
- `apps/web/.env.example` - Environment template
- `apps/web/src/config/supabase.ts` - Supabase initialization
- `apps/web/src/stores/authStore.ts` - Authentication state management
- `apps/web/src/pages/login/useLoginLogic.ts` - Login form logic
- `packages/shared/src/services/supabase/client.ts` - Supabase client singleton
- `packages/shared/src/services/supabase/auth.ts` - Auth service functions

## Support

For issues or questions:
1. Check Supabase documentation: https://supabase.com/docs
2. Review Supabase logs in dashboard
3. Check browser console for error messages
4. Contact team lead for configuration assistance

# Google OAuth Setup Guide

## Overview
This document describes how to set up Google OAuth 2.0 authentication for the Lyra Beauty application.

## Current Status
✅ **OAuth packages installed** (passport, passport-google-oauth20)  
✅ **OAuth strategy implemented** in `auth/strategies/google.js`  
✅ **OAuth routes configured** in `auth/routes/auth.js`  
✅ **Server integration completed** in both `server.js` and `server-production.js`  
✅ **Authentication middleware** working in `auth/middleware/auth.js`  
✅ **Database integration** with user creation/management  
✅ **Test endpoints** functional and verified  

## Getting Google OAuth Credentials

### 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API or People API

### 2. Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in required information:
   - App name: "Lyra Beauty"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes: `../auth/userinfo.email` and `../auth/userinfo.profile`

### 3. Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Set authorized redirect URIs:
   - Development: `http://localhost:3000/auth/google/callback`
   - Production: `https://lyrabeautyatx.com/auth/google/callback`

### 4. Configure Environment Variables
Update your `.env` file with the credentials:

```env
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
```

## OAuth Flow

### 1. User Login
- User clicks "Sign in with Google" → redirects to `/auth/google`
- Server redirects to Google OAuth consent screen
- User authorizes the application

### 2. OAuth Callback
- Google redirects back to `/auth/google/callback`
- Server exchanges authorization code for user profile
- User is created or updated in database
- User is redirected to appropriate dashboard based on role

### 3. Session Management
- User information stored in session for compatibility
- JWT token generated for API access
- Session persists until logout or expiration

## User Roles and Redirection

After successful OAuth login, users are redirected based on their role:
- **Admin**: `/admin` - Full system access
- **Partner**: `/dashboard` - Partner dashboard (future feature)
- **Customer**: `/dashboard` - Booking dashboard

## Security Features

- ✅ OAuth credentials validation before initialization
- ✅ Graceful fallback when OAuth not configured
- ✅ Secure session management
- ✅ JWT token generation for API access
- ✅ Role-based access control
- ✅ Database-backed user management

## Testing

Run the OAuth test suite:
```bash
node tests/auth-test.js
```

This verifies:
- OAuth route availability (redirects to Google)
- Profile endpoint protection (requires authentication)
- Logout functionality (clears session)
- Server accessibility

## Integration with Existing System

The OAuth system integrates seamlessly with the existing authentication:
- **Legacy login** still works for development/admin access
- **Session compatibility** maintained for existing code
- **User roles** properly assigned (customer by default)
- **Database persistence** for user data

## Production Deployment

For production deployment:
1. Update OAuth redirect URIs in Google Console
2. Set production environment variables
3. Ensure HTTPS is enabled for OAuth security
4. Test OAuth flow in production environment

## Troubleshooting

### Common Issues:
1. **OAuth not configured**: Check environment variables
2. **Redirect URI mismatch**: Verify Google Console settings
3. **Database errors**: Ensure database is initialized
4. **Permission errors**: Check user roles and permissions

### Debug Mode:
The system logs OAuth initialization and user creation for debugging.
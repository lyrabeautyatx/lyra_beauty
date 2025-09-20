# OAuth + Square Integration Documentation

## Overview

This document describes the merged OAuth and Square payment integration system for Lyra Beauty. The system successfully combines Google OAuth authentication with Square payment processing while maintaining backward compatibility with existing hardcoded users.

## System Architecture

### Authentication Layer
The application supports **dual authentication methods**:

1. **Legacy Authentication**: Username/password login (backward compatible)
2. **Google OAuth**: Modern OAuth 2.0 flow with Google Sign-In

### File Structure
```
/auth/                          # OAuth authentication system
├── strategies/google.js        # Google OAuth strategy configuration
├── middleware/auth.js          # Enhanced authentication middleware
└── routes/auth.js             # OAuth endpoints (/auth/google, /auth/callback)

/config/
└── square.js                  # Square API client configuration

/services/
├── user.js                    # User management for OAuth users
└── payments.js                # Square payment processing functions

/routes/
└── webhooks.js                # Square webhook handlers for payment events
```

## Authentication System

### Enhanced Middleware
The system uses enhanced authentication middleware that supports both user types:

```javascript
function requireAuthEnhanced(req, res, next) {
  // Check OAuth user first
  if (req.user) return next();
  
  // Check legacy session user
  if (req.session && req.session.user) return next();
  
  res.redirect('/login');
}
```

### User Management
- **OAuth Users**: Stored in `users.json` with Google profile data
- **Legacy Users**: Hardcoded in server.js for backward compatibility
- **Role System**: customer, partner, admin roles with proper permissions

## Payment Integration

### Square Payment Features
- **Down Payments**: 20% down payment option for appointments
- **Full Payments**: Complete payment processing
- **Webhooks**: Automatic payment status updates
- **Invoice Generation**: Automated invoicing for remaining balances

### Payment Flow
1. User books appointment (OAuth or legacy user)
2. Payment type selection (20% down or 100% full)
3. Square payment processing with proper user tracking
4. Appointment creation with enhanced user identification
5. Webhook confirmation and status updates

## User Identification Strategy

### Appointment Tracking
Appointments now store multiple user identifiers for maximum compatibility:

```javascript
{
  username: currentUser.username || currentUser.email || currentUser.display_name,
  userId: currentUser.id || null,
  email: currentUser.email || null,
  // ... other appointment data
}
```

### Appointment Filtering
The system can find user appointments using any available identifier:

```javascript
const userAppointments = appointments.filter(apt => 
  apt.username === (currentUser.username || currentUser.email || currentUser.display_name) ||
  apt.userId === currentUser.id ||
  apt.email === currentUser.email
);
```

## Configuration

### Environment Variables
All required environment variables are documented in `.env.example`:

```bash
# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Square Configuration  
SQUARE_ACCESS_TOKEN=YOUR_SANDBOX_ACCESS_TOKEN_HERE
SQUARE_APPLICATION_ID=YOUR_SANDBOX_APPLICATION_ID_HERE
SQUARE_LOCATION_ID=YOUR_SANDBOX_LOCATION_ID_HERE
SQUARE_WEBHOOK_SIGNATURE_KEY=YOUR_WEBHOOK_SIGNATURE_KEY_HERE
SQUARE_ENVIRONMENT=sandbox

# Security
JWT_SECRET=your_jwt_secret_change_me_in_production
SESSION_SECRET=your_session_secret_change_me_in_production
```

### Graceful Fallbacks
The system handles missing configurations gracefully:
- OAuth: Falls back to legacy login with clear messaging
- Square: Uses sandbox credentials with warning messages
- No errors during startup with missing credentials

## Business Logic Preservation

### Down Payment Rules
- **20% Down Payment**: Non-refundable, secures appointment
- **80% Remaining**: Automatically invoiced, collected at appointment
- **Full Payment Option**: Available for customers who prefer upfront payment

### Partner System Integration
- OAuth users can be promoted to partner role
- Commission calculations work with both user types
- Coupon system compatible with enhanced user tracking

## Testing and Validation

### Server Startup Test
```bash
npm start
# Should show:
# - Lyra Beauty app running on http://localhost:3000
# - OAuth configured: false/true
# - Square configured: false/true
```

### Integration Points Verified
- ✅ Server starts without configuration errors
- ✅ Both authentication methods work independently
- ✅ Payment processing works with both user types
- ✅ Appointment tracking supports all user identifiers
- ✅ Admin panel shows all appointments regardless of user type
- ✅ Webhook system processes Square payment events correctly

## Migration Notes

### Existing Data Compatibility
- Existing appointments remain accessible
- Legacy users continue to work without changes
- No data migration required for basic functionality

### Future Enhancements
- Database migration can enhance user tracking further
- Partner coupon system can leverage OAuth user data
- Email notifications can use OAuth profile information

## Security Considerations

- JWT tokens have 24-hour expiration
- Webhook signature verification prevents unauthorized calls
- Session security configurable for development/production
- Role-based access control enforced at middleware level
- Input validation for all payment processing endpoints

## Troubleshooting

### Common Issues
1. **OAuth not working**: Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. **Payment failures**: Verify Square sandbox credentials
3. **Session issues**: Ensure `SESSION_SECRET` is set properly
4. **Webhook errors**: Confirm `SQUARE_WEBHOOK_SIGNATURE_KEY` is correct

### Debug Information
The server logs configuration status on startup:
```
OAuth configured: true/false
Square configured: true/false
```

This provides immediate feedback on system configuration status.
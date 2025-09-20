# Role-Based Access Control Middleware

## Overview
This document describes the enhanced role-based access control middleware system for the Lyra Beauty application.

## Middleware Functions

### Core Authentication
- `requireAuth` - Ensures user is authenticated via JWT token or session
- `requireAdmin` - Requires admin role for access
- `requireRole(role)` - Requires specific role for access

### Enhanced Role-Based Access
- `requireCustomer` - Allows customers and admins only
- `requirePartner` - Allows partners and admins only  
- `requireAnyRole(roles)` - Allows any of the specified roles or admin
- `blockPartnerBooking` - Blocks partners from booking appointments (business rule)

### Permission-Based Access
- `checkPermission(permission)` - Checks specific permission from user's action array

## User Roles

### Customer
- **Capabilities**: Book appointments, pay for services, use coupons (once per lifetime)
- **Restrictions**: Cannot access partner dashboard or admin functions
- **Permissions**: `book_appointments`, `view_own_appointments`, `pay_for_services`, `use_coupons`

### Partner  
- **Capabilities**: View referral dashboard, see commission earnings, manage coupon performance
- **Restrictions**: **Cannot book appointments** (key business rule), cannot access admin functions
- **Permissions**: `view_referral_dashboard`, `see_commission_earnings`, `manage_coupon_performance`

### Admin
- **Capabilities**: Full system access including all customer and partner capabilities
- **Permissions**: All permissions plus `full_system_access`, `user_management`, `partner_approval`, `system_configuration`

## Business Rules Enforced

1. **Partners Cannot Book**: Partners are blocked from all booking-related routes
2. **Admin Super Access**: Admins can access any role-restricted resource
3. **One Coupon Per Customer**: Customers can only use one coupon in their lifetime
4. **Authentication Required**: All protected routes require valid authentication

## Usage Examples

### Protecting Routes by Role
```javascript
// Customer-only route
app.get('/book', requireAuth, requireCustomer, (req, res) => {
  // Booking logic
});

// Partner-only route  
app.get('/referrals', requireAuth, requirePartner, (req, res) => {
  // Referral dashboard
});

// Admin-only route
app.get('/admin', requireAuth, requireAdmin, (req, res) => {
  // Admin panel
});
```

### Enforcing Business Rules
```javascript
// Block partners from booking
app.get('/book', requireAuth, blockPartnerBooking, (req, res) => {
  // Only customers and admins can book
});

// Multiple role access
app.get('/dashboard', requireAuth, requireAnyRole(['customer', 'partner']), (req, res) => {
  // Both customers and partners can access
});
```

### Permission-Based Access
```javascript
// Check specific permission
app.get('/special-feature', requireAuth, checkPermission('special_access'), (req, res) => {
  // Only users with special_access permission
});
```

## Error Handling

The middleware automatically handles different response types:

- **JSON API Requests**: Returns JSON error responses with appropriate status codes
- **HTML Requests**: Redirects to login or returns HTML error pages
- **Mixed Requests**: Detects request type using `req.accepts()` and responds appropriately

## Testing

Run the test suite to verify functionality:

```bash
# Unit tests for middleware functions
node tests/role-access-test-simple.js

# Integration tests with actual routes  
node tests/role-integration-test.js
```

## Route Protection Status

### Protected Routes
- `/dashboard` - Requires authentication
- `/book` - Requires authentication + blocks partners
- `/payment` - Requires authentication + blocks partners  
- `/process-payment` - Requires authentication + blocks partners
- `/my-appointments` - Requires authentication
- `/admin` - Requires authentication + admin role

### Public Routes
- `/` - Homepage (public)
- `/login` - Login page (public)
- `/auth/*` - OAuth routes (public)

## Security Features

1. **JWT Token Validation**: Secure token-based authentication
2. **Session Fallback**: Backward compatibility with session-based auth
3. **Role Validation**: Server-side role checking with database verification
4. **Permission Granularity**: Fine-grained permission system
5. **Business Rule Enforcement**: Automatic enforcement of business logic
6. **Error Response Security**: Appropriate error messages without information leakage

## Integration Notes

- **Backward Compatible**: Works with existing authentication system
- **Database Integrated**: Uses SQLite user database for role verification  
- **OAuth Compatible**: Works with Google OAuth and legacy login
- **Production Ready**: Handles edge cases and error scenarios
- **Performance Optimized**: Minimal overhead with efficient role checking
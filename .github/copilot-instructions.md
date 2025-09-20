# Lyra Beauty - GitHub Copilot Instructions

## Project Overview
Lyra Beauty is a professional beauty services booking platform with a comprehensive partner referral system. The application handles appointment booking, payment processing, partner management, and commission tracking.

## Architecture & Tech Stack

### Backend
- **Framework**: Node.js with Express
- **Database**: SQLite with planned AWS S3 backup
- **Authentication**: Google OAuth 2.0 (replacing hardcoded users)
- **Payments**: Square API integration
- **Email**: Nodemailer with template system
- **Session Management**: JWT tokens

### Frontend
- **Template Engine**: EJS
- **Styling**: CSS with responsive design
- **JavaScript**: Vanilla JS with modern ES6+ features
- **Payment UI**: Square Web Payments SDK

### Infrastructure
- **Hosting**: AWS EC2 (t2.micro)
- **Domain**: lyrabeautyatx.com with SSL (Let's Encrypt)
- **Reverse Proxy**: Nginx
- **Process Manager**: PM2
- **Backup**: AWS S3 automated daily backups

## Business Model & Rules

### Service Pricing
- Microblading: $350
- Microshading: $300
- Lip Glow: $200
- Brow Mapping: $150

### Payment System
- **Down Payment**: 20% of final price (after discount) - NON-REFUNDABLE
- **Remaining Payment**: 80% collected at appointment via Square invoices
- **Refund Policy**: If full payment made, refund 80% and keep 20% fee

### Partner/Referral System
- **Customer Discount**: 10% off service price
- **Partner Commission**: 20% of ORIGINAL service price (before discount)
- **Usage Limit**: Each customer can only use ONE coupon EVER
- **Coupon Format**: [animal][discount] based on partner's first name (e.g., "penguin10off")

### Example Transaction
Service: $300 Microblading
- Customer applies "penguin10off" coupon
- Customer pays: $270 (10% discount)
- Partner earns: $60 (20% of original $300)
- Business receives: $270 - $60 = $210

## Database Schema

### Key Tables
- **users**: id, email, google_id, first_name, last_name, role (customer/partner/admin), has_used_coupon
- **services**: id, name, price, duration_minutes, active
- **appointments**: id, customer_id, service_id, coupon_id, final_price, down_payment_amount, status
- **payments**: id, appointment_id, square_payment_id, amount, type (down_payment/remaining/refund), status
- **coupons**: id, partner_id, code, discount_percentage, active
- **coupon_usage**: id, coupon_id, customer_id, appointment_id (UNIQUE constraint on coupon_id, customer_id)
- **partner_commissions**: id, partner_id, appointment_id, commission_amount, status (pending/paid)

## User Roles & Permissions

### Customer
- Book appointments (with authentication)
- Use ONE coupon maximum (lifetime limit)
- Pay down payments and remaining balances
- View appointment history

### Partner
- CANNOT book appointments
- View referral dashboard and earnings
- Track coupon performance
- Apply for partnership (if currently customer)

### Admin
- Manage all users and appointments
- Approve/reject partner applications
- Process commission payments
- Generate reports and analytics

## Development Phases & Dependencies

### Phase 1: Foundation (CRITICAL - Complete First)
1. Database Migration: SQLite Setup & Schema Creation (#2)
2. Google OAuth Authentication Implementation (#4)
3. Square Payment Integration Setup (#3)

### Phase 2: Core Systems
4. User Management System with Role-Based Access (#5)
5. Service Management & Pricing System (#6)
6. Email Notification System (#13)

### Phase 3: Business Logic
7. Appointment Booking System Enhancement (#7)
8. Down Payment & Payment Processing System (#8)
9. Invoice Generation for Remaining Payments (#14)

### Phase 4: Partner System
10. Partner Application & Approval Workflow (#9)
11. Coupon System with Usage Tracking (#10)
12. Commission Calculation & Tracking System (#11)

## Code Style & Conventions

### File Structure
```
/controllers/     # Business logic controllers
/models/         # Database models and queries
/services/       # Reusable business services
/middleware/     # Authentication, validation, etc.
/routes/         # Express route definitions
/views/          # EJS templates
/public/         # Static assets (CSS, JS, images)
/database/       # Database setup, migrations, backup
/config/         # Configuration files
```

### Naming Conventions
- **Files**: camelCase (userController.js, appointmentService.js)
- **Functions**: camelCase (createAppointment, validateCoupon)
- **Database Tables**: snake_case (partner_commissions, coupon_usage)
- **CSS Classes**: kebab-case (booking-form, price-summary)

### Error Handling
- Always use try-catch blocks for async operations
- Return consistent error response format: `{ error: "message" }`
- Log errors with context for debugging
- Graceful fallbacks for non-critical failures

### Security Requirements
- Validate ALL user inputs
- Sanitize data before database operations
- Implement rate limiting on payment endpoints
- Use parameterized queries to prevent SQL injection
- Verify webhook signatures from Square
- Implement CSRF protection
- Audit log for admin actions

## Integration Guidelines

### Square API
- Use sandbox environment for development
- Implement idempotency keys for payments
- Handle webhook retries gracefully
- Store Square IDs for all transactions
- Implement proper error handling for failed payments

### Google OAuth
- Store minimal user data (id, email, name)
- Handle OAuth errors gracefully
- Implement proper token refresh
- Respect user privacy and GDPR compliance

### AWS S3 Backup
- Daily automated backups at 2 AM EST
- Encrypt backups before upload
- Implement backup verification
- 30-day retention policy with lifecycle management

## Testing Requirements
- Unit tests for all business logic
- Integration tests for payment flows
- Database transaction testing
- Error scenario testing
- Performance testing for critical paths

## Performance Considerations
- Index database queries appropriately
- Implement caching for frequently accessed data
- Optimize payment processing flows
- Use connection pooling for database
- Minimize API calls to external services

## Deployment Notes
- Application runs on port 3000
- PM2 ecosystem configuration in ecosystem.config.js
- Nginx reverse proxy configuration
- SSL certificate auto-renewal with certbot
- Environment variables stored in .env (not in repository)

## Current Migration Status
- Migrating from JSON file storage (appointments.json) to SQLite
- Replacing hardcoded users with Google OAuth
- Integrating existing Square payment code with new webhook system
- Preserving existing appointment data during migration

## Important Business Constraints
- Each customer account can only use ONE coupon in their lifetime
- Partners cannot book appointments (business rule)
- Down payments are 100% non-refundable
- Commission calculated on original price, not discounted price
- Admin approval required for all partner applications
- All financial transactions must be auditable

## Common Pitfalls to Avoid
- Do NOT allow customers to use multiple coupons
- Do NOT calculate commission on discounted price
- Do NOT allow partners to book appointments
- Do NOT skip webhook signature verification
- Do NOT forget to flag customer accounts after coupon usage
- Do NOT allow negative pricing or zero-cost services

When implementing features, always consider the business rules, user roles, and security requirements. Follow the phase-based approach and respect the dependencies between issues.
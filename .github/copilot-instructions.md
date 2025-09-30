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

## How to Run & Test

### Development Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials (Google OAuth, Square, etc.)

# Initialize database
npm run migrate

# Start development server
npm start
# Or with auto-reload:
npm run dev
```

### Testing Commands
```bash
# Run all tests (currently placeholder - tests are run individually)
npm test

# Database tests
node tests/database-test.js

# Authentication tests
node tests/auth-test.js
node tests/oauth-integration-test.js
node tests/jwt-test.js

# Payment & Square integration tests
node tests/square-connection-test.js
node tests/square-integration-test.js
node tests/payment-status-test.js
node tests/webhook-test.js

# User & role tests
node tests/user-registration-test.js
node tests/role-access-test-simple.js

# Coupon system tests
node tests/coupon-test.js
node tests/integration-coupon-test.js

# Comprehensive tests
node tests/integration-test.js
```

### Database Commands
```bash
# Run database migration (sets up schema and migrates data)
npm run migrate

# View database schema
npm run schema

# Validate database integrity
npm run validate
```

### Production Commands
```bash
# Start production server
npm run start:production

# Using PM2 (on server)
pm2 start ecosystem.config.js
pm2 logs lyra-beauty
pm2 restart lyra-beauty
```

## Development Workflow

### Local Development Setup
1. Clone repository and install dependencies
2. Configure `.env` file with all required credentials:
   - Google OAuth credentials
   - Square sandbox credentials
   - JWT and session secrets
   - Database path
3. Run database migration: `npm run migrate`
4. Start development server: `npm start` or `npm run dev`
5. Access application at `http://localhost:3000`

### Making Changes
1. Create feature branch: `git checkout -b issue-XX-description`
2. Make changes following code style conventions
3. Test changes thoroughly with relevant test files
4. Ensure database changes are properly migrated
5. Commit with descriptive messages referencing issue number
6. Push and create PR with Copilot as reviewer

### Testing Your Changes
- Always test authentication flows if touching auth code
- Test payment flows in Square sandbox environment
- Verify database changes with validation script
- Test role-based access control for permission changes
- Check webhook handling for payment-related changes

## File Navigation Guide

### Key Entry Points
- `server.js` - Main application entry point
- `server-production.js` - Production server with PM2 configuration
- `database.js` - Database class and connection handling
- `ecosystem.config.js` - PM2 process manager configuration

### Directory Structure
- `/auth/` - Authentication strategies (Google OAuth, JWT)
- `/controllers/` - Business logic for routes (appointments, payments, users)
- `/routes/` - Express route definitions
- `/services/` - Reusable business services (coupon, commission, payment)
- `/middleware/` - Authentication, authorization, validation middleware
- `/views/` - EJS templates for frontend
- `/public/` - Static assets (CSS, JS, images)
- `/database/` - Database scripts (migration, schema, validation)
- `/tests/` - Test files for all components
- `/scripts/` - Utility scripts (environment verification, Square testing)

### Important Files by Feature
**Authentication:**
- `auth/googleStrategy.js` - Google OAuth configuration
- `auth/jwtStrategy.js` - JWT token handling
- `controllers/authController.js` - Login/logout logic
- `middleware/authMiddleware.js` - Route protection

**Payments:**
- `controllers/paymentController.js` - Payment processing
- `controllers/webhookController.js` - Square webhook handling
- `services/paymentService.js` - Payment business logic

**Appointments:**
- `controllers/appointmentController.js` - Booking logic
- `routes/appointments.js` - Appointment routes

**Partner System:**
- `services/couponService.js` - Coupon validation and usage
- `services/commissionService.js` - Commission calculations
- `controllers/partnerController.js` - Partner dashboard

**Database:**
- `database.js` - Main database class
- `database/migrate.js` - Migration script
- `database/schema.sql` - Database schema definition

## Common Tasks & Solutions

### Adding a New Route
1. Create route file in `/routes/` following existing patterns
2. Create corresponding controller in `/controllers/`
3. Add authentication middleware if needed
4. Import and use route in `server.js`
5. Add tests in `/tests/`

### Database Changes
1. Update schema in `database.js` `initializeTables()` method
2. Add migration logic in `database/migrate.js` if needed
3. Run `npm run migrate` to apply changes
4. Run `npm run validate` to verify integrity
5. Update any affected queries in controllers/services

### Adding New Service Logic
1. Create service file in `/services/`
2. Follow existing service patterns (export functions or class)
3. Use parameterized queries for database operations
4. Add comprehensive error handling
5. Create corresponding test file in `/tests/`

### Payment Integration Changes
1. Test in Square sandbox first (use sandbox credentials)
2. Verify webhook signature validation
3. Test idempotency with duplicate requests
4. Handle all error scenarios gracefully
5. Update webhook tests to cover new scenarios

### Environment Variables
Always add new environment variables to:
1. `.env.example` (with placeholder values)
2. Local `.env` file (with real values)
3. GitHub Secrets (for CI/CD)
4. Production server environment (via deployment script)

When implementing features, always consider the business rules, user roles, and security requirements. Follow the phase-based approach and respect the dependencies between issues.
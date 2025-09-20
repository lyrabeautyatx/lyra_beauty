# Database Migration and Setup

This directory contains the database infrastructure for Lyra Beauty.

## Files

- **`schema.js`** - Creates the database schema (tables, indexes, constraints)
- **`migrate.js`** - Migrates existing appointments.json data to SQLite database
- **`validate.js`** - Validates migrated data and tests application integration
- **`index.js`** - Main database module exports

## Database Schema

The database includes the following tables:

### Core Tables
- **`users`** - User accounts with role-based access (customer/partner/admin)
- **`services`** - Service offerings with pricing and duration
- **`appointments`** - Appointment bookings with payment tracking

### Partner System Tables
- **`coupons`** - Partner referral coupons with discount percentages
- **`coupon_usage`** - Tracks customer coupon usage (one per customer lifetime)
- **`partner_commissions`** - Commission tracking for partner referrals

## Usage

### Initial Setup
```bash
npm run migrate
```

### Schema Only
```bash
npm run schema
```

### Validation
```bash
npm run validate
```

## Migration Process

The migration script:

1. ✅ Creates database schema with all tables and indexes
2. ✅ Creates default admin user (username: `admin`, password: `admin123`)
3. ✅ Populates services table with current pricing:
   - Microblading: $350.00
   - Microshading: $300.00
   - Lip Glow: $200.00
   - Brow Mapping: $150.00
4. ✅ Migrates existing appointments from `appointments.json`
5. ✅ Creates legacy users for existing appointments
6. ✅ Validates data integrity and relationships

## Service Pricing

All services are stored in the database with pricing in dollars (converted to cents for Square API):

| Service Key | Service Name | Price | Duration |
|-------------|--------------|-------|-----------|
| microblading | Microblading | $350.00 | 120 min |
| microshading | Microshading | $300.00 | 90 min |
| lipglow | Lip Glow | $200.00 | 60 min |
| browmapping | Brow Mapping | $150.00 | 45 min |

## Default Admin User

The migration creates a default admin user:
- **Username:** `admin`
- **Password:** `admin123` (⚠️ Change in production!)
- **Email:** `admin@lyrabeautyatx.com`
- **Role:** `admin`

## Data Validation

The validation script tests:
- ✅ Appointment loading logic from server.js
- ✅ Service pricing conversion for Square API
- ✅ Admin user authentication
- ✅ Data integrity and foreign key relationships
- ✅ No orphaned records

## Database Location

The SQLite database file is created as `lyra_beauty.db` in the project root and is excluded from version control via `.gitignore`.
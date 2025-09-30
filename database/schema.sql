-- Core Database Schema for Lyra Beauty
-- Users and Services Tables with Constraints and Indexes

-- Users table with role-based access
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id VARCHAR(255) UNIQUE, -- For OAuth users
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  username VARCHAR(100) UNIQUE, -- For legacy/admin users
  password VARCHAR(255), -- For legacy/admin users (empty for OAuth)
  role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'partner', 'admin')),
  partner_status VARCHAR(20) CHECK (partner_status IN ('pending', 'approved', 'rejected') OR partner_status IS NULL),
  has_used_coupon BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Services table for dynamic pricing
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  service_key VARCHAR(50) NOT NULL UNIQUE, -- For internal reference (microblading, microshading, etc.)
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_partner_status ON users(partner_status);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_services_service_key ON services(service_key);

-- Trigger to update updated_at timestamp on users table
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
  AFTER UPDATE ON users
  FOR EACH ROW
  BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Trigger to update updated_at timestamp on services table
CREATE TRIGGER IF NOT EXISTS update_services_timestamp 
  AFTER UPDATE ON services
  FOR EACH ROW
  BEGIN
    UPDATE services SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Coupons table for partner referral system
CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id INTEGER NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Coupon usage tracking table - ensures one coupon per customer lifetime
CREATE TABLE IF NOT EXISTS coupon_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  appointment_id INTEGER,
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coupon_id) REFERENCES coupons (id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE SET NULL,
  UNIQUE(coupon_id, customer_id) -- Prevents same customer from using same coupon multiple times
);

-- Partner commissions table for tracking earnings
CREATE TABLE IF NOT EXISTS partner_commissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id INTEGER NOT NULL,
  appointment_id INTEGER NOT NULL,
  original_price DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE
);

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_coupons_partner_id ON coupons(partner_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(active);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer_id ON coupon_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner_id ON partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_status ON partner_commissions(status);

-- Trigger to update updated_at timestamp on coupons table
CREATE TRIGGER IF NOT EXISTS update_coupons_timestamp 
  AFTER UPDATE ON coupons
  FOR EACH ROW
  BEGIN
    UPDATE coupons SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Trigger to update updated_at timestamp on partner_commissions table
CREATE TRIGGER IF NOT EXISTS update_partner_commissions_timestamp 
  AFTER UPDATE ON partner_commissions
  FOR EACH ROW
  BEGIN
    UPDATE partner_commissions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
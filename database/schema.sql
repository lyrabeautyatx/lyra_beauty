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

-- Partner applications table for tracking application requests
CREATE TABLE IF NOT EXISTS partner_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  business_description TEXT,
  referral_experience TEXT,
  why_partner TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by INTEGER, -- Admin user ID who reviewed
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id),
  FOREIGN KEY (reviewed_by) REFERENCES users (id)
);

-- Indexes for partner applications
CREATE INDEX IF NOT EXISTS idx_partner_applications_user_id ON partner_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON partner_applications(status);
CREATE INDEX IF NOT EXISTS idx_partner_applications_created_at ON partner_applications(created_at);

-- Trigger to update updated_at timestamp on partner applications table
CREATE TRIGGER IF NOT EXISTS update_partner_applications_timestamp 
  AFTER UPDATE ON partner_applications
  FOR EACH ROW
  BEGIN
    UPDATE partner_applications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
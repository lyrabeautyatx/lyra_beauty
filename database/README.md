# Database Module

This directory contains the SQLite database implementation for the Lyra Beauty application.

## Files

- **`index.js`** - Database connection and query helper module
- **`migrate.js`** - Migration script to set up database schema and migrate existing data
- **`backup.js`** - Backup and restore functionality for database

## Setup

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Run database migration**:
   ```bash
   npm run migrate
   ```
   
   This will:
   - Create the SQLite database file
   - Set up the schema (users, services, appointments tables)
   - Migrate existing appointments from `appointments.json`
   - Create default users (user1, admin)
   - Populate services table

3. **Configure environment variables** in `.env`:
   ```
   DATABASE_PATH=./database/lyra_beauty.db
   AWS_S3_BACKUP_BUCKET=lyra-beauty-backups
   ```

## Database Schema

### Users Table
- `id` - Primary key
- `email` - User email (unique)
- `google_id` - Google OAuth ID (unique)
- `first_name`, `last_name` - User names
- `phone` - Phone number
- `username` - Login username (unique)
- `password` - Login password
- `role` - User role (customer, partner, admin, user)
- `partner_status` - Partner application status
- `has_used_coupon` - Coupon usage flag
- `created_at`, `updated_at` - Timestamps

### Services Table
- `id` - Primary key
- `name` - Service name
- `description` - Service description
- `price` - Service price (in dollars)
- `duration_minutes` - Service duration
- `service_key` - Unique service identifier
- `active` - Service availability flag
- `created_at`, `updated_at` - Timestamps

### Appointments Table
- `id` - Primary key
- `user_id` - Foreign key to users table
- `service_id` - Foreign key to services table
- `date` - Appointment date
- `time` - Appointment time
- `status` - Appointment status (pending, confirmed, cancelled, completed)
- `payment_id` - Payment transaction ID
- `paid_amount` - Amount paid (in cents)
- `notes` - Additional notes
- `created_at`, `updated_at` - Timestamps

## Backup

### Local Backup
```bash
npm run backup
```

### Manual Database Operations
```bash
# Create backup
node database/backup.js backup

# List S3 backups (requires AWS credentials)
node database/backup.js list

# Restore from S3 backup (requires AWS credentials)
node database/backup.js restore backups/lyra_beauty_2025-09-20T12-00-00-000Z.db
```

## AWS S3 Configuration

For S3 backups to work, configure AWS credentials:

1. **Environment variables**:
   ```
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   ```

2. **AWS credentials file** (`~/.aws/credentials`):
   ```
   [default]
   aws_access_key_id = your_access_key
   aws_secret_access_key = your_secret_key
   ```

3. **IAM Role** (if running on AWS EC2)

## Database Migration from JSON

The migration script automatically:
- Backs up existing `appointments.json` 
- Creates database schema
- Migrates appointment data with proper relationships
- Handles missing services by creating placeholder entries
- Validates data integrity after migration

## Usage in Code

```javascript
const { getDatabase } = require('./database');

async function example() {
  const db = getDatabase();
  await db.connect();
  
  // Get all appointments
  const appointments = await db.all(`
    SELECT a.*, u.username, s.name as service_name 
    FROM appointments a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN services s ON a.service_id = s.id
  `);
  
  await db.close();
}
```

## Troubleshooting

- **Migration fails**: Check that `appointments.json` is valid JSON and database directory is writable
- **S3 backup fails**: Verify AWS credentials and S3 bucket permissions
- **Database locked**: Ensure no other processes are accessing the database file
- **Connection issues**: Check that SQLite is properly installed (`npm install sqlite3`)
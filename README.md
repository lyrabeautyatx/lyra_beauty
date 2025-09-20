# Lyra Beauty Web App

A Node.js/Express web application for Lyra Beauty with authentication, appointment booking, and Square payment processing.

## Features
- Express server with EJS templating
- Gold/white themed UI
- Hardcoded authentication (user/admin)
- Appointment booking system with calendar
- Square payment integration
- User dashboard and admin panel
- Static file serving for assets

## Setup Instructions

1. **Install dependencies:**
   ```powershell
   npm install
   ```

2. **Set up database:**
   ```powershell
   npm run migrate
   ```
   This will create the SQLite database and migrate any existing appointment data.

3. **Configure Square payments (optional for testing):**
   - Copy `.env.example` to `.env`
   - Sign up at [Square Developer Dashboard](https://developer.squareup.com/apps)
   - Create a new application
   - Copy your Sandbox credentials to `.env`:
     ```
     SQUARE_ACCESS_TOKEN=your_sandbox_access_token
     SQUARE_APPLICATION_ID=your_sandbox_application_id
     SQUARE_LOCATION_ID=your_sandbox_location_id
     ```
   - For testing without real Square account, the app includes demo sandbox credentials

4. **Run the server:**
   ```powershell
   node server.js
   ```

5. **Access the app:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Hardcoded Users
- User: `user1` / `pass1`
- Admin: `admin` / `adminpass`

### Beauty Services & Pricing
- **Microblading** - $350.00
- **Microshading** - $300.00
- **Lip Glow** - $200.00
- **Brow Mapping** - $150.00

## Payment Testing

For testing payments in sandbox mode, use Square's test card numbers:
- **Visa:** 4111 1111 1111 1111
- **Mastercard:** 5105 1051 0510 5100
- **CVV:** Any 3 digits
- **Expiry:** Any future date

## Folder Structure
- `server.js` - Main server file
- `views/` - EJS templates
- `public/` - Static assets (CSS, images)
- `database/` - SQLite database module and migrations
- `routes/` - (Reserved for future route files)
- `appointments.json` - Legacy appointment storage (migrated to database)
- `.env.example` - Environment variables template

## Production Deployment

1. Replace sandbox credentials with production Square credentials
2. Configure AWS S3 for database backups
3. Set up automated daily backups using `npm run backup`
4. Configure proper session store for production
5. Add SSL/HTTPS
6. Set up proper error logging
7. Configure production database path and AWS credentials

---

**Lyra Beauty © 2025**
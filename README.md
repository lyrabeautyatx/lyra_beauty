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

2. **Configure Square payments (optional for testing):**
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

3. **Run the server:**
   ```powershell
   node server.js
   ```

4. **Access the app:**
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
- `routes/` - (Reserved for future route files)
- `appointments.json` - Appointment storage
- `.env.example` - Environment variables template

## Production Deployment

This application uses GitHub Actions for automated deployment to AWS EC2.

### Quick Start
1. Configure GitHub secrets (see `DEPLOYMENT.md`)
2. Push code to main branch
3. Deployment happens automatically

### Manual Setup
Use `setup-ec2.sh` to prepare your EC2 instance with Node.js, PM2, and Nginx.

For detailed deployment instructions, see `DEPLOYMENT.md`.

---

**Lyra Beauty © 2025**
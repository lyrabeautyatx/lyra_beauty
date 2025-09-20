# Lyra Beauty - Professional Beauty Services Platform

A comprehensive Node.js/Express web application for professional beauty services with appointment booking, partner referral system, and Square payment integration.

## 🌟 Features

### 🔐 **Authentication & User Management**
- Google OAuth 2.0 authentication
- Role-based access control (Customer/Partner/Admin)
- Secure session management with JWT

### 💰 **Advanced Payment System**
- Square payment integration with webhooks
- 20% non-refundable down payments
- Automated invoice generation for remaining payments
- 80% refund system (keeping 20% fee)

### 🤝 **Partner Referral System**
- Partner application and approval workflow
- Coupon system with one-time use per customer
- 10% customer discount + 20% partner commission
- Commission tracking and dashboard

### 📅 **Appointment Management**
- Service booking with real-time availability
- Email notifications (booking, payment, reminders)
- Customer dashboard with appointment history
- Admin dashboard for comprehensive management

### 🎨 **Professional Interface**
- Gold/white themed responsive design
- EJS templating with modern UI/UX
- Mobile-friendly responsive layout
- Comprehensive admin, partner, and customer dashboards

## 🚀 Quick Start

### 📋 **Prerequisites**
- Node.js 18+ and npm 8+
- Google OAuth 2.0 application
- Square developer account
- AWS account (for production deployment)

### 🔧 **Development Setup**

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Set up database:**
   ```bash
   npm run migrate
   ```

4. **Configure Google OAuth:**
   - Create project at [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add credentials to `.env`

5. **Configure Square (for payments):**
   - Sign up at [Square Developer Dashboard](https://developer.squareup.com/apps)
   - Create application and get sandbox credentials
   - Add credentials to `.env`

6. **Start development server:**
   ```bash
   npm run dev
   ```

7. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000)

## 🏗️ **Development Workflow**

This project uses a **micro-issue development strategy** with clear dependencies to prevent merge conflicts:

- **37 micro-issues** (2-5 hours each) across 6 phases
- **Parallel development streams** for multiple developers  
- **Clear dependency chains** prevent conflicts
- **Comprehensive documentation** for each issue

📖 **Read:** [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) for detailed workflow instructions.

## 📊 **Project Structure**

### **Current Development Status:**
- **Phase 1 (Foundation)**: Database, Auth, Square setup - 8 issues
- **Phase 2 (Core Systems)**: Services, roles, email - 5 issues  
- **Phase 3 (Business Logic)**: Appointments, payments - 7 issues
- **Phase 4 (Partner System)**: Coupons, commissions - 6 issues
- **Phase 5 (Interface)**: Dashboards, UI - 6 issues
- **Phase 6 (Operations)**: Monitoring, backups - 6 issues

📖 **Read:** [COMPLETE_ISSUE_BREAKDOWN_SUMMARY.md](./COMPLETE_ISSUE_BREAKDOWN_SUMMARY.md) for full development roadmap.

## 🏢 **Business Model**

### **Service Pricing:**
- **Microblading** - $350.00
- **Microshading** - $300.00  
- **Lip Glow** - $200.00
- **Brow Mapping** - $150.00

### **Payment Structure:**
- **Down Payment**: 20% of final price (non-refundable)
- **Remaining Payment**: 80% collected at appointment
- **Refund Policy**: 80% refund available (20% fee retained)

### **Partner Referral System:**
- **Customer Benefit**: 10% discount on service
- **Partner Commission**: 20% of original price
- **Usage Limit**: One coupon per customer lifetime
- **Coupon Format**: `[animal][discount]` (e.g., "penguin10off")

## 🧪 **Testing**

### **Payment Testing (Sandbox):**
Use Square's test card numbers:
- **Visa:** 4111 1111 1111 1111
- **Mastercard:** 5105 1051 0510 5100
- **CVV:** Any 3 digits
- **Expiry:** Any future date

### **OAuth Testing:**
- Use any valid Google account for authentication
- First login creates customer account
- Admin role assignment requires database update

## 🗂️ **Folder Structure**
```
lyra_beauty/
├── server.js                 # Main application server
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variables template
├── database/                 # Database setup and migrations
├── routes/                   # Express route handlers
├── views/                    # EJS templates
├── public/                   # Static assets (CSS, JS, images)
├── services/                 # Business logic services
├── auth/                     # Authentication middleware
├── tests/                    # Test files
└── .github/                  # GitHub workflows and configs
```

## 🚀 **Production Deployment**

📖 **Comprehensive deployment guides available:**
- [AWS-DEPLOYMENT.md](./AWS-DEPLOYMENT.md) - Full AWS EC2 deployment
- [GITHUB-ACTIONS-SETUP.md](./GITHUB-ACTIONS-SETUP.md) - Automated deployment
- [MANUAL-DEPLOYMENT.md](./MANUAL-DEPLOYMENT.md) - Manual deployment steps

### **Production Checklist:**
- ✅ Replace sandbox credentials with production
- ✅ Configure AWS S3 for database backups  
- ✅ Set up SSL/HTTPS with Let's Encrypt
- ✅ Configure production environment variables
- ✅ Set up automated daily backups
- ✅ Configure error logging and monitoring
- ✅ Test all payment and email integrations

## 🤝 **Contributing**

1. Review [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)
2. Check [COMPLETE_ISSUE_BREAKDOWN_SUMMARY.md](./COMPLETE_ISSUE_BREAKDOWN_SUMMARY.md) for available issues
3. Follow the micro-issue development strategy
4. Create PRs with Copilot as reviewer

## 📄 **License**

MIT License - See package.json for details

---

**Lyra Beauty Professional Services Platform © 2025**
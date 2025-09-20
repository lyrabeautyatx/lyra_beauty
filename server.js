const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const passport = require('passport');

// Load environment variables
require('dotenv').config();

// Import OAuth and payment configurations
require('./auth/strategies/google'); // Initialize passport strategies
const authRoutes = require('./auth/routes/auth');
const { requireAuth, requireAdmin } = require('./auth/middleware/auth');
const userService = require('./services/user');
const paymentsService = require('./services/payments');
const webhookRoutes = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize user service
userService.initializeUsers();

// Hardcoded users for backward compatibility
const users = [
  { username: 'user1', password: 'pass1', role: 'user' },
  { username: 'admin', password: 'adminpass', role: 'admin' }
];

// Service pricing (in cents for Square)
const servicePricing = {
  'microblading': { name: 'Microblading', price: 35000 }, // $350.00
  'microshading': { name: 'Microshading', price: 30000 }, // $300.00
  'lipglow': { name: 'Lip Glow', price: 20000 }, // $200.00
  'browmapping': { name: 'Brow Mapping', price: 15000 }  // $150.00
};

// Appointment management
const appointmentsFile = path.join(__dirname, 'appointments.json');

function loadAppointments() {
  try {
    const data = fs.readFileSync(appointmentsFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function saveAppointments(appointments) {
  fs.writeFileSync(appointmentsFile, JSON.stringify(appointments, null, 2));
}

function generateTimeSlots(date) {
  const slots = [];
  const startHour = 9; // 9 AM
  const endHour = 17; // 5 PM
  
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  
  return slots;
}

function isSlotAvailable(date, time) {
  const appointments = loadAppointments();
  return !appointments.some(apt => apt.date === date && apt.time === time);
}

// Express middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // For Square payment webhooks
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'lyra_secret_change_in_production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Passport initialization for OAuth
app.use(passport.initialize());
app.use(passport.session());

// Enhanced authentication middleware that supports both OAuth and legacy users
function requireAuthEnhanced(req, res, next) {
  // Check OAuth user first
  if (req.user) {
    return next();
  }
  
  // Check legacy session user
  if (req.session && req.session.user) {
    return next();
  }
  
  res.redirect('/login');
}

function requireAdminEnhanced(req, res, next) {
  const user = req.user || req.session.user;
  
  if (!user) {
    return res.redirect('/login');
  }
  
  if (user.role === 'admin') {
    return next();
  }
  
  res.status(403).send('Forbidden');
}

// Helper function to get user for templates
function getTemplateUser(req) {
  return req.user || req.session.user || null;
}

// Routes
app.get('/', (req, res) => {
  res.render('index', { user: getTemplateUser(req) });
});

app.get('/login', (req, res) => {
  const isOAuthConfigured = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
  res.render('login', { 
    error: req.query.error ? 'Authentication error occurred' : null,
    isOAuthConfigured
  });
});

// Legacy login for backward compatibility
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    req.session.user = user;
    return res.redirect(user.role === 'admin' ? '/admin' : '/dashboard');
  }
  res.render('login', { 
    error: 'Invalid credentials',
    isOAuthConfigured: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  });
});

// OAuth routes
app.use('/auth', authRoutes);

app.get('/dashboard', requireAuthEnhanced, (req, res) => {
  res.render('dashboard', { user: getTemplateUser(req) });
});

app.get('/book', requireAuthEnhanced, (req, res) => {
  const selectedDate = req.query.date || moment().format('YYYY-MM-DD');
  const timeSlots = generateTimeSlots(selectedDate);
  const availableSlots = timeSlots.filter(slot => isSlotAvailable(selectedDate, slot));
  
  res.render('book', { 
    user: getTemplateUser(req), 
    selectedDate,
    availableSlots,
    servicePricing,
    moment
  });
});

app.post('/book', requireAuthEnhanced, (req, res) => {
  const { date, time, service } = req.body;
  
  if (!isSlotAvailable(date, time)) {
    return res.render('book', { 
      user: getTemplateUser(req), 
      selectedDate: date,
      availableSlots: generateTimeSlots(date).filter(slot => isSlotAvailable(date, slot)),
      servicePricing,
      moment,
      error: 'This time slot is no longer available'
    });
  }
  
  // Store booking details in session for payment
  req.session.pendingBooking = {
    date,
    time,
    service,
    serviceInfo: servicePricing[service]
  };
  
  res.redirect('/payment');
});

app.get('/payment', requireAuthEnhanced, (req, res) => {
  if (!req.session.pendingBooking) {
    return res.redirect('/book');
  }
  
  const booking = req.session.pendingBooking;
  res.render('payment', {
    user: getTemplateUser(req),
    booking,
    applicationId: process.env.SQUARE_APPLICATION_ID || 'sandbox-sq0idb-XXXXXXXXXX',
    locationId: process.env.SQUARE_LOCATION_ID || 'SANDBOX_LOCATION_ID',
    moment
  });
});

app.post('/process-payment', requireAuthEnhanced, async (req, res) => {
  if (!req.session.pendingBooking) {
    return res.status(400).json({ error: 'No pending booking found' });
  }
  
  const { sourceId, paymentType } = req.body;
  const booking = req.session.pendingBooking;
  const currentUser = getTemplateUser(req);
  
  try {
    let paymentResult;
    
    if (paymentType === 'down_payment') {
      paymentResult = await paymentsService.processDownPayment(booking, sourceId, booking.serviceInfo.price);
    } else {
      paymentResult = await paymentsService.processFullPayment(booking, sourceId, booking.serviceInfo.price);
    }
    
    if (paymentResult.success) {
      // Save the appointment with enhanced user tracking
      const appointments = loadAppointments();
      const newAppointment = {
        id: Date.now(),
        // Support both OAuth and legacy users
        username: currentUser.username || currentUser.email || currentUser.display_name,
        userId: currentUser.id || null,
        email: currentUser.email || null,
        date: booking.date,
        time: booking.time,
        service: booking.service,
        serviceInfo: booking.serviceInfo,
        paymentType: paymentType,
        paymentStatus: paymentType === 'down_payment' ? 'down_payment_completed' : 'completed',
        totalAmount: booking.serviceInfo.price,
        paidAmount: paymentResult.amount,
        remainingAmount: paymentResult.remainingAmount,
        status: 'confirmed',
        paymentData: {
          paymentId: paymentResult.paymentId,
          referenceId: paymentResult.referenceId,
          status: paymentResult.status
        },
        createdAt: new Date().toISOString()
      };
      
      // Create invoice for remaining payment if it's a down payment
      if (paymentType === 'down_payment' && paymentResult.remainingAmount > 0) {
        const invoiceResult = await paymentsService.createRemainingPaymentInvoice(
          booking, 
          paymentResult.remainingAmount, 
          paymentResult.paymentId
        );
        
        if (invoiceResult.success) {
          newAppointment.paymentData.invoiceId = invoiceResult.invoiceId;
          newAppointment.paymentData.invoiceNumber = invoiceResult.invoiceNumber;
        }
      }
      
      appointments.push(newAppointment);
      saveAppointments(appointments);
      
      // Clear pending booking
      delete req.session.pendingBooking;
      
      res.json({ success: true, appointmentId: newAppointment.id });
    } else {
      res.status(400).json({ error: paymentResult.error });
    }
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

app.get('/my-appointments', requireAuthEnhanced, (req, res) => {
  const appointments = loadAppointments();
  const currentUser = getTemplateUser(req);
  
  // Filter appointments for both OAuth and legacy users
  const userAppointments = appointments.filter(apt => 
    apt.username === (currentUser.username || currentUser.email || currentUser.display_name) ||
    apt.userId === currentUser.id ||
    apt.email === currentUser.email
  );
  
  res.render('my-appointments', { 
    user: currentUser, 
    appointments: userAppointments,
    moment
  });
});

app.get('/admin', requireAuthEnhanced, requireAdminEnhanced, (req, res) => {
  const appointments = loadAppointments();
  res.render('admin', { 
    user: getTemplateUser(req), 
    appointments,
    moment
  });
});

app.get('/logout', (req, res) => {
  if (req.user) {
    // OAuth logout
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
        }
        res.redirect('/');
      });
    });
  } else {
    // Legacy logout
    req.session.destroy(() => {
      res.redirect('/');
    });
  }
});

// Webhook routes for Square
app.use('/webhooks', webhookRoutes);

app.listen(PORT, () => {
  console.log(`Lyra Beauty app running on http://localhost:${PORT}`);
  console.log('OAuth configured:', !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET));
  console.log('Square configured:', !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_APPLICATION_ID));
});

// ...existing code...
// ...existing code...

// Place this after app, middleware, and db are initialized
// Cancel appointment route
function setupCancelAppointmentRoute(app, db, requireAuth) {
  app.post('/appointments/:id/cancel', requireAuth, async (req, res) => {
    const appointmentId = req.params.id;
    try {
      // Only allow user to cancel their own appointment
      const appointment = await db.get(`SELECT * FROM appointments a JOIN users u ON a.user_id = u.id WHERE a.id = ?`, [appointmentId]);
      if (!appointment) {
        return res.status(404).send('Appointment not found');
      }
      if (appointment.username !== req.session.user.username) {
        return res.status(403).send('Unauthorized');
      }
      if (appointment.status === 'cancelled') {
        return res.redirect('/my-appointments');
      }
      // Update status to cancelled
      await db.run(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`, [appointmentId]);
      // Optionally: add audit log, send notification, etc.
      res.redirect('/my-appointments');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      res.status(500).send('Failed to cancel appointment');
    }
  });
}
// ...existing code...
// ...existing code...

// ...existing code...
// ...existing code...

// Register cancel appointment route after all middleware/routes, just before app.listen
// (MUST be after all other app and db setup)

// Load environment variables FIRST - before any other imports
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const passport = require('./auth/strategies/google');
const { getDatabase } = require('./database');

// Import webhook and payment services
const webhookRoutes = require('./routes/webhooks');
const { 
  processDownPayment, 
  processFullPayment,
  createRemainingPaymentInvoice, 
  calculateDownPayment, 
  calculateRemainingPayment 
} = require('./services/payments');
const { PaymentStatusService, PAYMENT_STATUSES, PAYMENT_TYPES } = require('./services/paymentStatus');

// Import authentication components
const authRoutes = require('./auth/routes/auth');
const { requireAuth, requireAdmin, requireCustomer, blockPartnerBooking, handleTokenRefresh } = require('./auth/middleware/auth');

const app = express();
// Trust proxy for correct protocol detection (needed for HTTPS redirects behind Nginx/Heroku/etc)
app.enable('trust proxy');

// Force HTTPS if not already using it (applies to all environments)
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});
const PORT = process.env.PORT || 3000;

// Initialize database
const db = getDatabase();

// Database initialization
async function initializeDatabase() {
  try {
    await db.connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

// User authentication helper
async function authenticateUser(username, password) {
  try {
    const user = await db.get(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    return user;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// Service pricing helper - now loads from database
async function getServicePricing() {
  try {
    const services = await db.all('SELECT * FROM services WHERE active = 1');
    const pricing = {};
    services.forEach(service => {
      pricing[service.service_key] = {
        name: service.name,
        price: Math.round(service.price * 100) // Convert to cents for Square
      };
    });
    return pricing;
  } catch (error) {
    console.error('Error loading services:', error);
    return {};
  }
}

// Appointment management - now using database
async function loadAppointments() {
  try {
    const appointments = await db.all(`
      SELECT a.*, u.username, u.first_name, u.last_name, u.email, s.service_key, s.name as service_name, s.price as service_price
      FROM appointments a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN services s ON a.service_id = s.id
      ORDER BY a.date, a.time
    `);
    
    // Mark past appointments as completed if not already cancelled or completed
    const now = new Date();
    for (const apt of appointments) {
      const aptDateTime = new Date(`${apt.date}T${apt.time}`);
      if (apt.status !== 'cancelled' && apt.status !== 'completed' && aptDateTime < now) {
        await db.run(`UPDATE appointments SET status = 'completed' WHERE id = ?`, [apt.id]);
        apt.status = 'completed';
      }
    }
    // Transform to match legacy format for compatibility
    return appointments.map(apt => ({
      id: apt.id,
      username: apt.username,
      firstName: apt.first_name,
      lastName: apt.last_name,
      email: apt.email,
      date: apt.date,
      time: apt.time,
      service: apt.service_key,
      serviceInfo: {
        name: apt.service_name,
        price: Math.round(apt.service_price * 100) // Convert to cents
      },
      status: apt.status,
      paymentId: apt.payment_id,
      paidAmount: apt.paid_amount
    }));
  } catch (error) {
    console.error('Error loading appointments:', error);
    return [];
  }
}

async function saveAppointment(appointmentData) {
  try {
    const { username, date, time, service, serviceInfo, status, paymentId, paidAmount } = appointmentData;
    
    // Get user ID
    const user = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (!user) {
        console.error(`User not found: ${username}`);
    }
    
    // Get service ID
    const serviceRecord = await db.get('SELECT id FROM services WHERE service_key = ?', [service]);
    if (!serviceRecord) {
      throw new Error(`Service not found: ${service}`);
    }
    
    const result = await db.run(`
      INSERT INTO appointments (user_id, service_id, date, time, status, payment_id, paid_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [user.id, serviceRecord.id, date, time, status, paymentId, paidAmount]);
    
    return result.id;
  } catch (error) {
    console.error('Error saving appointment:', error);
    throw error;
  }
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

async function isSlotAvailable(date, time) {
  try {
    const appointment = await db.get(
      'SELECT id FROM appointments WHERE date = ? AND time = ? AND status != ?',
      [date, time, 'cancelled']
    );
    return !appointment;
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return false;
  }
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser()); // Add cookie parser for JWT cookies
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'lyra_secret',
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Add global token refresh middleware
app.use(handleTokenRefresh);

// OAuth routes
app.use('/auth', authRoutes);

// Webhook routes
app.use('/webhooks', webhookRoutes);

// Service management routes
const serviceRoutes = require('./routes/services');
app.use('/api/services', serviceRoutes);

// Coupon routes
const couponRoutes = require('./routes/coupons');
app.use('/api', couponRoutes);

// Legacy authentication middleware (kept for backward compatibility)
function legacyRequireAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login');
}

function legacyRequireAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') return next();
  res.status(403).send('Forbidden');
}

app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

// Public services page (no authentication required)
app.get('/services', async (req, res) => {
  try {
    const services = await db.all('SELECT id, name, price, duration_minutes, description FROM services WHERE active = 1 ORDER BY price');
    res.render('services', { 
      user: req.session.user,
      services: services
    });
  } catch (error) {
    console.error('Error loading services:', error);
    res.render('services', { 
      user: req.session.user,
      services: [],
      error: 'Unable to load services at this time.'
    });
  }
});

// Show login page (with sign up option)
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Handle sign up POST
app.post('/signup', async (req, res) => {
  const { new_username, new_password } = req.body;
  if (!new_username || !new_password) {
    return res.render('login', { error: 'Username and password required for sign up.' });
  }
  try {
    // Check if username exists
    const existing = await db.get('SELECT * FROM users WHERE username = ?', [new_username]);
    if (existing) {
      return res.render('login', { error: 'Username already taken.' });
    }
    // Insert new user (role: customer)
    const result = await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [new_username, new_password, 'customer']
    );
    // Auto-login after sign up
    const user = await db.get('SELECT * FROM users WHERE id = ?', [result.id]);
    req.session.user = {
      username: user.username,
      role: user.role,
      id: user.id,
      email: user.email || `${user.username}@legacy.local`
    };
    // Generate JWT token for session persistence
    const { generateJWT } = require('./auth/middleware/auth');
    const token = generateJWT({
      id: user.id.toString(),
      email: user.email || `${user.username}@legacy.local`,
      role: user.role
    });
    res.cookie('jwt_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('Sign up error:', err);
    return res.render('login', { error: 'Sign up failed. Please try again.' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await authenticateUser(username, password);
  if (user) {
    // Create session for backward compatibility
    req.session.user = {
      username: user.username,
      role: user.role,
      id: user.id,
      email: user.email || `${user.username}@legacy.local`
    };
    
    // Generate JWT token for session persistence
    const { generateJWT } = require('./auth/middleware/auth');
    const token = generateJWT({
      id: user.id.toString(),
      email: user.email || `${user.username}@legacy.local`,
      role: user.role
    });
    
    // Set JWT token as HTTP-only cookie
    res.cookie('jwt_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    console.log(`✓ JWT token set for legacy user: ${user.username}`);
    
    return res.redirect(user.role === 'admin' ? '/admin' : '/dashboard');
  }
  res.render('login', { error: 'Invalid credentials' });
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { user: req.session.user });
});

app.get('/book', requireAuth, blockPartnerBooking, async (req, res) => {
  const selectedDate = req.query.date || moment().format('YYYY-MM-DD');
  const preSelectedService = req.query.service || ''; // Get pre-selected service from query params
  const timeSlots = generateTimeSlots(selectedDate);
  const availableSlots = [];
  
  // Check availability for each slot
  for (const slot of timeSlots) {
    if (await isSlotAvailable(selectedDate, slot)) {
      availableSlots.push(slot);
    }
  }
  
  const servicePricing = await getServicePricing();
  
  res.render('book', { 
    user: req.session.user, 
    selectedDate,
    availableSlots,
    servicePricing,
    preSelectedService,
    moment
  });
});

app.post('/book', requireAuth, blockPartnerBooking, async (req, res) => {
  const { date, time, service } = req.body;
  
  if (!(await isSlotAvailable(date, time))) {
    const timeSlots = generateTimeSlots(date);
    const availableSlots = [];
    
    for (const slot of timeSlots) {
      if (await isSlotAvailable(date, slot)) {
        availableSlots.push(slot);
      }
    }
    
    const servicePricing = await getServicePricing();
    
    return res.render('book', { 
      user: req.session.user, 
      selectedDate: date,
      availableSlots,
      servicePricing,
      moment,
      error: 'This time slot is no longer available'
    });
  }
  
  const servicePricing = await getServicePricing();
  
  // Store booking details in session for payment
  req.session.pendingBooking = {
    date,
    time,
    service,
    serviceInfo: servicePricing[service]
  };
  
  res.redirect('/payment');
});

app.get('/payment', requireAuth, blockPartnerBooking, (req, res) => {
  if (!req.session.pendingBooking) {
    return res.redirect('/book');
  }
  
  const booking = req.session.pendingBooking;
  const totalAmount = booking.serviceInfo.price;
  const downPaymentAmount = calculateDownPayment(totalAmount);
  const remainingAmount = calculateRemainingPayment(totalAmount);
  
  res.render('payment', {
    user: req.session.user,
    booking,
    totalAmount,
    downPaymentAmount,
    remainingAmount,
    applicationId: process.env.SQUARE_APPLICATION_ID || 'sandbox-sq0idb-XXXXXXXXXX', // Replace with your Square Application ID
    locationId: process.env.SQUARE_LOCATION_ID || 'SANDBOX_LOCATION_ID', // Replace with your Square Location ID
    moment
  });
});

app.post('/process-payment', requireAuth, blockPartnerBooking, async (req, res) => {
  if (!req.session.pendingBooking) {
    return res.status(400).json({ error: 'No pending booking found' });
  }
  
  const { sourceId, cardDetails, paymentType = 'down' } = req.body;
  const booking = req.session.pendingBooking;
  const paymentStatusService = new PaymentStatusService();
  
  try {
    let paymentResult;
    const totalAmount = booking.serviceInfo.price;
    
    if (paymentType === 'down') {
      // Process down payment (20%)
      paymentResult = await processDownPayment(booking, sourceId, totalAmount);
      if (paymentResult.success) {
        // Save the appointment to database (down payment)
        const appointmentId = await saveAppointment({
          username: req.session.user.username,
          date: booking.date,
          time: booking.time,
          service: booking.service,
          serviceInfo: booking.serviceInfo,
          status: 'confirmed',
          paymentId: paymentResult.paymentId,
          paidAmount: paymentResult.amount
        });
        // Store payment record using status service
        const paymentId = await paymentStatusService.createPaymentRecord({
          squarePaymentId: paymentResult.paymentId,
          appointmentId: appointmentId,
          amount: paymentResult.amount,
          type: PAYMENT_TYPES.DOWN_PAYMENT,
          status: paymentResult.status === 'COMPLETED' ? PAYMENT_STATUSES.COMPLETED : PAYMENT_STATUSES.PROCESSING
        });
        // Create invoice for remaining payment
        const invoiceResult = await createRemainingPaymentInvoice(
          booking, 
          paymentResult.remainingAmount, 
          paymentResult.paymentId
        );
        // Clear pending booking
        delete req.session.pendingBooking;
        res.json({ 
          success: true, 
          appointmentId,
          paymentId: paymentResult.paymentId,
          paidAmount: paymentResult.amount,
          remainingAmount: paymentResult.remainingAmount,
          invoiceId: invoiceResult.success ? invoiceResult.invoiceId : null
        });
      } else {
        // Record failed payment attempt
        try {
          await paymentStatusService.createPaymentRecord({
            squarePaymentId: `failed_${Date.now()}`, // Temporary ID for failed payments
            appointmentId: null,
            amount: paymentResult.amount || calculateDownPayment(totalAmount),
            type: PAYMENT_TYPES.DOWN_PAYMENT,
            status: PAYMENT_STATUSES.FAILED
          });
        } catch (recordError) {
          console.error('Failed to record failed payment:', recordError);
        }
        
        res.status(400).json({ 
          error: paymentResult.error || 'Down payment was not completed',
          code: paymentResult.code 
        });
      }
    } else if (paymentType === 'full') {
      // Process full payment
      paymentResult = await processFullPayment(booking, sourceId, totalAmount);
      if (paymentResult.success) {
        // Save the appointment to database (full payment)
        const appointmentId = await saveAppointment({
          username: req.session.user.username,
          date: booking.date,
          time: booking.time,
          service: booking.service,
          serviceInfo: booking.serviceInfo,
          status: 'confirmed',
          paymentId: paymentResult.paymentId,
          paidAmount: totalAmount
        });
        // Store payment record using status service
        const paymentId = await paymentStatusService.createPaymentRecord({
          squarePaymentId: paymentResult.paymentId,
          appointmentId: appointmentId,
          amount: totalAmount,
          type: PAYMENT_TYPES.FULL_PAYMENT,
          status: paymentResult.status === 'COMPLETED' ? PAYMENT_STATUSES.COMPLETED : PAYMENT_STATUSES.PROCESSING
        });
        // Clear pending booking
        delete req.session.pendingBooking;
        res.json({ 
          success: true, 
          appointmentId,
          paymentId: paymentResult.paymentId,
          paidAmount: totalAmount,
          remainingAmount: 0
        });
      } else {
        // Record failed payment attempt
        try {
          await paymentStatusService.createPaymentRecord({
            squarePaymentId: `failed_${Date.now()}`, // Temporary ID for failed payments
            appointmentId: null,
            amount: totalAmount,
            type: PAYMENT_TYPES.FULL_PAYMENT,
            status: PAYMENT_STATUSES.FAILED
          });
        } catch (recordError) {
          console.error('Failed to record failed payment:', recordError);
        }
        
        res.status(400).json({ 
          error: paymentResult.error || 'Payment was not completed',
          code: paymentResult.code 
        });
      }
    } else {
      res.status(400).json({ error: 'Invalid payment type' });
    }
  } catch (error) {
    console.error('Payment error:', error);
    
    // Try to record the error
    try {
      await paymentStatusService.createPaymentRecord({
        squarePaymentId: `error_${Date.now()}`,
        appointmentId: null,
        amount: 0,
        type: paymentType === 'down' ? PAYMENT_TYPES.DOWN_PAYMENT : PAYMENT_TYPES.FULL_PAYMENT,
        status: PAYMENT_STATUSES.FAILED
      });
    } catch (recordError) {
      console.error('Failed to record payment error:', recordError);
    }
    
    res.status(500).json({ 
      error: 'Payment processing failed',
      message: error.message 
    });
  }
});

app.get('/my-appointments', requireAuth, async (req, res) => {
  const appointments = await loadAppointments();
  const userAppointments = appointments.filter(apt => apt.username === req.session.user.username);
  
  // Enhanced appointment data with payment status
  const paymentStatusService = new PaymentStatusService();
  const enhancedAppointments = await Promise.all(
    userAppointments.map(async (appointment) => {
      try {
        const paymentSummary = await paymentStatusService.getPaymentSummary(appointment.id);
        return {
          ...appointment,
          paymentSummary
        };
      } catch (error) {
        console.error(`Error getting payment summary for appointment ${appointment.id}:`, error);
        return appointment;
      }
    })
  );
  
  res.render('my-appointments', { 
    user: req.session.user, 
    appointments: enhancedAppointments,
    moment
  });
});

app.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  const appointments = await loadAppointments();
  res.render('admin', { 
    user: req.session.user, 
    appointments,
    moment
  });
});

app.get('/logout', (req, res) => {
  // Use the auth route for OAuth logout if user came from OAuth
  if (req.user) {
    return res.redirect('/auth/logout');
  }
  
  // Clear JWT token cookie for both OAuth and legacy users
  res.clearCookie('jwt_token');
  
  // Legacy logout for backward compatibility
  req.session.destroy(() => {
    res.redirect('/');
  });
});

setupCancelAppointmentRoute(app, db, requireAuth);
app.listen(PORT, async () => {
  // Initialize database before starting server
  await initializeDatabase();
  console.log(`Lyra Beauty app running on http://localhost:${PORT}`);
});
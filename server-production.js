const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const passport = require('./auth/strategies/google');

// Load environment variables
require('dotenv').config();

// Import authentication components
const authRoutes = require('./auth/routes/auth');
const { requireAuth, requireAdmin } = require('./auth/middleware/auth');
const userService = require('./services/user');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize user service
userService.initializeUsers();

// Legacy hardcoded users (kept for backward compatibility during transition)
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

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'lyra_secret_production_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// OAuth routes
app.use('/auth', authRoutes);

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

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    req.session.user = user;
    return res.redirect(user.role === 'admin' ? '/admin' : '/dashboard');
  }
  res.render('login', { error: 'Invalid credentials' });
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { user: req.session.user });
});

app.get('/book', requireAuth, (req, res) => {
  const selectedDate = req.query.date || moment().format('YYYY-MM-DD');
  const timeSlots = generateTimeSlots(selectedDate);
  const availableSlots = timeSlots.filter(slot => isSlotAvailable(selectedDate, slot));
  
  res.render('book', { 
    user: req.session.user, 
    selectedDate,
    availableSlots,
    servicePricing,
    moment
  });
});

app.post('/book', requireAuth, (req, res) => {
  const { date, time, service } = req.body;
  
  if (!isSlotAvailable(date, time)) {
    return res.render('book', { 
      user: req.session.user, 
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

app.get('/payment', requireAuth, (req, res) => {
  if (!req.session.pendingBooking) {
    return res.redirect('/book');
  }
  
  const booking = req.session.pendingBooking;
  res.render('payment', {
    user: req.session.user,
    booking,
    applicationId: process.env.SQUARE_APPLICATION_ID || 'sandbox-sq0idb-demo',
    locationId: process.env.SQUARE_LOCATION_ID || 'demo-location',
    moment
  });
});

app.post('/process-payment', requireAuth, async (req, res) => {
  if (!req.session.pendingBooking) {
    return res.status(400).json({ error: 'No pending booking found' });
  }
  
  const { sourceId, cardDetails } = req.body;
  const booking = req.session.pendingBooking;
  
  try {
    // Mock payment processing for demonstration
    // In production, you would integrate with Square's API here
    console.log('Processing payment for:', booking.serviceInfo.name);
    console.log('Amount:', booking.serviceInfo.price / 100);
    
    // Simulate payment success (you can add validation logic here)
    const paymentSuccess = true; // Mock successful payment
    
    if (paymentSuccess) {
      // Save the appointment
      const appointments = loadAppointments();
      const user = req.session.user;
      const userIdentifier = user.username || user.email || user.id;
      
      const newAppointment = {
        id: Date.now(),
        username: userIdentifier, // Keep for backward compatibility
        user_id: user.id || user.username, // New field for OAuth users
        user_email: user.email || '', // For OAuth users
        date: booking.date,
        time: booking.time,
        service: booking.service,
        serviceInfo: booking.serviceInfo,
        status: 'confirmed',
        paymentId: `mock_payment_${Date.now()}`,
        paidAmount: booking.serviceInfo.price
      };
      
      appointments.push(newAppointment);
      saveAppointments(appointments);
      
      // Clear pending booking
      delete req.session.pendingBooking;
      
      res.json({ success: true, appointmentId: newAppointment.id });
    } else {
      res.status(400).json({ error: 'Payment was not completed' });
    }
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

app.get('/my-appointments', requireAuth, (req, res) => {
  const appointments = loadAppointments();
  const user = req.session.user;
  const userIdentifier = user.username || user.email || user.id;
  
  // Filter appointments by both old and new user identification methods
  const userAppointments = appointments.filter(apt => 
    apt.username === userIdentifier || 
    apt.user_id === user.id || 
    apt.user_email === user.email
  );
  
  res.render('my-appointments', { 
    user: req.session.user, 
    appointments: userAppointments,
    moment
  });
});

app.get('/admin', requireAuth, requireAdmin, (req, res) => {
  const appointments = loadAppointments();
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
  
  // Legacy logout for backward compatibility
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Health check endpoint for load balancer
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Lyra Beauty app running on http://0.0.0.0:${PORT}`);
});

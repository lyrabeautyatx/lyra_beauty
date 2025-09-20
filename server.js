const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const { getDatabase } = require('./database');

// Load environment variables
require('dotenv').config();

const app = express();
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
      SELECT a.*, u.username, s.service_key, s.name as service_name, s.price as service_price
      FROM appointments a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN services s ON a.service_id = s.id
      ORDER BY a.date, a.time
    `);
    
    // Transform to match legacy format for compatibility
    return appointments.map(apt => ({
      id: apt.id,
      username: apt.username,
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
      throw new Error(`User not found: ${username}`);
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
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'lyra_secret',
  resave: false,
  saveUninitialized: false
}));

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') return next();
  res.status(403).send('Forbidden');
}

app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await authenticateUser(username, password);
  if (user) {
    req.session.user = {
      username: user.username,
      role: user.role,
      id: user.id
    };
    return res.redirect(user.role === 'admin' ? '/admin' : '/dashboard');
  }
  res.render('login', { error: 'Invalid credentials' });
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { user: req.session.user });
});

app.get('/book', requireAuth, async (req, res) => {
  const selectedDate = req.query.date || moment().format('YYYY-MM-DD');
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
    moment
  });
});

app.post('/book', requireAuth, async (req, res) => {
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

app.get('/payment', requireAuth, (req, res) => {
  if (!req.session.pendingBooking) {
    return res.redirect('/book');
  }
  
  const booking = req.session.pendingBooking;
  res.render('payment', {
    user: req.session.user,
    booking,
    applicationId: process.env.SQUARE_APPLICATION_ID || 'sandbox-sq0idb-XXXXXXXXXX', // Replace with your Square Application ID
    locationId: process.env.SQUARE_LOCATION_ID || 'SANDBOX_LOCATION_ID' // Replace with your Square Location ID
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
      // Save the appointment to database
      const appointmentId = await saveAppointment({
        username: req.session.user.username,
        date: booking.date,
        time: booking.time,
        service: booking.service,
        serviceInfo: booking.serviceInfo,
        status: 'confirmed',
        paymentId: `mock_payment_${Date.now()}`,
        paidAmount: booking.serviceInfo.price
      });
      
      // Clear pending booking
      delete req.session.pendingBooking;
      
      res.json({ success: true, appointmentId });
    } else {
      res.status(400).json({ error: 'Payment was not completed' });
    }
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

app.get('/my-appointments', requireAuth, async (req, res) => {
  const appointments = await loadAppointments();
  const userAppointments = appointments.filter(apt => apt.username === req.session.user.username);
  
  res.render('my-appointments', { 
    user: req.session.user, 
    appointments: userAppointments,
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
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.listen(PORT, async () => {
  // Initialize database before starting server
  await initializeDatabase();
  console.log(`Lyra Beauty app running on http://localhost:${PORT}`);
});

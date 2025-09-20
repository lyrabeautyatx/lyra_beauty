const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

// Load environment variables
require('dotenv').config();

// Import webhook routes
const webhookRoutes = require('./routes/webhooks');
const { 
  processDownPayment, 
  processFullPayment,
  createRemainingPaymentInvoice, 
  calculateDownPayment, 
  calculateRemainingPayment 
} = require('./services/payments');

const app = express();
const PORT = process.env.PORT || 3000;

// Hardcoded users
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

// Webhook routes
app.use('/webhooks', webhookRoutes);

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

app.post('/process-payment', requireAuth, async (req, res) => {
  if (!req.session.pendingBooking) {
    return res.status(400).json({ error: 'No pending booking found' });
  }
  
  const { sourceId, cardDetails, paymentType = 'down' } = req.body;
  const booking = req.session.pendingBooking;
  
  try {
    let paymentResult;
    const totalAmount = booking.serviceInfo.price;
    
    if (paymentType === 'down') {
      // Process down payment (20%)
      console.log('Processing down payment for:', booking.serviceInfo.name);
      console.log('Total amount:', totalAmount / 100);
      console.log('Down payment amount:', calculateDownPayment(totalAmount) / 100);
      
      paymentResult = await processDownPayment(booking, sourceId, totalAmount);
      
      if (paymentResult.success) {
        // Save the appointment with down payment information
        const appointments = loadAppointments();
        const newAppointment = {
          id: Date.now(),
          username: req.session.user.username,
          date: booking.date,
          time: booking.time,
          service: booking.service,
          serviceInfo: booking.serviceInfo,
          status: 'confirmed',
          paymentStatus: 'down_payment_completed',
          paymentType: 'down_payment',
          totalAmount: totalAmount,
          paidAmount: paymentResult.amount,
          remainingAmount: paymentResult.remainingAmount,
          paymentData: {
            paymentId: paymentResult.paymentId,
            referenceId: paymentResult.referenceId,
            status: paymentResult.status,
            createdAt: new Date().toISOString()
          }
        };
        
        appointments.push(newAppointment);
        saveAppointments(appointments);
        
        // Create invoice for remaining payment
        const invoiceResult = await createRemainingPaymentInvoice(
          booking, 
          paymentResult.remainingAmount, 
          paymentResult.paymentId
        );
        
        if (invoiceResult.success) {
          newAppointment.paymentData.invoiceId = invoiceResult.invoiceId;
          newAppointment.paymentData.invoiceNumber = invoiceResult.invoiceNumber;
          saveAppointments(appointments);
        }
        
        // Clear pending booking
        delete req.session.pendingBooking;
        
        res.json({ 
          success: true, 
          appointmentId: newAppointment.id,
          paymentId: paymentResult.paymentId,
          paidAmount: paymentResult.amount,
          remainingAmount: paymentResult.remainingAmount,
          invoiceId: invoiceResult.success ? invoiceResult.invoiceId : null
        });
      } else {
        res.status(400).json({ 
          error: paymentResult.error || 'Down payment was not completed',
          code: paymentResult.code 
        });
      }
    } else if (paymentType === 'full') {
      // Process full payment
      console.log('Processing full payment for:', booking.serviceInfo.name);
      console.log('Amount:', totalAmount / 100);
      
      paymentResult = await processFullPayment(booking, sourceId, totalAmount);
      
      if (paymentResult.success) {
        // Save the appointment with full payment information
        const appointments = loadAppointments();
        const newAppointment = {
          id: Date.now(),
          username: req.session.user.username,
          date: booking.date,
          time: booking.time,
          service: booking.service,
          serviceInfo: booking.serviceInfo,
          status: 'confirmed',
          paymentStatus: 'full_payment_completed',
          paymentType: 'full_payment',
          totalAmount: totalAmount,
          paidAmount: totalAmount,
          remainingAmount: 0,
          paymentData: {
            paymentId: paymentResult.paymentId,
            referenceId: paymentResult.referenceId,
            status: paymentResult.status,
            createdAt: new Date().toISOString()
          }
        };
        
        appointments.push(newAppointment);
        saveAppointments(appointments);
        
        // Clear pending booking
        delete req.session.pendingBooking;
        
        res.json({ 
          success: true, 
          appointmentId: newAppointment.id,
          paymentId: paymentResult.paymentId,
          paidAmount: totalAmount,
          remainingAmount: 0
        });
      } else {
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
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

app.get('/my-appointments', requireAuth, (req, res) => {
  const appointments = loadAppointments();
  const userAppointments = appointments.filter(apt => apt.username === req.session.user.username);
  
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
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log(`Lyra Beauty app running on http://localhost:${PORT}`);
});

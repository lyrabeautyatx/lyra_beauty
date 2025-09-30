const { getDatabase } = require('../database');
const { PaymentStatusService, PAYMENT_STATUSES, PAYMENT_TYPES } = require('../services/paymentStatus');

async function createSampleAppointmentData() {
  console.log('🎭 Creating sample appointment data for payment status testing...');
  
  const db = getDatabase();
  const paymentStatusService = new PaymentStatusService();
  
  try {
    await db.connect();
    
    // Find user1's ID
    const user = await db.get('SELECT id FROM users WHERE username = ?', ['user1']);
    if (!user) {
      throw new Error('User user1 not found');
    }
    
    // Get or find service ID for Microblading
    let service = await db.get('SELECT id FROM services WHERE service_key = ?', ['microblading']);
    if (!service) {
      // Create the service if it doesn't exist
      const serviceResult = await db.run(`
        INSERT INTO services (service_key, name, price, duration_minutes, active)
        VALUES (?, ?, ?, ?, ?)
      `, ['microblading', 'Microblading', 35000, 120, 1]);
      service = { id: serviceResult.id };
    }
    
    // Create appointment 1: Successful down payment + pending remaining
    const apt1Result = await db.run(`
      INSERT INTO appointments (user_id, service_id, date, time, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [user.id, service.id, '2025-10-15', '10:00', 'confirmed', new Date().toISOString(), new Date().toISOString()]);
    
    // Create successful down payment
    await paymentStatusService.createPaymentRecord({
      squarePaymentId: 'demo_down_payment_success',
      appointmentId: apt1Result.id,
      amount: 7000, // $70
      type: PAYMENT_TYPES.DOWN_PAYMENT,
      status: PAYMENT_STATUSES.COMPLETED
    });
    
    // Create pending remaining payment
    await paymentStatusService.createPaymentRecord({
      squarePaymentId: 'demo_remaining_pending',
      appointmentId: apt1Result.id,
      amount: 28000, // $280
      type: PAYMENT_TYPES.REMAINING_PAYMENT,
      status: PAYMENT_STATUSES.PENDING
    });
    
    // Create appointment 2: Failed payment with retry
    const apt2Result = await db.run(`
      INSERT INTO appointments (user_id, service_id, date, time, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [user.id, service.id, '2025-10-20', '14:00', 'pending', new Date().toISOString(), new Date().toISOString()]);
    
    // Create failed payment with error message
    await paymentStatusService.createPaymentRecord({
      squarePaymentId: 'demo_payment_failed',
      appointmentId: apt2Result.id,
      amount: 35000, // $350 full payment
      type: PAYMENT_TYPES.FULL_PAYMENT,
      status: PAYMENT_STATUSES.FAILED
    });
    
    // Update failed payment with error message
    await paymentStatusService.updatePaymentStatus(
      'demo_payment_failed',
      PAYMENT_STATUSES.FAILED,
      'Card declined - insufficient funds'
    );
    
    // Create appointment 3: Full payment completed
    const apt3Result = await db.run(`
      INSERT INTO appointments (user_id, service_id, date, time, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [user.id, service.id, '2025-11-01', '09:30', 'confirmed', new Date().toISOString(), new Date().toISOString()]);
    
    // Create successful full payment
    await paymentStatusService.createPaymentRecord({
      squarePaymentId: 'demo_full_payment_success',
      appointmentId: apt3Result.id,
      amount: 35000, // $350
      type: PAYMENT_TYPES.FULL_PAYMENT,
      status: PAYMENT_STATUSES.COMPLETED
    });
    
    console.log('✓ Sample appointment data created successfully!');
    console.log(`  - Appointment 1 (ID: ${apt1Result.id}): Down payment completed, remaining pending`);
    console.log(`  - Appointment 2 (ID: ${apt2Result.id}): Payment failed with error message`);
    console.log(`  - Appointment 3 (ID: ${apt3Result.id}): Full payment completed`);
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createSampleAppointmentData().catch(console.error);
}

module.exports = { createSampleAppointmentData };
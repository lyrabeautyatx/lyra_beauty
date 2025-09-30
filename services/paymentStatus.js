const { getDatabase } = require('../database');

// Payment status constants
const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing', 
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

// Payment type constants
const PAYMENT_TYPES = {
  DOWN_PAYMENT: 'down_payment',
  FULL_PAYMENT: 'full_payment',
  REMAINING_PAYMENT: 'remaining_payment',
  REFUND: 'refund'
};

class PaymentStatusService {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Create a new payment record with initial status
   */
  async createPaymentRecord(paymentData) {
    const {
      squarePaymentId,
      appointmentId,
      amount,
      type,
      status = PAYMENT_STATUSES.PENDING
    } = paymentData;

    try {
      const result = await this.db.run(`
        INSERT INTO payments (
          square_payment_id, appointment_id, amount, type, status, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        squarePaymentId,
        appointmentId,
        amount,
        type,
        status,
        new Date().toISOString(),
        new Date().toISOString()
      ]);

      console.log(`Payment record created: ${result.id} with status ${status}`);
      return result.id;
    } catch (error) {
      console.error('Error creating payment record:', error);
      throw error;
    }
  }

  /**
   * Update payment status with validation
   */
  async updatePaymentStatus(squarePaymentId, newStatus, errorMessage = null) {
    try {
      // Validate status transition
      const currentPayment = await this.getPaymentBySquareId(squarePaymentId);
      if (!currentPayment) {
        throw new Error(`Payment not found: ${squarePaymentId}`);
      }

      if (!this.isValidStatusTransition(currentPayment.status, newStatus)) {
        console.warn(`Invalid status transition from ${currentPayment.status} to ${newStatus} for payment ${squarePaymentId}`);
        // Allow the transition anyway but log the warning
      }

      // Update payment status
      await this.db.run(`
        UPDATE payments 
        SET status = ?, updated_at = ?, error_message = ?
        WHERE square_payment_id = ?
      `, [newStatus, new Date().toISOString(), errorMessage, squarePaymentId]);

      // Update related appointment status if payment completed
      if (newStatus === PAYMENT_STATUSES.COMPLETED) {
        await this.updateAppointmentOnPaymentSuccess(squarePaymentId);
      } else if (newStatus === PAYMENT_STATUSES.FAILED) {
        await this.updateAppointmentOnPaymentFailure(squarePaymentId, errorMessage);
      }

      console.log(`Payment ${squarePaymentId} status updated to ${newStatus}`);
      return true;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  /**
   * Get payment details by Square payment ID
   */
  async getPaymentBySquareId(squarePaymentId) {
    try {
      const payment = await this.db.get(`
        SELECT * FROM payments WHERE square_payment_id = ?
      `, [squarePaymentId]);
      return payment;
    } catch (error) {
      console.error('Error getting payment by square ID:', error);
      throw error;
    }
  }

  /**
   * Get all payments for an appointment
   */
  async getPaymentsByAppointment(appointmentId) {
    try {
      const payments = await this.db.all(`
        SELECT * FROM payments WHERE appointment_id = ? ORDER BY created_at ASC
      `, [appointmentId]);
      return payments;
    } catch (error) {
      console.error('Error getting payments by appointment:', error);
      throw error;
    }
  }

  /**
   * Get payment summary for appointment display
   */
  async getPaymentSummary(appointmentId) {
    try {
      const payments = await this.getPaymentsByAppointment(appointmentId);
      
      const summary = {
        totalPaid: 0,
        totalPending: 0,
        totalFailed: 0,
        hasCompletedPayment: false,
        hasPendingPayment: false,
        hasFailedPayment: false,
        paymentDetails: payments
      };

      payments.forEach(payment => {
        switch (payment.status) {
          case PAYMENT_STATUSES.COMPLETED:
            summary.totalPaid += payment.amount;
            summary.hasCompletedPayment = true;
            break;
          case PAYMENT_STATUSES.PENDING:
          case PAYMENT_STATUSES.PROCESSING:
            summary.totalPending += payment.amount;
            summary.hasPendingPayment = true;
            break;
          case PAYMENT_STATUSES.FAILED:
            summary.totalFailed += payment.amount;
            summary.hasFailedPayment = true;
            break;
        }
      });

      return summary;
    } catch (error) {
      console.error('Error getting payment summary:', error);
      throw error;
    }
  }

  /**
   * Validate status transitions
   */
  isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      [PAYMENT_STATUSES.PENDING]: [
        PAYMENT_STATUSES.PROCESSING,
        PAYMENT_STATUSES.COMPLETED,
        PAYMENT_STATUSES.FAILED,
        PAYMENT_STATUSES.CANCELLED
      ],
      [PAYMENT_STATUSES.PROCESSING]: [
        PAYMENT_STATUSES.COMPLETED,
        PAYMENT_STATUSES.FAILED
      ],
      [PAYMENT_STATUSES.COMPLETED]: [
        PAYMENT_STATUSES.REFUNDED
      ],
      [PAYMENT_STATUSES.FAILED]: [
        PAYMENT_STATUSES.PENDING,
        PAYMENT_STATUSES.CANCELLED
      ],
      [PAYMENT_STATUSES.CANCELLED]: [],
      [PAYMENT_STATUSES.REFUNDED]: []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Update appointment when payment succeeds
   */
  async updateAppointmentOnPaymentSuccess(squarePaymentId) {
    try {
      await this.db.run(`
        UPDATE appointments 
        SET status = 'confirmed', updated_at = ?
        WHERE id = (
          SELECT appointment_id FROM payments 
          WHERE square_payment_id = ? AND appointment_id IS NOT NULL
        )
      `, [new Date().toISOString(), squarePaymentId]);

      console.log(`Appointment confirmed for payment ${squarePaymentId}`);
    } catch (error) {
      console.error('Error updating appointment on payment success:', error);
      throw error;
    }
  }

  /**
   * Update appointment when payment fails
   */
  async updateAppointmentOnPaymentFailure(squarePaymentId, errorMessage) {
    try {
      // Don't automatically cancel appointment on payment failure
      // Keep as pending to allow retry
      console.log(`Payment failed for ${squarePaymentId}: ${errorMessage}`);
      
      // Could add notification logic here in the future
    } catch (error) {
      console.error('Error handling payment failure:', error);
      throw error;
    }
  }

  /**
   * Retry failed payment
   */
  async retryFailedPayment(squarePaymentId) {
    try {
      const payment = await this.getPaymentBySquareId(squarePaymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== PAYMENT_STATUSES.FAILED) {
        throw new Error('Payment is not in failed status');
      }

      // Reset to pending for retry
      await this.updatePaymentStatus(squarePaymentId, PAYMENT_STATUSES.PENDING);
      
      console.log(`Payment ${squarePaymentId} reset for retry`);
      return true;
    } catch (error) {
      console.error('Error retrying failed payment:', error);
      throw error;
    }
  }
}

module.exports = {
  PaymentStatusService,
  PAYMENT_STATUSES,
  PAYMENT_TYPES
};
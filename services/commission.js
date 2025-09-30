const { getDatabase } = require('../database');

/**
 * Commission Service
 * Handles partner commission calculations and tracking
 */

class CommissionService {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Calculate 20% commission on original service price
   * @param {number} originalPrice - Original service price in cents
   * @returns {number} Commission amount in cents
   */
  calculateCommission(originalPrice) {
    if (!originalPrice || originalPrice <= 0) {
      throw new Error('Original price must be positive');
    }
    
    // 20% commission on original price (before any discount)
    return Math.floor(originalPrice * 0.20);
  }

  /**
   * Create commission record for a partner referral
   * @param {Object} params - Commission parameters
   * @param {number} params.partnerId - Partner user ID
   * @param {number} params.appointmentId - Related appointment ID
   * @param {number} params.originalPrice - Original service price in cents
   * @returns {Promise<Object>} Commission record with ID
   */
  async createCommission({ partnerId, appointmentId, originalPrice }) {
    try {
      // Validate inputs
      if (!partnerId || !appointmentId || !originalPrice) {
        throw new Error('Partner ID, appointment ID, and original price are required');
      }

      const commissionAmount = this.calculateCommission(originalPrice);

      // Check if commission already exists for this appointment
      const existingCommission = await this.db.get(
        'SELECT id FROM partner_commissions WHERE appointment_id = ?',
        [appointmentId]
      );

      if (existingCommission) {
        throw new Error('Commission already exists for this appointment');
      }

      // Verify partner exists and has partner role
      const partner = await this.db.get(
        'SELECT id, role FROM users WHERE id = ? AND role = ?',
        [partnerId, 'partner']
      );

      if (!partner) {
        throw new Error('Partner not found or user is not a partner');
      }

      // Verify appointment exists
      const appointment = await this.db.get(
        'SELECT id FROM appointments WHERE id = ?',
        [appointmentId]
      );

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Create commission record
      const result = await this.db.run(`
        INSERT INTO partner_commissions (
          partner_id, appointment_id, commission_amount, 
          original_price, status, created_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [partnerId, appointmentId, commissionAmount, originalPrice, 'pending']);

      console.log(`Commission created: Partner ${partnerId}, Amount: $${(commissionAmount / 100).toFixed(2)}, Appointment: ${appointmentId}`);

      return {
        id: result.id,
        partnerId,
        appointmentId,
        commissionAmount,
        originalPrice,
        status: 'pending',
        commissionPercentage: 20
      };
    } catch (error) {
      console.error('Error creating commission:', error);
      throw error;
    }
  }

  /**
   * Get commission details by ID
   * @param {number} commissionId - Commission ID
   * @returns {Promise<Object>} Commission details
   */
  async getCommission(commissionId) {
    try {
      const commission = await this.db.get(`
        SELECT 
          pc.*,
          u.first_name, u.last_name, u.email as partner_email,
          a.date as appointment_date, a.time as appointment_time,
          s.name as service_name, s.price as service_price
        FROM partner_commissions pc
        JOIN users u ON pc.partner_id = u.id
        JOIN appointments a ON pc.appointment_id = a.id
        JOIN services s ON a.service_id = s.id
        WHERE pc.id = ?
      `, [commissionId]);

      if (!commission) {
        throw new Error('Commission not found');
      }

      return {
        ...commission,
        commission_amount_dollars: (commission.commission_amount / 100).toFixed(2),
        original_price_dollars: (commission.original_price / 100).toFixed(2)
      };
    } catch (error) {
      console.error('Error getting commission:', error);
      throw error;
    }
  }

  /**
   * Get all commissions for a partner
   * @param {number} partnerId - Partner user ID
   * @returns {Promise<Array>} List of commissions for the partner
   */
  async getPartnerCommissions(partnerId) {
    try {
      const commissions = await this.db.all(`
        SELECT 
          pc.*,
          a.date as appointment_date, a.time as appointment_time,
          s.name as service_name,
          u.first_name as customer_first_name, u.last_name as customer_last_name
        FROM partner_commissions pc
        JOIN appointments a ON pc.appointment_id = a.id
        JOIN services s ON a.service_id = s.id
        JOIN users u ON a.user_id = u.id
        WHERE pc.partner_id = ?
        ORDER BY pc.created_at DESC
      `, [partnerId]);

      return commissions.map(commission => ({
        ...commission,
        commission_amount_dollars: (commission.commission_amount / 100).toFixed(2),
        original_price_dollars: (commission.original_price / 100).toFixed(2)
      }));
    } catch (error) {
      console.error('Error getting partner commissions:', error);
      throw error;
    }
  }

  /**
   * Update commission status (pending -> paid)
   * @param {number} commissionId - Commission ID
   * @param {string} status - New status ('pending' or 'paid')
   * @returns {Promise<boolean>} Success status
   */
  async updateCommissionStatus(commissionId, status) {
    try {
      if (!['pending', 'paid'].includes(status)) {
        throw new Error('Invalid status. Must be "pending" or "paid"');
      }

      const result = await this.db.run(`
        UPDATE partner_commissions 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [status, commissionId]);

      if (result.changes === 0) {
        throw new Error('Commission not found');
      }

      console.log(`Commission ${commissionId} status updated to: ${status}`);
      return true;
    } catch (error) {
      console.error('Error updating commission status:', error);
      throw error;
    }
  }

  /**
   * Get total commission earnings for a partner
   * @param {number} partnerId - Partner user ID
   * @param {string} status - Optional status filter ('pending', 'paid', or null for all)
   * @returns {Promise<Object>} Total earnings summary
   */
  async getPartnerEarnings(partnerId, status = null) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_commissions,
          SUM(commission_amount) as total_amount,
          status
        FROM partner_commissions 
        WHERE partner_id = ?
      `;
      const params = [partnerId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' GROUP BY status';

      const results = await this.db.all(query, params);

      let summary = {
        pending_count: 0,
        pending_amount: 0,
        paid_count: 0,
        paid_amount: 0,
        total_count: 0,
        total_amount: 0
      };

      results.forEach(result => {
        if (result.status === 'pending') {
          summary.pending_count = result.total_commissions;
          summary.pending_amount = result.total_amount || 0;
        } else if (result.status === 'paid') {
          summary.paid_count = result.total_commissions;
          summary.paid_amount = result.total_amount || 0;
        }
      });

      summary.total_count = summary.pending_count + summary.paid_count;
      summary.total_amount = summary.pending_amount + summary.paid_amount;

      // Convert to dollars
      summary.pending_amount_dollars = (summary.pending_amount / 100).toFixed(2);
      summary.paid_amount_dollars = (summary.paid_amount / 100).toFixed(2);
      summary.total_amount_dollars = (summary.total_amount / 100).toFixed(2);

      return summary;
    } catch (error) {
      console.error('Error getting partner earnings:', error);
      throw error;
    }
  }

  /**
   * Process commission for appointment with coupon
   * This is called when an appointment is created with a coupon
   * @param {Object} params - Processing parameters
   * @param {number} params.appointmentId - Appointment ID
   * @param {number} params.couponId - Coupon ID used
   * @param {number} params.originalPrice - Original service price in cents
   * @returns {Promise<Object>} Commission creation result
   */
  async processAppointmentCommission({ appointmentId, couponId, originalPrice }) {
    try {
      // Get partner ID from coupon
      const coupon = await this.db.get(
        'SELECT partner_id FROM coupons WHERE id = ?',
        [couponId]
      );

      if (!coupon) {
        throw new Error('Coupon not found');
      }

      // Create commission for the partner
      const commission = await this.createCommission({
        partnerId: coupon.partner_id,
        appointmentId,
        originalPrice
      });

      console.log(`Commission processed for appointment ${appointmentId}: $${(commission.commissionAmount / 100).toFixed(2)}`);

      return commission;
    } catch (error) {
      console.error('Error processing appointment commission:', error);
      throw error;
    }
  }
}

// Export singleton instance
const commissionService = new CommissionService();

module.exports = {
  CommissionService,
  commissionService,
  
  // Convenience exports for direct function access
  calculateCommission: (originalPrice) => commissionService.calculateCommission(originalPrice),
  createCommission: (params) => commissionService.createCommission(params),
  getCommission: (commissionId) => commissionService.getCommission(commissionId),
  getPartnerCommissions: (partnerId) => commissionService.getPartnerCommissions(partnerId),
  updateCommissionStatus: (commissionId, status) => commissionService.updateCommissionStatus(commissionId, status),
  getPartnerEarnings: (partnerId, status) => commissionService.getPartnerEarnings(partnerId, status),
  processAppointmentCommission: (params) => commissionService.processAppointmentCommission(params)
};
const { getDatabase } = require('../database');

class CouponService {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Validate a coupon code and check if customer can use it
   * @param {string} couponCode - The coupon code to validate
   * @param {number} customerId - The customer's user ID
   * @returns {Object} Validation result with coupon details or error
   */
  async validateCoupon(couponCode, customerId) {
    try {
      // Step 1: Check if coupon exists and is active
      const coupon = await this.db.get(`
        SELECT c.*, u.first_name, u.last_name 
        FROM coupons c 
        JOIN users u ON c.partner_id = u.id 
        WHERE c.code = ? AND c.active = 1
      `, [couponCode]);

      if (!coupon) {
        return {
          valid: false,
          error: 'Invalid coupon code'
        };
      }

      // Step 2: Check if customer has already used any coupon (one-time use rule)
      const customer = await this.db.get(`
        SELECT has_used_coupon 
        FROM users 
        WHERE id = ?
      `, [customerId]);

      if (!customer) {
        return {
          valid: false,
          error: 'Customer not found'
        };
      }

      if (customer.has_used_coupon) {
        return {
          valid: false,
          error: 'You have already used a coupon. Each customer can only use one coupon in their lifetime.'
        };
      }

      // Step 3: Check if this specific coupon has been used by this customer
      const existingUsage = await this.db.get(`
        SELECT id 
        FROM coupon_usage 
        WHERE coupon_id = ? AND customer_id = ?
      `, [coupon.id, customerId]);

      if (existingUsage) {
        return {
          valid: false,
          error: 'You have already used this coupon'
        };
      }

      // Coupon is valid
      return {
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discount_percentage: coupon.discount_percentage,
          partner_id: coupon.partner_id,
          partner_name: `${coupon.first_name} ${coupon.last_name}`
        }
      };

    } catch (error) {
      console.error('Error validating coupon:', error);
      return {
        valid: false,
        error: 'An error occurred while validating the coupon'
      };
    }
  }

  /**
   * Calculate discount amount based on service price and coupon
   * @param {number} servicePrice - Original service price in cents
   * @param {number} discountPercentage - Discount percentage (e.g., 10.00 for 10%)
   * @returns {Object} Calculation result with amounts
   */
  calculateDiscount(servicePrice, discountPercentage) {
    const discountAmount = Math.floor(servicePrice * (discountPercentage / 100));
    const finalPrice = servicePrice - discountAmount;
    
    return {
      originalPrice: servicePrice,
      discountAmount: discountAmount,
      finalPrice: finalPrice,
      discountPercentage: discountPercentage
    };
  }

  /**
   * Calculate partner commission (20% of original price, not discounted price)
   * @param {number} originalPrice - Original service price in cents
   * @param {number} commissionPercentage - Commission percentage (default 20%)
   * @returns {number} Commission amount in cents
   */
  calculateCommission(originalPrice, commissionPercentage = 20.00) {
    return Math.floor(originalPrice * (commissionPercentage / 100));
  }

  /**
   * Record coupon usage after successful payment
   * @param {number} couponId - The coupon ID
   * @param {number} customerId - The customer's user ID
   * @param {number} appointmentId - The appointment ID
   * @param {number} discountAmount - The discount amount in cents
   * @returns {boolean} Success status
   */
  async recordCouponUsage(couponId, customerId, appointmentId, discountAmount) {
    try {
      // Start transaction
      await this.db.run('BEGIN TRANSACTION');

      // Record the coupon usage
      await this.db.run(`
        INSERT INTO coupon_usage (coupon_id, customer_id, appointment_id, discount_amount) 
        VALUES (?, ?, ?, ?)
      `, [couponId, customerId, appointmentId, discountAmount]);

      // Mark customer as having used a coupon
      await this.db.run(`
        UPDATE users 
        SET has_used_coupon = 1 
        WHERE id = ?
      `, [customerId]);

      // Commit transaction
      await this.db.run('COMMIT');

      return true;
    } catch (error) {
      // Rollback on error
      await this.db.run('ROLLBACK');
      console.error('Error recording coupon usage:', error);
      return false;
    }
  }

  /**
   * Record partner commission for a coupon usage
   * @param {number} partnerId - The partner's user ID
   * @param {number} appointmentId - The appointment ID
   * @param {number} couponId - The coupon ID
   * @param {number} originalServicePrice - The original service price in cents
   * @param {number} commissionPercentage - The commission percentage (default 20%)
   * @returns {boolean} Success status
   */
  async recordPartnerCommission(partnerId, appointmentId, couponId, originalServicePrice, commissionPercentage = 20.00) {
    try {
      const commissionAmount = this.calculateCommission(originalServicePrice, commissionPercentage);

      await this.db.run(`
        INSERT INTO partner_commissions 
        (partner_id, appointment_id, coupon_id, original_service_price, commission_amount, commission_percentage, status) 
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `, [partnerId, appointmentId, couponId, originalServicePrice, commissionAmount, commissionPercentage]);

      return true;
    } catch (error) {
      console.error('Error recording partner commission:', error);
      return false;
    }
  }

  /**
   * Get coupon usage history for a customer
   * @param {number} customerId - The customer's user ID
   * @returns {Array} List of coupon usage records
   */
  async getCustomerCouponHistory(customerId) {
    try {
      return await this.db.all(`
        SELECT cu.*, c.code, c.discount_percentage, a.date, a.time, s.name as service_name
        FROM coupon_usage cu
        JOIN coupons c ON cu.coupon_id = c.id
        JOIN appointments a ON cu.appointment_id = a.id
        JOIN services s ON a.service_id = s.id
        WHERE cu.customer_id = ?
        ORDER BY cu.used_at DESC
      `, [customerId]);
    } catch (error) {
      console.error('Error getting customer coupon history:', error);
      return [];
    }
  }

  /**
   * Get partner commission history
   * @param {number} partnerId - The partner's user ID
   * @returns {Array} List of commission records
   */
  async getPartnerCommissions(partnerId) {
    try {
      return await this.db.all(`
        SELECT pc.*, c.code, a.date, a.time, s.name as service_name, u.first_name, u.last_name
        FROM partner_commissions pc
        JOIN coupons c ON pc.coupon_id = c.id
        JOIN appointments a ON pc.appointment_id = a.id
        JOIN services s ON a.service_id = s.id
        JOIN users u ON a.user_id = u.id
        WHERE pc.partner_id = ?
        ORDER BY pc.created_at DESC
      `, [partnerId]);
    } catch (error) {
      console.error('Error getting partner commissions:', error);
      return [];
    }
  }
}

module.exports = new CouponService();
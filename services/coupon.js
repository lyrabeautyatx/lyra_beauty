const { getDatabase } = require('../database');

// Animal names for coupon generation based on first letter of partner's first name
const ANIMAL_MAPPING = {
  'A': 'alpaca', 'B': 'bear', 'C': 'cat', 'D': 'dolphin', 'E': 'elephant',
  'F': 'fox', 'G': 'giraffe', 'H': 'hippo', 'I': 'iguana', 'J': 'jaguar',
  'K': 'koala', 'L': 'lion', 'M': 'monkey', 'N': 'narwhal', 'O': 'otter',
  'P': 'penguin', 'Q': 'quail', 'R': 'rabbit', 'S': 'seal', 'T': 'tiger',
  'U': 'unicorn', 'V': 'vulture', 'W': 'whale', 'X': 'xerus', 'Y': 'yak', 'Z': 'zebra'
};

class CouponService {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Generate a coupon code based on partner's first name
   * Format: [animal][discount] (e.g., "penguin10off")
   */
  generateCouponCode(firstName, discountPercentage = 10) {
    if (!firstName || typeof firstName !== 'string') {
      throw new Error('First name is required to generate coupon code');
    }

    const firstLetter = firstName.charAt(0).toUpperCase();
    const animal = ANIMAL_MAPPING[firstLetter] || 'panda'; // fallback to panda
    return `${animal}${discountPercentage}off`;
  }

  /**
   * Validate coupon code format
   */
  validateCouponCodeFormat(code) {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Coupon code is required' };
    }

    // Check format: [animal][number]off
    const codePattern = /^[a-z]+\d+off$/i;
    if (!codePattern.test(code)) {
      return { valid: false, error: 'Invalid coupon code format. Expected format: [animal][discount]off' };
    }

    // Extract discount percentage
    const match = code.match(/(\d+)off$/i);
    if (!match) {
      return { valid: false, error: 'Could not extract discount from coupon code' };
    }

    const discount = parseInt(match[1]);
    if (discount <= 0 || discount > 100) {
      return { valid: false, error: 'Discount percentage must be between 1 and 100' };
    }

    return { valid: true, discount };
  }

  /**
   * Create a coupon for a partner
   */
  async createCoupon(partnerId, discountPercentage = 10) {
    try {
      await this.db.connect();

      // Verify partner exists and has partner role
      const partner = await this.db.get(
        'SELECT id, first_name, role FROM users WHERE id = ? AND role = ?',
        [partnerId, 'partner']
      );

      if (!partner) {
        throw new Error('Partner not found or user is not a partner');
      }

      // Generate coupon code
      const couponCode = this.generateCouponCode(partner.first_name, discountPercentage);

      // Check if coupon already exists
      const existingCoupon = await this.db.get(
        'SELECT id FROM coupons WHERE code = ?',
        [couponCode]
      );

      if (existingCoupon) {
        throw new Error('Coupon code already exists');
      }

      // Create the coupon
      const result = await this.db.run(
        'INSERT INTO coupons (partner_id, code, discount_percentage) VALUES (?, ?, ?)',
        [partnerId, couponCode, discountPercentage]
      );

      // Return the created coupon
      const createdCoupon = await this.db.get(
        'SELECT * FROM coupons WHERE id = ?',
        [result.lastID]
      );

      return {
        success: true,
        coupon: createdCoupon
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all coupons for a partner
   */
  async getPartnerCoupons(partnerId) {
    try {
      await this.db.connect();

      const coupons = await this.db.all(
        'SELECT * FROM coupons WHERE partner_id = ? ORDER BY created_at DESC',
        [partnerId]
      );

      return {
        success: true,
        coupons
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        coupons: []
      };
    }
  }

  /**
   * Get coupon by code
   */
  async getCouponByCode(code) {
    try {
      await this.db.connect();

      const coupon = await this.db.get(
        `SELECT c.*, u.first_name, u.last_name 
         FROM coupons c 
         JOIN users u ON c.partner_id = u.id 
         WHERE c.code = ? AND c.active = 1`,
        [code]
      );

      return {
        success: true,
        coupon
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        coupon: null
      };
    }
  }

  /**
   * Check if customer can use a coupon (business rule: one coupon per customer lifetime)
   */
  async canCustomerUseCoupon(customerId, couponCode) {
    try {
      await this.db.connect();

      // Check if customer has already used any coupon
      const customer = await this.db.get(
        'SELECT has_used_coupon FROM users WHERE id = ?',
        [customerId]
      );

      if (!customer) {
        return {
          canUse: false,
          reason: 'Customer not found'
        };
      }

      if (customer.has_used_coupon) {
        return {
          canUse: false,
          reason: 'Customer has already used a coupon. Only one coupon per customer lifetime is allowed.'
        };
      }

      // Check if the specific coupon exists and is active
      const couponResult = await this.getCouponByCode(couponCode);
      if (!couponResult.success || !couponResult.coupon) {
        return {
          canUse: false,
          reason: 'Coupon not found or inactive'
        };
      }

      return {
        canUse: true,
        coupon: couponResult.coupon
      };
    } catch (error) {
      return {
        canUse: false,
        reason: error.message
      };
    }
  }

  /**
   * Record coupon usage
   */
  async recordCouponUsage(couponId, customerId, appointmentId = null) {
    try {
      await this.db.connect();

      // Start transaction
      await this.db.run('BEGIN TRANSACTION');

      try {
        // Insert coupon usage record
        await this.db.run(
          'INSERT INTO coupon_usage (coupon_id, customer_id, appointment_id) VALUES (?, ?, ?)',
          [couponId, customerId, appointmentId]
        );

        // Mark customer as having used a coupon
        await this.db.run(
          'UPDATE users SET has_used_coupon = 1 WHERE id = ?',
          [customerId]
        );

        await this.db.run('COMMIT');

        return { success: true };
      } catch (error) {
        await this.db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get coupon usage statistics for a partner
   */
  async getCouponUsageStats(partnerId) {
    try {
      await this.db.connect();

      const stats = await this.db.get(
        `SELECT 
           COUNT(cu.id) as total_uses,
           COUNT(DISTINCT cu.customer_id) as unique_customers,
           SUM(CASE WHEN cu.appointment_id IS NOT NULL THEN 1 ELSE 0 END) as completed_appointments
         FROM coupons c
         LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id
         WHERE c.partner_id = ?`,
        [partnerId]
      );

      return {
        success: true,
        stats: {
          total_uses: stats.total_uses || 0,
          unique_customers: stats.unique_customers || 0,
          completed_appointments: stats.completed_appointments || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stats: null
      };
    }
  }
}

module.exports = new CouponService();
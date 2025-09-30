const { getDatabase } = require('../database');

// Validate coupon code and return coupon details
async function validateCoupon(couponCode, customerId) {
  const db = getDatabase();
  
  if (!db.isReady()) {
    await db.connect();
  }
  
  try {
    // Find the coupon
    const coupon = await db.get(`
      SELECT c.*, u.first_name as partner_name 
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
    
    // Check if customer has already used any coupon (one per lifetime)
    const customerCouponUsage = await db.get(`
      SELECT has_used_coupon FROM users WHERE id = ?
    `, [customerId]);
    
    if (customerCouponUsage && customerCouponUsage.has_used_coupon) {
      return {
        valid: false,
        error: 'You have already used a coupon. Only one coupon per customer is allowed.'
      };
    }
    
    // Check if this specific coupon has been used by this customer
    const existingUsage = await db.get(`
      SELECT id FROM coupon_usage WHERE coupon_id = ? AND customer_id = ?
    `, [coupon.id, customerId]);
    
    if (existingUsage) {
      return {
        valid: false,
        error: 'This coupon has already been used by your account'
      };
    }
    
    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        partnerId: coupon.partner_id,
        partnerName: coupon.partner_name,
        discountPercentage: coupon.discount_percentage
      }
    };
    
  } catch (error) {
    console.error('Error validating coupon:', error);
    return {
      valid: false,
      error: 'Error validating coupon'
    };
  }
}

// Apply discount to price and calculate commission
function applyDiscount(originalPrice, discountPercentage = 10) {
  const discountAmount = Math.floor(originalPrice * (discountPercentage / 100));
  const finalPrice = originalPrice - discountAmount;
  const partnerCommission = Math.floor(originalPrice * 0.20); // 20% of original price
  
  return {
    originalPrice,
    discountAmount,
    finalPrice,
    partnerCommission,
    discountPercentage
  };
}

// Record coupon usage
async function recordCouponUsage(couponId, customerId, appointmentId) {
  const db = getDatabase();
  
  if (!db.isReady()) {
    await db.connect();
  }
  
  try {
    // Record the coupon usage
    await db.run(`
      INSERT INTO coupon_usage (coupon_id, customer_id, appointment_id)
      VALUES (?, ?, ?)
    `, [couponId, customerId, appointmentId]);
    
    // Mark customer as having used a coupon
    await db.run(`
      UPDATE users SET has_used_coupon = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [customerId]);
    
    return { success: true };
    
  } catch (error) {
    console.error('Error recording coupon usage:', error);
    return { 
      success: false, 
      error: 'Failed to record coupon usage' 
    };
  }
}

// Create partner commission record
async function createPartnerCommission(partnerId, appointmentId, commissionAmount) {
  const db = getDatabase();
  
  if (!db.isReady()) {
    await db.connect();
  }
  
  try {
    const result = await db.run(`
      INSERT INTO partner_commissions (partner_id, appointment_id, commission_amount)
      VALUES (?, ?, ?)
    `, [partnerId, appointmentId, commissionAmount]);
    
    return { 
      success: true, 
      commissionId: result.lastID 
    };
    
  } catch (error) {
    console.error('Error creating partner commission:', error);
    return { 
      success: false, 
      error: 'Failed to create partner commission' 
    };
  }
}

// Get coupon by code
async function getCouponByCode(couponCode) {
  const db = getDatabase();
  
  if (!db.isReady()) {
    await db.connect();
  }
  
  try {
    const coupon = await db.get(`
      SELECT c.*, u.first_name as partner_name 
      FROM coupons c 
      JOIN users u ON c.partner_id = u.id 
      WHERE c.code = ? AND c.active = 1
    `, [couponCode]);
    
    return coupon;
  } catch (error) {
    console.error('Error getting coupon:', error);
    return null;
  }
}

module.exports = {
  validateCoupon,
  applyDiscount,
  recordCouponUsage,
  createPartnerCommission,
  getCouponByCode
};
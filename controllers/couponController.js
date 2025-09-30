const couponService = require('../services/coupon');

class CouponController {
  /**
   * Create a new coupon for a partner
   * POST /api/coupons
   */
  async createCoupon(req, res) {
    try {
      const { discountPercentage = 10 } = req.body;
      const user = req.user || req.session.user;

      // Verify user is authenticated
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify user is a partner
      if (user.role !== 'partner' && user.role !== 'admin') {
        return res.status(403).json({ error: 'Only partners can create coupons' });
      }

      // Validate discount percentage
      if (discountPercentage < 1 || discountPercentage > 100) {
        return res.status(400).json({ error: 'Discount percentage must be between 1 and 100' });
      }

      // Create the coupon
      const result = await couponService.createCoupon(user.id, discountPercentage);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        message: 'Coupon created successfully',
        coupon: result.coupon
      });
    } catch (error) {
      console.error('Error creating coupon:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get all coupons for the authenticated partner
   * GET /api/coupons
   */
  async getPartnerCoupons(req, res) {
    try {
      const user = req.user || req.session.user;

      // Verify user is authenticated
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify user is a partner
      if (user.role !== 'partner' && user.role !== 'admin') {
        return res.status(403).json({ error: 'Only partners can view coupons' });
      }

      const result = await couponService.getPartnerCoupons(user.id);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        success: true,
        coupons: result.coupons
      });
    } catch (error) {
      console.error('Error fetching partner coupons:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Validate a coupon code
   * POST /api/coupons/validate
   */
  async validateCoupon(req, res) {
    try {
      const { code } = req.body;
      const user = req.user || req.session.user;

      // Verify user is authenticated
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!code) {
        return res.status(400).json({ error: 'Coupon code is required' });
      }

      // Validate code format
      const formatValidation = couponService.validateCouponCodeFormat(code);
      if (!formatValidation.valid) {
        return res.status(400).json({ error: formatValidation.error });
      }

      // Check if customer can use this coupon
      const canUseResult = await couponService.canCustomerUseCoupon(user.id, code);
      
      if (!canUseResult.canUse) {
        return res.status(400).json({ 
          error: canUseResult.reason,
          canUse: false 
        });
      }

      res.json({
        success: true,
        canUse: true,
        coupon: canUseResult.coupon,
        discount: canUseResult.coupon.discount_percentage
      });
    } catch (error) {
      console.error('Error validating coupon:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get coupon usage statistics for a partner
   * GET /api/coupons/stats
   */
  async getCouponStats(req, res) {
    try {
      const user = req.user || req.session.user;

      // Verify user is authenticated
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify user is a partner
      if (user.role !== 'partner' && user.role !== 'admin') {
        return res.status(403).json({ error: 'Only partners can view coupon statistics' });
      }

      const result = await couponService.getCouponUsageStats(user.id);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        success: true,
        stats: result.stats
      });
    } catch (error) {
      console.error('Error fetching coupon stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get coupon by code (public endpoint for verification)
   * GET /api/coupons/:code
   */
  async getCouponByCode(req, res) {
    try {
      const { code } = req.params;

      if (!code) {
        return res.status(400).json({ error: 'Coupon code is required' });
      }

      const result = await couponService.getCouponByCode(code);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      if (!result.coupon) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      // Return limited information for public access
      res.json({
        success: true,
        coupon: {
          code: result.coupon.code,
          discount_percentage: result.coupon.discount_percentage,
          active: result.coupon.active,
          partner_name: `${result.coupon.first_name} ${result.coupon.last_name}`
        }
      });
    } catch (error) {
      console.error('Error fetching coupon by code:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Admin endpoint to create coupon for any partner
   * POST /api/admin/coupons
   */
  async adminCreateCoupon(req, res) {
    try {
      const { partnerId, discountPercentage = 10 } = req.body;
      const user = req.user || req.session.user;

      // Verify user is authenticated admin
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      if (!partnerId) {
        return res.status(400).json({ error: 'Partner ID is required' });
      }

      // Validate discount percentage
      if (discountPercentage < 1 || discountPercentage > 100) {
        return res.status(400).json({ error: 'Discount percentage must be between 1 and 100' });
      }

      // Create the coupon
      const result = await couponService.createCoupon(partnerId, discountPercentage);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        message: 'Coupon created successfully',
        coupon: result.coupon
      });
    } catch (error) {
      console.error('Error creating coupon (admin):', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new CouponController();
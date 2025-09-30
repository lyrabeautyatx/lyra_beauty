const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { requireAuth, requirePartner, requireAdmin } = require('../auth/middleware/auth');

// Partner coupon routes
router.post('/coupons', requireAuth, requirePartner, couponController.createCoupon);
router.get('/coupons', requireAuth, requirePartner, couponController.getPartnerCoupons);
router.get('/coupons/stats', requireAuth, requirePartner, couponController.getCouponStats);

// Public coupon validation routes
router.post('/coupons/validate', requireAuth, couponController.validateCoupon);
router.get('/coupons/:code', couponController.getCouponByCode);

// Admin coupon routes
router.post('/admin/coupons', requireAuth, requireAdmin, couponController.adminCreateCoupon);

module.exports = router;
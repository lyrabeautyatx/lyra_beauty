const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../auth/middleware/auth');
const { 
  getCommission,
  getPartnerCommissions,
  updateCommissionStatus,
  getPartnerEarnings
} = require('../services/commission');
const { getDatabase } = require('../database');

/**
 * Commission Management Routes
 * Admin-only routes for managing partner commissions
 */

// Get all commissions (admin overview)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const db = getDatabase();
    
    const commissions = await db.all(`
      SELECT 
        pc.*,
        u.first_name as partner_first_name,
        u.last_name as partner_last_name,
        u.email as partner_email,
        customer.first_name as customer_first_name,
        customer.last_name as customer_last_name,
        s.name as service_name,
        a.date as appointment_date,
        a.time as appointment_time
      FROM partner_commissions pc
      JOIN users u ON pc.partner_id = u.id
      JOIN appointments a ON pc.appointment_id = a.id
      JOIN users customer ON a.user_id = customer.id
      JOIN services s ON a.service_id = s.id
      ORDER BY pc.created_at DESC
    `);
    
    // Format amounts for display
    const formattedCommissions = commissions.map(commission => ({
      ...commission,
      commission_amount_dollars: (commission.commission_amount / 100).toFixed(2),
      original_price_dollars: (commission.original_price / 100).toFixed(2)
    }));
    
    if (req.accepts('json') && !req.accepts('html')) {
      res.json({ commissions: formattedCommissions });
    } else {
      res.render('admin/commissions', {
        user: req.session.user,
        commissions: formattedCommissions
      });
    }
  } catch (error) {
    console.error('Error loading commissions:', error);
    res.status(500).json({ error: 'Failed to load commissions' });
  }
});

// Get commission details
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const commissionId = parseInt(req.params.id);
    const commission = await getCommission(commissionId);
    
    res.json({ commission });
  } catch (error) {
    console.error('Error loading commission:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: 'Commission not found' });
    } else {
      res.status(500).json({ error: 'Failed to load commission' });
    }
  }
});

// Update commission status
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const commissionId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!['pending', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "pending" or "paid"' });
    }
    
    await updateCommissionStatus(commissionId, status);
    
    res.json({ 
      success: true, 
      message: `Commission ${commissionId} status updated to ${status}` 
    });
  } catch (error) {
    console.error('Error updating commission status:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: 'Commission not found' });
    } else {
      res.status(500).json({ error: 'Failed to update commission status' });
    }
  }
});

// Get partner earnings summary
router.get('/partner/:partnerId/earnings', requireAdmin, async (req, res) => {
  try {
    const partnerId = parseInt(req.params.partnerId);
    
    const earnings = await getPartnerEarnings(partnerId);
    const commissions = await getPartnerCommissions(partnerId);
    
    res.json({ 
      earnings,
      commissions
    });
  } catch (error) {
    console.error('Error loading partner earnings:', error);
    res.status(500).json({ error: 'Failed to load partner earnings' });
  }
});

// Get commission statistics
router.get('/stats/overview', requireAdmin, async (req, res) => {
  try {
    const db = getDatabase();
    
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_commissions,
        SUM(commission_amount) as total_amount,
        SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END) as paid_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count
      FROM partner_commissions
    `);
    
    const formattedStats = {
      ...stats,
      total_amount_dollars: ((stats.total_amount || 0) / 100).toFixed(2),
      pending_amount_dollars: ((stats.pending_amount || 0) / 100).toFixed(2),
      paid_amount_dollars: ((stats.paid_amount || 0) / 100).toFixed(2)
    };
    
    res.json({ stats: formattedStats });
  } catch (error) {
    console.error('Error loading commission stats:', error);
    res.status(500).json({ error: 'Failed to load commission statistics' });
  }
});

// Bulk update commission statuses
router.post('/bulk-update', requireAdmin, async (req, res) => {
  try {
    const { commissionIds, status } = req.body;
    
    if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
      return res.status(400).json({ error: 'Commission IDs array is required' });
    }
    
    if (!['pending', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "pending" or "paid"' });
    }
    
    const results = [];
    for (const commissionId of commissionIds) {
      try {
        await updateCommissionStatus(parseInt(commissionId), status);
        results.push({ id: commissionId, success: true });
      } catch (error) {
        results.push({ id: commissionId, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    res.json({ 
      success: true,
      message: `Updated ${successCount} commission(s), ${failureCount} failed`,
      results
    });
  } catch (error) {
    console.error('Error bulk updating commissions:', error);
    res.status(500).json({ error: 'Failed to bulk update commissions' });
  }
});

module.exports = router;
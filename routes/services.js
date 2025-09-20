const express = require('express');
const router = express.Router();
const ServiceController = require('../controllers/serviceController');
const { requireAuth, requireAdmin } = require('../auth/middleware/auth');

const serviceController = new ServiceController();

/**
 * GET /api/services - Get all services (admin can see inactive, others only active)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.user || req.session.user;
    const includeInactive = user.role === 'admin';
    
    const result = await serviceController.getAllServices(includeInactive);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in GET /api/services:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/services/:id - Get service by ID
 */
router.get('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await serviceController.getServiceById(id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Error in GET /api/services/:id:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/services - Create new service (admin only)
 */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const serviceData = req.body;
    const result = await serviceController.createService(serviceData);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in POST /api/services:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PUT /api/services/:id - Update service (admin only)
 */
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const serviceData = req.body;
    const result = await serviceController.updateService(id, serviceData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in PUT /api/services/:id:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /api/services/:id - Delete service (admin only)
 */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await serviceController.deleteService(id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in DELETE /api/services/:id:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PATCH /api/services/:id/toggle - Toggle service active status (admin only)
 */
router.patch('/:id/toggle', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await serviceController.toggleServiceStatus(id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in PATCH /api/services/:id/toggle:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
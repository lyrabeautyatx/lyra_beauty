const express = require('express');
const router = express.Router();

// Placeholder webhook route for Square payment processing
router.post('/square', (req, res) => {
  console.log('Square webhook received:', req.body);
  res.status(200).json({ success: true });
});

module.exports = router;
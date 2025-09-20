const express = require('express');
const router = express.Router();

// Placeholder webhook routes - will be implemented in future issues
router.post('/square', (req, res) => {
  console.log('Square webhook received');
  res.status(200).json({ success: true });
});

module.exports = router;
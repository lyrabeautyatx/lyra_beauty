const express = require('express');
const router = express.Router();

// Minimal webhook routes for development
// TODO: Implement full webhook handling for Square payments

router.post('/square', (req, res) => {
  console.log('Square webhook received:', req.body);
  res.status(200).json({ success: true });
});

module.exports = router;
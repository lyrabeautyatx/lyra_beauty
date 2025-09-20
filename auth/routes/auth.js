const express = require('express');
const passport = require('../strategies/google');
const { generateJWT } = require('../middleware/auth');

// Load environment variables
require('dotenv').config();

const router = express.Router();

// Check if Google OAuth is configured
const isOAuthConfigured = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
console.log('OAuth configured:', isOAuthConfigured, 'Client ID:', process.env.GOOGLE_CLIENT_ID, 'Secret:', process.env.GOOGLE_CLIENT_SECRET ? '[present]' : '[missing]');

// Initiate Google OAuth
router.get('/google', (req, res, next) => {
  if (!isOAuthConfigured) {
    return res.status(503).json({ error: 'Google OAuth is not configured' });
  }
  
  // Check if we have the google strategy available
  try {
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res, next);
  } catch (error) {
    console.error('Google OAuth strategy error:', error);
    return res.status(503).json({ error: 'Google OAuth strategy not available' });
  }
});

// Google OAuth callback
router.get('/google/callback', (req, res, next) => {
  if (!isOAuthConfigured) {
    return res.redirect('/login?error=oauth_not_configured');
  }
  
  passport.authenticate('google', { failureRedirect: '/login' })(req, res, () => {
    // Generate JWT token
    const token = generateJWT(req.user);
    
    // Store user in session for compatibility with existing code
    req.session.user = req.user;
    
    // Redirect based on role
    if (req.user.role === 'admin') {
      res.redirect('/admin');
    } else if (req.user.role === 'partner') {
      // Future: redirect to partner dashboard
      res.redirect('/dashboard');
    } else {
      res.redirect('/dashboard');
    }
  });
});

// Get current user profile
router.get('/profile', (req, res) => {
  if (req.user) {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
        displayName: req.user.display_name,
        role: req.user.role
      }
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      res.redirect('/');
    });
  });
});

module.exports = router;